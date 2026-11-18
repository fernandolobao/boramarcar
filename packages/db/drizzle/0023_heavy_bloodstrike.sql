CREATE TABLE "group_podiums" (
	"group_id" text PRIMARY KEY NOT NULL,
	"user_ids" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "group_podiums" ADD CONSTRAINT "group_podiums_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;