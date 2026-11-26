import { DomainError } from '@boramarcar/core';
import { z } from 'zod';
import { lookupScannedCard } from '@/server/card-scan';
import { canScanCards } from '@/server/features';
import { authed, parseJson } from '@/server/http';
import { rateLimit } from '@/server/limits';

/** Só o texto lido no aparelho (a imagem nunca sai do celular). */
const schema = z.object({
  text: z.string().max(4000),
  lines: z.array(z.object({ text: z.string().max(300), top: z.number().min(0).max(1) })).max(120),
  /** Até onde procurar o nome: a faixa de cima da moldura (~0,22) ou a foto inteira (1). */
  nameZone: z.number().min(0.05).max(1),
});

/**
 * Leitura de carta pela câmera: acha a carta pelo texto lido. Atrás da flag `card-scanner`
 * (grupos liberados); sem ela, 404.
 */
export const POST = authed(async ({ req, db, user }) => {
  if (!(await canScanCards(user))) throw new DomainError('not_found', 'Recurso indisponível');
  const body = await parseJson(req, schema);
  await rateLimit(db, user.id, 'scan');
  const { match, names } = await lookupScannedCard(db, body);
  return {
    names,
    match: match
      ? {
          how: match.how,
          printedName: match.printedName,
          card: {
            scryfallId: match.card.scryfallId,
            name: match.card.name,
            typeLine: match.card.typeLine,
            imageUri: match.card.imageUri ?? null,
            setCode: match.card.setCode ?? null,
            setName: match.card.setName ?? null,
            collectorNumber: match.card.collectorNumber ?? null,
          },
        }
      : null,
  };
});
