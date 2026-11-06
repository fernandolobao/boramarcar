DROP INDEX "deck_cards_unique_idx";--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "set_code" text;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "set_name" text;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "collector_number" text;--> statement-breakpoint
CREATE UNIQUE INDEX "deck_cards_unique_idx" ON "deck_cards" USING btree ("deck_id","board","card_name",coalesce("scryfall_id", ''),"is_proxy");