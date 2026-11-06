import { describe, expect, it, vi } from 'vitest';
import { fetchUsdBrlRate, ligaMagicCardUrl, parsePtax, ptaxUrl, usdToBrl } from '.';

describe('cotação do dólar (PTAX)', () => {
  it('monta a URL dos últimos 10 dias, mais recente primeiro', () => {
    const url = ptaxUrl(new Date('2026-11-06T15:00:00Z'));
    expect(url).toContain("@dataInicial='10-27-2026'");
    expect(url).toContain("@dataFinalCotacao='11-06-2026'");
    expect(url).toContain('$orderby=dataHoraCotacao%20desc&$top=1');
  });

  it('lê a cotação de venda e a data', async () => {
    const payload = {
      '@odata.context': 'x',
      value: [
        { cotacaoCompra: 5.4, cotacaoVenda: 5.41, dataHoraCotacao: '2026-11-05 13:04:28.123' },
      ],
    };
    expect(parsePtax(payload)).toEqual({ rate: 5.41, date: '2026-11-05', source: 'ptax' });
    const fetchMock = vi.fn(async () => Response.json(payload));
    expect((await fetchUsdBrlRate(fetchMock)).rate).toBe(5.41);
    expect(() => parsePtax({ value: [] })).toThrow(/indisponível/);
    await expect(
      fetchUsdBrlRate(async () => new Response('x', { status: 500 })),
    ).rejects.toMatchObject({ code: 'upstream_error' });
  });

  it('converte e gera o link da LigaMagic', () => {
    expect(usdToBrl(833.67, 5.41)).toBe(4510.15);
    expect(ligaMagicCardUrl("Kodama's Reach")).toBe(
      "https://www.ligamagic.com.br/?view=cards/card&card=Kodama's%20Reach",
    );
  });
});
