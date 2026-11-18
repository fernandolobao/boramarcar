CREATE TABLE "tournament_entrant_members" (
	"entrant_id" text NOT NULL,
	"tournament_id" text NOT NULL,
	"user_id" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "tournament_entrant_members_entrant_id_user_id_pk" PRIMARY KEY("entrant_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "tournament_entrants" (
	"id" text PRIMARY KEY NOT NULL,
	"tournament_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournament_events" (
	"id" text PRIMARY KEY NOT NULL,
	"tournament_id" text NOT NULL,
	"kind" text NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournament_rounds" (
	"id" text PRIMARY KEY NOT NULL,
	"tournament_id" text NOT NULL,
	"number" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournament_tables" (
	"id" text PRIMARY KEY NOT NULL,
	"round_id" text NOT NULL,
	"tournament_id" text NOT NULL,
	"number" integer NOT NULL,
	"entrant_ids" jsonb NOT NULL,
	"game_wins" jsonb,
	"game_draws" integer DEFAULT 0 NOT NULL,
	"game_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"reported_by" text,
	"reported_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "tournaments" (
	"id" text PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"event_id" text NOT NULL,
	"name" text NOT NULL,
	"format" text NOT NULL,
	"table_kind" text NOT NULL,
	"entrant_size" integer DEFAULT 1 NOT NULL,
	"best_of" integer DEFAULT 1 NOT NULL,
	"points_win" integer DEFAULT 3 NOT NULL,
	"points_draw" integer DEFAULT 1 NOT NULL,
	"points_loss" integer DEFAULT 0 NOT NULL,
	"rounds" integer,
	"counts_in_ranking" boolean DEFAULT true NOT NULL,
	"status" text DEFAULT 'registration' NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tournament_entrant_members" ADD CONSTRAINT "tournament_entrant_members_entrant_id_tournament_entrants_id_fk" FOREIGN KEY ("entrant_id") REFERENCES "public"."tournament_entrants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_entrant_members" ADD CONSTRAINT "tournament_entrant_members_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_entrant_members" ADD CONSTRAINT "tournament_entrant_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_entrants" ADD CONSTRAINT "tournament_entrants_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_events" ADD CONSTRAINT "tournament_events_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_rounds" ADD CONSTRAINT "tournament_rounds_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_tables" ADD CONSTRAINT "tournament_tables_round_id_tournament_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."tournament_rounds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_tables" ADD CONSTRAINT "tournament_tables_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_tables" ADD CONSTRAINT "tournament_tables_reported_by_user_id_fk" FOREIGN KEY ("reported_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tournament_entrant_members_unique_idx" ON "tournament_entrant_members" USING btree ("tournament_id","user_id");--> statement-breakpoint
CREATE INDEX "tournament_entrants_tournament_idx" ON "tournament_entrants" USING btree ("tournament_id");--> statement-breakpoint
CREATE INDEX "tournament_events_tournament_idx" ON "tournament_events" USING btree ("tournament_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "tournament_rounds_number_idx" ON "tournament_rounds" USING btree ("tournament_id","number");--> statement-breakpoint
CREATE INDEX "tournament_tables_round_idx" ON "tournament_tables" USING btree ("round_id");--> statement-breakpoint
CREATE INDEX "tournaments_group_idx" ON "tournaments" USING btree ("group_id","created_at");