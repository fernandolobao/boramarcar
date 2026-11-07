ALTER TABLE "locations" ADD COLUMN "details" text;--> statement-breakpoint
ALTER TABLE "locations" ADD COLUMN "lat" double precision;--> statement-breakpoint
ALTER TABLE "locations" ADD COLUMN "lng" double precision;--> statement-breakpoint
ALTER TABLE "locations" ADD COLUMN "created_by" text;--> statement-breakpoint
ALTER TABLE "locations" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;