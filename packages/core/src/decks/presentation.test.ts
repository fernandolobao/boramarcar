import { describe, expect, it } from 'vitest';
import { cardTypeGroup, deckPrice, groupEntriesByType } from './presentation';

describe('cardTypeGroup', () => {
  it.each([
    ['Legendary Creature — Elemental', 'creature'],
    ['Artifact Creature — Golem', 'creature'],
    ['Legendary Planeswalker — Jace', 'planeswalker'],
    ['Battle — Siege', 'battle'],
    ['Instant', 'instant'],
    ['Tribal Sorcery — Elf', 'sorcery'],
    ['Artifact — Equipment', 'artifact'],
    ['Enchantment — Aura', 'enchantment'],
    ['Artifact Land', 'land'],
    ['Basic Land — Forest', 'land'],
    ['Sorcery // Land', 'sorcery'],
    ['', 'other'],
    [null, 'other'],
  ])('%s → %s', (typeLine, group) => {
    expect(cardTypeGroup(typeLine)).toBe(group);
  });
});

describe('groupEntriesByType', () => {
  it('agrupa em ordem fixa, soma quantidades e ordena por custo e nome', () => {
    const entry = (name: string, typeLine: string | null, cmc = 0, quantity = 1) => ({
      name,
      quantity,
      isProxy: false,
      card: typeLine === null ? null : { typeLine, cmc },
    });
    const groups = groupEntriesByType([
      entry('Forest', 'Basic Land — Forest', 0, 30),
      entry('Cultivate', 'Sorcery', 3),
      entry('Elvish Mystic', 'Creature — Elf', 1),
      entry('Avenger', 'Creature — Elf', 1),
      entry('Desconhecida', null),
    ]);
    expect(groups.map((g) => [g.group, g.count, g.entries.map((e) => e.name)])).toEqual([
      ['creature', 2, ['Avenger', 'Elvish Mystic']],
      ['sorcery', 1, ['Cultivate']],
      ['land', 30, ['Forest']],
      ['other', 1, ['Desconhecida']],
    ]);
  });
});

describe('deckPrice', () => {
  it('soma preços, separa proxies e conta cartas sem preço', () => {
    expect(
      deckPrice([
        { quantity: 1, isProxy: false, card: { typeLine: '', cmc: 0, priceUsd: '1.50' } },
        { quantity: 2, isProxy: true, card: { typeLine: '', cmc: 0, priceUsd: '10' } },
        { quantity: 3, isProxy: false, card: { typeLine: '', cmc: 0, priceUsd: null } },
        { quantity: 1, isProxy: false, card: null },
      ]),
    ).toEqual({ owned: 1.5, proxies: 20, total: 21.5, missing: 4 });
  });
});
