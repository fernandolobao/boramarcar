ALTER TABLE "tournaments" ALTER COLUMN "group_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "tournaments" ALTER COLUMN "event_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "tournament_entrants" ADD COLUMN "guest_name" text;--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "store_event_id" text;--> statement-breakpoint
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_store_event_id_store_events_id_fk" FOREIGN KEY ("store_event_id") REFERENCES "public"."store_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_store_event_id_unique" UNIQUE("store_event_id");