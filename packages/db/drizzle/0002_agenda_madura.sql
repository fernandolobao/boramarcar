CREATE TABLE "availability_rule_exceptions" (
	"rule_id" text NOT NULL,
	"date" text NOT NULL,
	CONSTRAINT "availability_rule_exceptions_rule_id_date_pk" PRIMARY KEY("rule_id","date")
);
--> statement-breakpoint
CREATE TABLE "availability_rule_locations" (
	"rule_id" text NOT NULL,
	"location_id" text NOT NULL,
	CONSTRAINT "availability_rule_locations_rule_id_location_id_pk" PRIMARY KEY("rule_id","location_id")
);
--> statement-breakpoint
CREATE TABLE "availability_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"user_id" text NOT NULL,
	"weekday" integer NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"time_zone" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "availability_rule_exceptions" ADD CONSTRAINT "availability_rule_exceptions_rule_id_availability_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."availability_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_rule_locations" ADD CONSTRAINT "availability_rule_locations_rule_id_availability_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."availability_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_rule_locations" ADD CONSTRAINT "availability_rule_locations_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_rules" ADD CONSTRAINT "availability_rules_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_rules" ADD CONSTRAINT "availability_rules_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "availability_rules_group_idx" ON "availability_rules" USING btree ("group_id");