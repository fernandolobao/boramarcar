import { describe, expect, it } from 'vitest';
import { bracketChecklist, estimateBracket, type BracketSignals } from './brackets';

const signals = (partial: Partial<BracketSignals> = {}): BracketSignals => ({
  gameChangers: [],
  massLandDenial: [],
  extraTurns: [],
  combos: [],
  ...partial,
});

const checklist = (
  partial: Partial<BracketSignals> = {},
  source: 'spellbook' | 'local' = 'spellbook',
) => bracketChecklist(estimateBracket(signals(partial)), source);

describe('bracketChecklist', () => {
  it('deck limpo: tudo livre, nada conta e cada item diz quanto leva ao próximo degrau', () => {
    const list = checklist();
    expect(list.minimum).toBe(2);
    expect(list.counted).toBe(0);
    expect(list.items.map((i) => i.status)).toEqual(['clear', 'clear', 'clear', 'clear', 'clear']);
    const gc = list.items[0]!;
    expect(gc.slots).toEqual([3, 3, 3, 4]);
    expect(gc.next).toEqual({ kind: 'add', amount: 1, bracket: 3 });
    expect(list.items[2]!.next).toEqual({ kind: 'add', amount: 3, bracket: 4 });
  });

  it('Game Changers contam e mostram o que falta para o 4 ou o que tirar para voltar', () => {
    const two = checklist({ gameChangers: ['Rhystic Study', 'Smothering Tithe'] }).items[0]!;
    expect(two).toMatchObject({ status: 'counted', count: 2, implies: 3, decisive: true });
    expect(two.next).toEqual({ kind: 'add', amount: 2, bracket: 4 });

    const five = checklist({ gameChangers: ['A', 'B', 'C', 'D', 'E'] }).items[0]!;
    expect(five.implies).toBe(4);
    expect(five.slots).toEqual([3, 3, 3, 4, 4]);
    expect(five.next).toEqual({ kind: 'remove', amount: 2, bracket: 3 });
  });

  it('poucos turnos extras contam mas não sobem o bracket; combos viram uma linha cada', () => {
    const list = checklist({
      extraTurns: ['Time Warp'],
      combos: [
        {
          id: '1',
          cards: ['A', 'B'],
          produces: ['Infinite mana'],
          twoCard: true,
          arguablyTwoCard: false,
        },
      ],
    });
    expect(list.minimum).toBe(4);
    expect(list.counted).toBe(2);
    expect(list.items[2]).toMatchObject({ status: 'counted', implies: 2, decisive: false });
    expect(list.items[3]).toMatchObject({
      entries: [{ cards: ['A', 'B'], produces: ['Infinite mana'] }],
      implies: 4,
      decisive: true,
    });
    expect(list.items[3]!.next).toEqual({ kind: 'remove', amount: 1, bracket: 2 });
  });

  it('sem o Spellbook, só os Game Changers são conferidos', () => {
    const list = checklist({ gameChangers: ['Rhystic Study'] }, 'local');
    expect(list.items.map((i) => i.status)).toEqual([
      'counted',
      'unchecked',
      'unchecked',
      'unchecked',
      'unchecked',
    ]);
    expect(list.items[1]!.next).toBeNull();
  });
});
