ALTER TABLE "stores" ADD COLUMN "municipality_code" text;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "offers" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "stores" ADD CONSTRAINT "stores_municipality_code_municipalities_code_fk" FOREIGN KEY ("municipality_code") REFERENCES "public"."municipalities"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- lojas antigas (10.3): liga a cidade em texto ao município do IBGE pelo endereço da cidade (sem
-- acento, minúsculo, com hífen), só quando o nome existe numa UF só. O resto fica a confirmar pelo admin.
UPDATE "stores" AS s
SET "municipality_code" = m."code"
FROM "municipalities" AS m
WHERE s."municipality_code" IS NULL
  AND m."slug" = trim(BOTH '-' FROM regexp_replace(
    lower(translate(trim(s."city"),
      'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
      'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN')),
    '[^a-z0-9]+', '-', 'g'))
  AND (SELECT count(*) FROM "municipalities" AS x WHERE x."slug" = m."slug") = 1;
