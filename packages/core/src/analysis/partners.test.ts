import { describe, expect, it } from 'vitest';
import { makeCard } from '../test/fixtures';
import { analyzeDeck, canPairCommanders, pairingAbilities } from './index';

const legend = (name: string, oracleText: string, typeLine = 'Legendary Creature — Human') =>
  makeCard({ name, oracleText, typeLine, colorIdentity: [] });

const michelangelo = legend(
  'Michelangelo, the Heart',
  'Partner—Character select (You can have two commanders if both have this ability.)\nWhenever you attack, put a +1/+1 counter on target creature.',
  'Legendary Creature — Mutant Ninja Turtle',
);
const leonardo = legend(
  'Leonardo, the Balance',
  'Partner—Character select (You can have two commanders if both have this ability.)',
  'Legendary Creature — Mutant Ninja Turtle',
);
const survivor = legend(
  'Survivor',
  'Partner—Survivors (You can have two commanders if both have this ability.)',
);
const thrasios = legend(
  'Thrasios, Triton Hero',
  '{4}: Scry 1, then reveal the top card.\nPartner (You can have two commanders if both have partner.)',
);
const tymna = legend(
  'Tymna the Weaver',
  'Lifelink\nPartner (You can have two commanders if both have partner.)',
);
const pir = legend(
  'Pir, Imaginative Rascal',
  'Partner with Toothy, Imaginary Friend (When this creature enters, target player may put Toothy into their hand from their library, then shuffle.)',
);
const toothy = legend(
  'Toothy, Imaginary Friend',
  'Partner with Pir, Imaginative Rascal (When this creature enters, ...)',
);
const wilson = legend(
  'Wilson, Refined Grizzly',
  'Choose a Background (You can have a Background as a second commander.)',
);
const background = legend(
  'Candlekeep Sage',
  'Commander creatures you own have "..."',
  'Legendary Enchantment — Background',
);
const companion = legend(
  'Rose Tyler',
  "Doctor's companion (You can have two commanders if the other is the Doctor.)",
);
const doctor = legend('The Tenth Doctor', 'Allons-y!', 'Legendary Creature — Time Lord Doctor');
const plain = legend('Omnath, Locus of Mana', 'Green mana doesn’t empty from your mana pool.');

describe('dois comandantes', () => {
  it('lê as habilidades de parceria', () => {
    expect(pairingAbilities(michelangelo).group).toBe('character select');
    expect(pairingAbilities(thrasios).partner).toBe(true);
    expect(pairingAbilities(pir).partnerWith).toBe('toothy, imaginary friend');
  });

  it.each([
    ['Partner—Character select', michelangelo, leonardo, true],
    ['grupos diferentes', michelangelo, survivor, false],
    ['Partner', thrasios, tymna, true],
    ['Partner with (um nomeia o outro)', pir, toothy, true],
    ['Partner with × Partner', pir, thrasios, false],
    ['Choose a Background', wilson, background, true],
    ["Doctor's companion", companion, doctor, true],
    ['sem habilidade', plain, thrasios, false],
  ])('%s', (_label, a, b, ok) => {
    expect(canPairCommanders(a, b)).toBe(ok);
    expect(canPairCommanders(b, a)).toBe(ok);
  });

  it('a validação de Commander aponta pares inválidos', () => {
    const deck = (a: typeof plain, b: typeof plain) =>
      analyzeDeck([
        { name: a.name, quantity: 1, board: 'commander', card: a },
        { name: b.name, quantity: 1, board: 'commander', card: b },
      ]).validation.filter((i) => i.code === 'invalid_partners');
    expect(deck(michelangelo, leonardo)).toEqual([]);
    expect(deck(plain, tymna)).toEqual([
      { code: 'invalid_partners', names: 'Omnath, Locus of Mana + Tymna the Weaver' },
    ]);
  });
});
