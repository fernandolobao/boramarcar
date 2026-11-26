CREATE TABLE "activity_log" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"group_id" text,
	"kind" text NOT NULL,
	"target_id" text DEFAULT '' NOT NULL,
	"label" text,
	"count" integer DEFAULT 1 NOT NULL,
	"bucket" timestamp with time zone NOT NULL,
	"first_at" timestamp with time zone NOT NULL,
	"last_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "activity_log_key" ON "activity_log" USING btree ("user_id","kind","target_id","bucket");--> statement-breakpoint
CREATE INDEX "activity_log_last_at_idx" ON "activity_log" USING btree ("last_at");--> statement-breakpoint
CREATE INDEX "activity_log_group_idx" ON "activity_log" USING btree ("group_id");