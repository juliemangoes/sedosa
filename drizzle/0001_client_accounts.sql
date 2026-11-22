CREATE TABLE "client_login_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"code_hash" text NOT NULL,
	"link_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "last_login_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "client_login_codes_email" ON "client_login_codes" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "client_login_codes_link" ON "client_login_codes" USING btree ("link_hash");