CREATE TABLE "cost_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"service" text NOT NULL,
	"period" text DEFAULT 'month' NOT NULL,
	"month" text NOT NULL,
	"currency" text DEFAULT 'BRL' NOT NULL,
	"amount_cents" integer NOT NULL,
	"usd_rate" double precision,
	"brl_cents" integer NOT NULL,
	"note" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cost_entries" ADD CONSTRAINT "cost_entries_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cost_entries_month_idx" ON "cost_entries" USING btree ("month");