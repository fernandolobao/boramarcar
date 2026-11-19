CREATE TABLE "store_event_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"store_event_id" text NOT NULL,
	"user_id" text,
	"guest_name" text,
	"status" text NOT NULL,
	"checked_in_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_events" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text NOT NULL,
	"title" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"format" text NOT NULL,
	"kind" text NOT NULL,
	"capacity" integer,
	"code" text NOT NULL,
	"prizes" text,
	"rules" text,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "store_events_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "store_event_entries" ADD CONSTRAINT "store_event_entries_store_event_id_store_events_id_fk" FOREIGN KEY ("store_event_id") REFERENCES "public"."store_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_event_entries" ADD CONSTRAINT "store_event_entries_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_events" ADD CONSTRAINT "store_events_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_events" ADD CONSTRAINT "store_events_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "store_event_entries_event_idx" ON "store_event_entries" USING btree ("store_event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "store_event_entries_user_idx" ON "store_event_entries" USING btree ("store_event_id","user_id");--> statement-breakpoint
CREATE INDEX "store_events_store_idx" ON "store_events" USING btree ("store_id","starts_at");