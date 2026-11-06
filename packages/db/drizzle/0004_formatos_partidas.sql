ALTER TABLE "game_players" ADD COLUMN "team" integer;--> statement-breakpoint
ALTER TABLE "game_players" ADD COLUMN "eliminated_order" integer;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "format" text DEFAULT 'commander' NOT NULL;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "first_player_id" text;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "winning_turn" integer;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "duration_minutes" integer;--> statement-breakpoint
ALTER TABLE "groups" ADD COLUMN "table_size" integer DEFAULT 4 NOT NULL;--> statement-breakpoint
ALTER TABLE "groups" ADD COLUMN "min_duration_minutes" integer DEFAULT 120 NOT NULL;--> statement-breakpoint
ALTER TABLE "groups" ADD COLUMN "points_win" integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE "groups" ADD COLUMN "points_draw" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "groups" ADD COLUMN "points_loss" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "groups" ADD COLUMN "default_format" text DEFAULT 'commander' NOT NULL;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_first_player_id_user_id_fk" FOREIGN KEY ("first_player_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;