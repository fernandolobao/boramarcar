CREATE TABLE "store_followers" (
	"store_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_notices" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text NOT NULL,
	"text" text NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "store_followers" ADD CONSTRAINT "store_followers_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_followers" ADD CONSTRAINT "store_followers_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_notices" ADD CONSTRAINT "store_notices_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_notices" ADD CONSTRAINT "store_notices_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "store_followers_unique_idx" ON "store_followers" USING btree ("store_id","user_id");--> statement-breakpoint
CREATE INDEX "store_followers_user_idx" ON "store_followers" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "store_notices_store_idx" ON "store_notices" USING btree ("store_id","created_at");