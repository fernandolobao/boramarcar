ALTER TABLE "tournament_rounds" ADD COLUMN "stage" text DEFAULT 'swiss' NOT NULL;--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "top_cut" integer;