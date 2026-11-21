import { NextResponse } from "next/server";
import { BookingError } from "./booking";

const STATUS: Record<BookingError["code"], number> = {
  not_found: 404,
  invalid: 422,
  slot_unavailable: 409,
  policy: 403,
  state: 409,
};

export function errorResponse(e: unknown) {
  if (e instanceof BookingError) {
    return NextResponse.json({ error: e.message, code: e.code, fieldErrors: e.fieldErrors }, { status: STATUS[e.code] });
  }
  console.error(e);
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}
