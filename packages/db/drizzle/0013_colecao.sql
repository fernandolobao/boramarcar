CREATE TABLE "collection_cards" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"card_name" text NOT NULL,
	"scryfall_id" text,
	"quantity" integer DEFAULT 1 NOT NULL,
	"is_foil" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "artist" text;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "released_at" text;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "rarity" text;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "price_usd_foil" text;--> statement-breakpoint
ALTER TABLE "collection_cards" ADD CONSTRAINT "collection_cards_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_cards" ADD CONSTRAINT "collection_cards_scryfall_id_cards_scryfall_id_fk" FOREIGN KEY ("scryfall_id") REFERENCES "public"."cards"("scryfall_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "collection_cards_user_idx" ON "collection_cards" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "collection_cards_unique_idx" ON "collection_cards" USING btree ("user_id","card_name",coalesce("scryfall_id", ''),"is_foil");--> statement-breakpoint
-- Coleção inicial: as cartas dos decks de cada pessoa, sem proxies, somando entre decks
-- (cada deck montado tem as próprias cópias). Foil e impressão como estão nos decks.
INSERT INTO "collection_cards" ("id", "user_id", "card_name", "scryfall_id", "quantity", "is_foil")
SELECT gen_random_uuid()::text, d."owner_id", dc."card_name", dc."scryfall_id", sum(dc."quantity")::integer, dc."is_foil"
FROM "deck_cards" dc
JOIN "decks" d ON d."id" = dc."deck_id"
WHERE dc."is_proxy" = false AND dc."board" <> 'maybeboard'
GROUP BY d."owner_id", dc."card_name", dc."scryfall_id", dc."is_foil"
ON CONFLICT DO NOTHING;
