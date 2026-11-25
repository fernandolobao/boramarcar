import { DomainError, slugify } from '@boramarcar/core';
import { outsideDeck } from '@boramarcar/core';
import { getDeck } from '@boramarcar/db';
import { z } from 'zod';
import { authed, parseQuery } from '@/server/http';
import { rateLimit } from '@/server/limits';
import { buildProxySheet } from '@/server/proxy-sheet';

// Baixar as imagens pode levar alguns segundos em decks grandes.
export const maxDuration = 60;

const schema = z.object({
  which: z.enum(['proxies', 'all']).default('proxies'),
  page: z.enum(['a4', 'letter']).default('a4'),
});

/** PDF para imprimir os proxies (3.10): cartas em tamanho real, 3×3 por página. */
export const GET = authed<{ deckId: string }>(async ({ req, db, user, params }) => {
  const { which, page } = parseQuery(req, schema);
  // Aberto a quem vê o deck; o limite evita gerar PDFs (e baixar imagens) sem parar.
  await rateLimit(db, user.id, 'proxies');
  const deck = await getDeck(db, { deckId: params.deckId, viewerId: user.id });
  const { pdf, cards, missingImages } = await buildProxySheet({
    deckName: deck.name,
    lines: deck.lines.filter((l) => !outsideDeck(l.board)),
    which,
    page,
  });
  if (!cards) {
    throw new DomainError(
      'invalid_input',
      which === 'proxies' ? 'Este deck não tem cartas marcadas como proxy' : 'O deck está vazio',
    );
  }
  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="proxies-${slugify(deck.name, 'deck')}.pdf"`,
      'Cache-Control': 'private, no-store',
      // Diagnóstico: cartas que saíram sem imagem (só com o nome).
      'X-Missing-Images': String(missingImages),
    },
  });
});
