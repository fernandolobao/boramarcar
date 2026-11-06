ALTER TABLE "cards" ADD COLUMN "produced_mana" text[];--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "game_changer" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "edhrec_rank" integer;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "roles" text[];--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "roles_checked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "decks" ADD COLUMN "bracket_signals" jsonb;--> statement-breakpoint
ALTER TABLE "decks" ADD COLUMN "bracket_hash" text;