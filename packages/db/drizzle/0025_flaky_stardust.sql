CREATE TABLE "admin_access_log" (
	"id" text PRIMARY KEY NOT NULL,
	"admin_id" text,
	"target_user_id" text NOT NULL,
	"resource" text NOT NULL,
	"resource_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_access_log" ADD CONSTRAINT "admin_access_log_admin_id_user_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_access_log" ADD CONSTRAINT "admin_access_log_target_user_id_user_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_access_log_target_idx" ON "admin_access_log" USING btree ("target_user_id","created_at");