CREATE TABLE "media" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"mime" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"bytes" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scheduled_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"appointment_id" uuid NOT NULL,
	"channel" text NOT NULL,
	"origin" text NOT NULL,
	"offset_minutes" integer,
	"send_at" timestamp with time zone NOT NULL,
	"template" text NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"sent_via" text,
	"sent_at" timestamp with time zone,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"date" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"category" text NOT NULL,
	"method" text DEFAULT 'other' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"recurring_monthly" boolean DEFAULT false NOT NULL,
	"recurring_source_id" integer,
	"receipt_media_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "description" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "image_id" integer;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "whatsapp_opt_in" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "scheduled_messages" ADD CONSTRAINT "scheduled_messages_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_receipt_media_id_media_id_fk" FOREIGN KEY ("receipt_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "scheduled_messages_due" ON "scheduled_messages" USING btree ("status","send_at");--> statement-breakpoint
CREATE INDEX "scheduled_messages_appt" ON "scheduled_messages" USING btree ("appointment_id");--> statement-breakpoint
CREATE INDEX "transactions_date" ON "transactions" USING btree ("date");--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;