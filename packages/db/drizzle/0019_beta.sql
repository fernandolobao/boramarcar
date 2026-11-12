CREATE TABLE "beta_groups" (
	"group_id" text PRIMARY KEY NOT NULL,
	"welcomed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "beta_program" (
	"id" text PRIMARY KEY DEFAULT 'beta' NOT NULL,
	"starts_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "beta_groups" ADD CONSTRAINT "beta_groups_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;