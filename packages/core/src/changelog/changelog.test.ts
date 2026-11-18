import { describe, expect, it } from 'vitest';
import { CHANGELOG, changelogDraft, changelogSince, type ChangelogEntry } from '.';

const entries: ChangelogEntry[] = [
  { date: '2026-11-09', pt: 'Antiga.', en: 'Old.' },
  { date: '2026-11-16', pt: 'Primeira novidade.', en: 'First news.' },
  { date: '2026-11-18', pt: 'Segunda novidade.', en: 'Second news.' },
  { date: '2026-11-24', pt: 'Futura.', en: 'Future.' },
];

describe('novidades da semana', () => {
  it('pega as entradas depois do último rascunho e até hoje', () => {
    const list = changelogSince(entries, '2026-11-10', '2026-11-23');
    expect(list.map((e) => e.pt)).toEqual(['Primeira novidade.', 'Segunda novidade.']);
    expect(changelogSince(entries, '2026-11-18', '2026-11-23')).toEqual([]);
  });

  it('monta o rascunho em texto simples, uma novidade por linha', () => {
    const list = changelogSince(entries, '2026-11-10', '2026-11-23');
    expect(changelogDraft(list)).toEqual({
      title: 'Novidades da semana',
      body: '• Primeira novidade.\n• Segunda novidade.',
    });
    expect(changelogDraft(list, 'en').body).toBe('• First news.\n• Second news.');
  });

  it('o arquivo de novidades é válido: datas reais em ordem e frases nos dois idiomas', () => {
    let previous = '';
    for (const e of CHANGELOG) {
      expect(e.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(new Date(`${e.date}T12:00:00Z`).getTime())).toBe(false);
      expect(e.date >= previous).toBe(true);
      previous = e.date;
      expect(e.pt.trim().length).toBeGreaterThan(10);
      expect(e.en.trim().length).toBeGreaterThan(10);
      expect(e.pt.length).toBeLessThanOrEqual(200);
    }
  });
});
