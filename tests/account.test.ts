import { describe, it, expect, beforeAll } from "vitest";
import { eq } from "drizzle-orm";
import { openDb, runMigrations, setDb, type DB } from "@/db";
import { seedIfEmpty } from "@/db/seed";
import * as t from "@/db/schema";
import { AccountError, MAX_ATTEMPTS, MAX_CODES_PER_HOUR, requestLoginCode, savedAnswers, verifyLoginCode, verifyLoginLink } from "@/lib/account";
import { signClientToken, verifyClientToken } from "@/lib/client-session";
import { verifySessionToken } from "@/lib/auth";
import { SignJWT } from "jose";
import { sessionSecret } from "@/lib/session-secret";

let db: DB;

beforeAll(async () => {
  const o = await openDb("memory://");
  db = o.db;
  await runMigrations(db, o.kind);
  await seedIfEmpty(db);
  setDb(db);
});

describe("passwordless sign-in", () => {
  it("signs in with the emailed code and creates the account", async () => {
    const { code } = await requestLoginCode(db, "  New.Client@Example.com ");
    expect(code).toMatch(/^\d{6}$/);
    const client = await verifyLoginCode(db, "new.client@example.com", code);
    expect(client.email).toBe("new.client@example.com");
    expect(client.lastLoginAt).not.toBeNull();
    // Codes are single use.
    await expect(verifyLoginCode(db, "new.client@example.com", code)).rejects.toMatchObject({ code: "invalid_code" });
    // Only hashes are stored.
    const rows = await db.select().from(t.clientLoginCodes).where(eq(t.clientLoginCodes.email, "new.client@example.com"));
    expect(rows.every((r) => !r.codeHash.includes(code))).toBe(true);
  });

  it("links to an existing client record instead of duplicating it", async () => {
    await db.insert(t.clients).values({ firstName: "Ava", lastName: "Stone", email: "ava@example.com", phone: "+14045550100" });
    const { code } = await requestLoginCode(db, "ava@example.com");
    const client = await verifyLoginCode(db, "AVA@example.com", code);
    expect(client.firstName).toBe("Ava");
    const all = await db.select().from(t.clients).where(eq(t.clients.email, "ava@example.com"));
    expect(all).toHaveLength(1);
  });

  it("locks a code after too many wrong guesses", async () => {
    const { code } = await requestLoginCode(db, "guesser@example.com");
    const wrong = code === "000000" ? "111111" : "000000";
    for (let i = 1; i < MAX_ATTEMPTS; i++) {
      await expect(verifyLoginCode(db, "guesser@example.com", wrong)).rejects.toMatchObject({ code: "invalid_code" });
    }
    await expect(verifyLoginCode(db, "guesser@example.com", wrong)).rejects.toMatchObject({ code: "too_many_attempts" });
    // Even the right code no longer works.
    await expect(verifyLoginCode(db, "guesser@example.com", code)).rejects.toMatchObject({ code: "too_many_attempts" });
  });

  it("expires codes and replaces older ones", async () => {
    const past = new Date(Date.now() - 11 * 60_000);
    const old = await requestLoginCode(db, "late@example.com", past);
    await expect(verifyLoginCode(db, "late@example.com", old.code)).rejects.toMatchObject({ code: "expired" });

    const first = await requestLoginCode(db, "twice@example.com");
    const second = await requestLoginCode(db, "twice@example.com");
    if (first.code !== second.code) {
      await expect(verifyLoginCode(db, "twice@example.com", first.code)).rejects.toBeInstanceOf(AccountError);
    }
    const ok = await verifyLoginCode(db, "twice@example.com", second.code);
    expect(ok.email).toBe("twice@example.com");
  });

  it("signs in with the one-click link, once", async () => {
    const { linkToken } = await requestLoginCode(db, "linker@example.com");
    const client = await verifyLoginLink(db, linkToken);
    expect(client.email).toBe("linker@example.com");
    await expect(verifyLoginLink(db, linkToken)).rejects.toMatchObject({ code: "invalid_link" });
    await expect(verifyLoginLink(db, "x".repeat(43))).rejects.toMatchObject({ code: "invalid_link" });
  });

  it("rate-limits code requests per email and rejects bad emails", async () => {
    for (let i = 0; i < MAX_CODES_PER_HOUR; i++) await requestLoginCode(db, "spam@example.com");
    await expect(requestLoginCode(db, "spam@example.com")).rejects.toMatchObject({ code: "rate_limited" });
    await expect(requestLoginCode(db, "not-an-email")).rejects.toMatchObject({ code: "invalid_email" });
  });
});

describe("sessions", () => {
  it("round-trips a client token and keeps it separate from the owner session", async () => {
    const token = await signClientToken(42);
    expect(await verifyClientToken(token)).toBe(42);
    expect(await verifySessionToken(token)).toBe(false); // can't open the dashboard
    const ownerToken = await new SignJWT({ role: "owner" }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("1h").sign(sessionSecret()!);
    expect(await verifyClientToken(ownerToken)).toBeNull(); // owner token isn't a client session
    expect(await verifyClientToken("garbage")).toBeNull();
  });
});

describe("saved answers", () => {
  it("returns the latest answers but never consent checkboxes", async () => {
    const [c] = await db.insert(t.clients).values({ firstName: "Mia", lastName: "R", email: "mia@example.com" }).returning();
    const [svc] = await db.select().from(t.services).limit(1);
    const [loc] = await db.select().from(t.locations).limit(1);
    const base = {
      clientId: c.id,
      serviceId: svc.id,
      locationId: loc.id,
      startsAt: new Date(),
      endsAt: new Date(),
      status: "completed" as const,
      priceCents: 100,
      snapshot: { serviceName: "", categoryName: "", servicePriceCents: 0, serviceDurationMin: 0, locationName: "", locationAddress: "", addons: [] },
    };
    await db.insert(t.appointments).values({
      ...base,
      token: "tok-old-000000000000000000",
      createdAt: new Date(Date.now() - 86_400_000),
      answers: [
        { formId: 1, formName: "F", fieldId: 10, label: "Allergic?", type: "yesno", value: "yes" },
        { formId: 1, formName: "F", fieldId: 11, label: "Skin", type: "checkboxlist", value: ["Dry"] },
      ],
    });
    await db.insert(t.appointments).values({
      ...base,
      token: "tok-new-000000000000000000",
      answers: [
        { formId: 1, formName: "F", fieldId: 10, label: "Allergic?", type: "yesno", value: "no" },
        { formId: 1, formName: "F", fieldId: 12, label: "I agree", type: "checkbox", value: true },
      ],
    });
    expect(await savedAnswers(db, c.id)).toEqual({ "10": "no", "11": ["Dry"] });
  });
});
