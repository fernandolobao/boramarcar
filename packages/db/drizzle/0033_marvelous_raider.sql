CREATE TABLE "municipalities" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"uf" text NOT NULL,
	"slug" text NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"capital" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "municipalities_uf_slug_idx" ON "municipalities" USING btree ("uf","slug");