/**
 * Teste de contrato: chama as APIs externas DE VERDADE para detectar mudanças ou bloqueios
 * que os testes com respostas simuladas não pegam. Roda semanalmente na CI (contract.yml),
 * fora dos PRs. Rode localmente com: pnpm --filter @boramarcar/core test:contract
 */
import { appendFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { isDomainError } from '../src/errors';
import { fetchArchidektDeck } from '../src/decks/importers/archidekt';
import { fetchMoxfieldDeck } from '../src/decks/importers/moxfield';
import { parseDeckUrl } from '../src/decks/importers/url';
import { fetchScryfallAutocomplete, fetchScryfallCollection } from '../src/decks/scryfall';
import { fetchUsdBrlRate } from '../src/currency';
import decks from './decks.json';

const summary = (line: string) => {
  console.warn(line);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${line}\n`);
};

describe('contrato com serviços externos', () => {
  it('Banco Central: PTAX do dólar responde com uma cotação plausível', async () => {
    const rate = await fetchUsdBrlRate(fetch);
    expect(rate.rate).toBeGreaterThan(1);
    expect(rate.rate).toBeLessThan(20);
    expect(rate.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    summary(`PTAX: R$ ${rate.rate} (${rate.date})`);
  });

  it('Scryfall: autocomplete sugere nomes', async () => {
    expect(await fetchScryfallAutocomplete('sol ri', { fetch })).toContain('Sol Ring');
  });

  it('Scryfall: /cards/collection devolve os dados que a análise usa', async () => {
    const result = await fetchScryfallCollection(
      [{ name: 'Sol Ring' }, { name: 'Command Tower' }, { name: 'Carta Que Não Existe 123' }],
      {
        fetch,
        delayMs: 0,
      },
    );
    const solRing = result.cards.find((c) => c.name === 'Sol Ring');
    expect(solRing).toMatchObject({ cmc: 1, typeLine: 'Artifact' });
    expect(solRing?.oracleText).toMatch(/Add \{C\}\{C\}/);
    expect(result.cards.find((c) => c.name === 'Command Tower')?.typeLine).toMatch(/Land/);
    expect(result.notFound).toEqual(['Carta Que Não Existe 123']);
    summary('✅ Scryfall OK');
  });

  it('Archidekt: deck público é lido e tem comandante', async () => {
    const info = parseDeckUrl(decks.archidekt);
    expect(info?.source).toBe('archidekt');
    const deck = await fetchArchidektDeck(info!.id, fetch);
    const total = deck.entries
      .filter((e) => e.board !== 'maybeboard' && e.board !== 'sideboard')
      .reduce((sum, e) => sum + e.quantity, 0);
    expect(total).toBeGreaterThanOrEqual(60);
    expect(deck.entries.some((e) => e.board === 'commander')).toBe(true);
    expect(deck.entries.every((e) => e.name.length > 0)).toBe(true);
    summary(`✅ Archidekt OK — "${deck.name}" (${total} cartas)`);
  });

  it('Moxfield: lê o deck ou confirma o bloqueio conhecido (403)', async () => {
    const info = parseDeckUrl(decks.moxfield);
    expect(info?.source).toBe('moxfield');
    try {
      const deck = await fetchMoxfieldDeck(info!.id, fetch, process.env.MOXFIELD_USER_AGENT);
      expect(deck.entries.some((e) => e.board === 'commander')).toBe(true);
      summary(`✅ Moxfield OK — "${deck.name}" (a API respondeu; a importação por link funciona)`);
    } catch (error) {
      // Bloqueio esperado: a interface já oferece a importação por texto.
      const details = isDomainError(error)
        ? (error.details as { status?: number | null } | undefined)
        : undefined;
      if (isDomainError(error) && error.code === 'upstream_error' && details?.status === 403) {
        summary(
          '⚠️ Moxfield bloqueou (403), como esperado sem User-Agent autorizado — plano B (texto) segue valendo',
        );
        return;
      }
      throw error;
    }
  });
});
