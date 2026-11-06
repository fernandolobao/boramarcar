import { z } from 'zod';
import { DomainError } from '../errors';
import type { FetchLike } from '../decks/types';

/** API pública do Banco Central (PTAX), sem chave. */
export const PTAX_API = 'https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata';

const mmddyyyy = (d: Date) =>
  `${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}-${d.getUTCFullYear()}`;

/** URL da cotação mais recente nos últimos 10 dias (fins de semana e feriados não têm PTAX). */
export function ptaxUrl(now: Date) {
  const from = new Date(now.getTime() - 10 * 24 * 3600_000);
  const params = [
    `@dataInicial='${mmddyyyy(from)}'`,
    `@dataFinalCotacao='${mmddyyyy(now)}'`,
    '$format=json',
    '$orderby=dataHoraCotacao%20desc',
    '$top=1',
  ].join('&');
  return `${PTAX_API}/CotacaoDolarPeriodo(dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)?${params}`;
}

const ptaxSchema = z.object({
  value: z.array(
    z.object({
      cotacaoVenda: z.number().positive(),
      dataHoraCotacao: z.string(),
    }),
  ),
});

export interface ExchangeRate {
  /** Reais por dólar (PTAX de venda). */
  rate: number;
  /** Data da cotação, "AAAA-MM-DD". */
  date: string;
  source: 'ptax';
}

export function parsePtax(payload: unknown): ExchangeRate {
  const parsed = ptaxSchema.safeParse(payload);
  const latest = parsed.success ? parsed.data.value[0] : undefined;
  if (!latest) throw new DomainError('upstream_error', 'Cotação do dólar indisponível');
  return { rate: latest.cotacaoVenda, date: latest.dataHoraCotacao.slice(0, 10), source: 'ptax' };
}

/** Cotação do dólar (PTAX de venda) mais recente. */
export async function fetchUsdBrlRate(fetchFn: FetchLike, now = new Date()): Promise<ExchangeRate> {
  const response = await fetchFn(ptaxUrl(now), { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new DomainError('upstream_error', `BCB respondeu ${response.status}`);
  return parsePtax(await response.json());
}

/** Converte e arredonda para centavos. */
export const usdToBrl = (usd: number, rate: number) => Math.round(usd * rate * 100) / 100;

/** Link para a carta na LigaMagic (preços em reais nas lojas brasileiras). */
export const ligaMagicCardUrl = (name: string) =>
  `https://www.ligamagic.com.br/?view=cards/card&card=${encodeURIComponent(name)}`;
