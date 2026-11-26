import { describe, expect, it } from 'vitest';
import {
  commanderTax,
  manaAvailable,
  playtest,
  startPlaytest,
  type PlaytestLine,
  type PlaytestState,
} from './playtest';

/** Sorteio previsível (sempre o mesmo embaralhamento). */
const seeded =
  (seed = 1) =>
  () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

const line = (name: string, extra: Partial<PlaytestLine> = {}): PlaytestLine => ({
  name,
  board: 'mainboard',
  quantity: 1,
  isLand: false,
  imageUri: null,
  typeLine: 'Creature',
  manaCost: '{1}{G}',
  oracleText: '',
  colorIdentity: ['G'],
  ...extra,
});

const forest = line('Forest', {
  quantity: 20,
  isLand: true,
  typeLine: 'Basic Land — Forest',
  manaCost: null,
});
const deck: PlaytestLine[] = [
  forest,
  line('Llanowar Elves', { quantity: 10 }),
  line('Command Tower', {
    isLand: true,
    typeLine: 'Land',
    manaCost: null,
    colorIdentity: [],
  }),
  line('Omnath, Locus of Mana', { board: 'commander', manaCost: '{2}{G}' }),
  line('Sideboard Card', { board: 'sideboard' }),
];

const start = (opts: { playFirst?: boolean } = {}) =>
  startPlaytest(deck, { startingLife: 40, playFirst: opts.playFirst ?? true }, seeded());
const count = (s: PlaytestState) => Object.values(s.zones).reduce((n, z) => n + z.length, 0);
const act = (s: PlaytestState, ...actions: Parameters<typeof playtest>[1][]) =>
  actions.reduce((st, a) => playtest(st, a, seeded(7)), s);

describe('mesa de testes (11.4): início', () => {
  it('grimório só com o deck principal, comandante na zona de comando, mão de 7, turno 0', () => {
    const s = start();
    expect(s.zones.hand).toHaveLength(7);
    expect(s.zones.library).toHaveLength(31 - 7);
    expect(s.zones.command.map((c) => c.name)).toEqual(['Omnath, Locus of Mana']);
    expect(count(s)).toBe(32);
    expect(s).toMatchObject({ turn: 0, life: 40, mulligans: 0, toBottom: 0 });
  });

  it('mulligan de Londres: compra 7 de novo e põe 1 no fundo por mulligan antes de manter', () => {
    let s = act(start(), { type: 'mulligan' }, { type: 'mulligan' });
    expect(s).toMatchObject({ mulligans: 2, toBottom: 2 });
    expect(s.zones.hand).toHaveLength(7);
    // Não dá para manter antes de escolher as do fundo.
    expect(act(s, { type: 'keep' }).turn).toBe(0);
    const [a, b] = s.zones.hand;
    s = act(s, { type: 'bottom', uid: a!.uid }, { type: 'bottom', uid: b!.uid });
    expect(s.toBottom).toBe(0);
    expect(s.zones.hand).toHaveLength(5);
    expect(s.zones.library.slice(-2).map((c) => c.uid)).toEqual([a!.uid, b!.uid]);
    expect(count(s)).toBe(32);
  });
});

describe('mesa de testes: turnos', () => {
  it('quem começa não compra no turno 1; depois, cada turno desvira tudo e compra 1', () => {
    let s = act(start({ playFirst: true }), { type: 'keep' });
    expect(s.turn).toBe(1);
    expect(s.zones.hand).toHaveLength(7);
    const land = s.zones.hand.find((c) => c.isLand) ?? s.zones.library.find((c) => c.isLand)!;
    const fromHand = s.zones.hand.some((c) => c.uid === land.uid);
    s = act(
      s,
      { type: 'move', uid: land.uid, to: 'battlefield' },
      { type: 'toggleTap', uid: land.uid },
    );
    expect(s.zones.battlefield[0]).toMatchObject({ uid: land.uid, tapped: true });
    s = act(s, { type: 'nextTurn' });
    expect(s.turn).toBe(2);
    expect(s.zones.battlefield[0]!.tapped).toBe(false);
    // Comprou 1: a mão volta a 7 se o terreno saiu dela, ou vai a 8.
    expect(s.zones.hand).toHaveLength(fromHand ? 7 : 8);
  });

  it('quem joga depois compra no turno 1', () => {
    const s = act(start({ playFirst: false }), { type: 'keep' });
    expect(s.zones.hand).toHaveLength(8);
  });
});

describe('mesa de testes: movimentos, fichas e vida', () => {
  it('mover entre zonas desvira; voltar ao grimório vai para o topo ou o fundo', () => {
    let s = act(start(), { type: 'keep' });
    const card = s.zones.hand[0]!;
    s = act(
      s,
      { type: 'move', uid: card.uid, to: 'battlefield' },
      { type: 'toggleTap', uid: card.uid },
    );
    s = act(s, { type: 'move', uid: card.uid, to: 'graveyard' });
    expect(s.zones.graveyard[0]).toMatchObject({ uid: card.uid, tapped: false });
    s = act(s, { type: 'move', uid: card.uid, to: 'library', position: 'top' });
    expect(s.zones.library[0]!.uid).toBe(card.uid);
    s = act(s, { type: 'move', uid: card.uid, to: 'library', position: 'bottom' });
    expect(s.zones.library.at(-1)!.uid).toBe(card.uid);
    expect(count(s)).toBe(32);
  });

  it('procurar no grimório: a carta vai para a mão e o grimório é embaralhado', () => {
    let s = act(start(), { type: 'keep' });
    const target = s.zones.library.find((c) => c.name === 'Command Tower')!;
    s = act(s, { type: 'search', uid: target.uid, to: 'hand' });
    expect(s.zones.hand.some((c) => c.uid === target.uid)).toBe(true);
    expect(s.zones.library.some((c) => c.uid === target.uid)).toBe(false);
  });

  it('fichas entram no campo e deixam de existir fora dele', () => {
    let s = act(start(), { type: 'keep' }, { type: 'createToken', name: 'Elf Warrior', count: 3 });
    const tokens = s.zones.battlefield.filter((c) => c.isToken);
    expect(tokens.map((c) => c.name)).toEqual(['Elf Warrior', 'Elf Warrior', 'Elf Warrior']);
    s = act(s, { type: 'move', uid: tokens[0]!.uid, to: 'graveyard' });
    expect(s.zones.battlefield.filter((c) => c.isToken)).toHaveLength(2);
    expect(s.zones.graveyard.some((c) => c.isToken)).toBe(false);
  });

  it('vida soma e subtrai', () => {
    const s = act(start(), { type: 'life', delta: -7 }, { type: 'life', delta: 2 });
    expect(s.life).toBe(35);
  });
});

describe('mesa de testes: mana e comandante', () => {
  it('mana disponível: terrenos desvirados, com as cores de cada um (sem cor = incolor)', () => {
    let s = act(start(), { type: 'keep' });
    const forests = [...s.zones.hand, ...s.zones.library]
      .filter((c) => c.name === 'Forest')
      .slice(0, 2);
    const tower = [...s.zones.hand, ...s.zones.library].find((c) => c.name === 'Command Tower')!;
    for (const c of [...forests, tower])
      s = act(s, { type: 'move', uid: c.uid, to: 'battlefield' });
    s = act(s, { type: 'toggleTap', uid: forests[0]!.uid });
    expect(manaAvailable(s)).toEqual({ total: 2, sources: ['G', 'C'] });
  });

  it('imposto do comandante: +2 a cada vez que sai da zona de comando para o campo', () => {
    let s = act(start(), { type: 'keep' });
    const cmd = s.zones.command[0]!;
    expect(commanderTax(s, cmd.uid)).toBe(0);
    s = act(s, { type: 'move', uid: cmd.uid, to: 'battlefield' });
    expect(commanderTax(s, cmd.uid)).toBe(2);
    s = act(s, { type: 'move', uid: cmd.uid, to: 'command' });
    s = act(s, { type: 'move', uid: cmd.uid, to: 'battlefield' });
    expect(commanderTax(s, cmd.uid)).toBe(4);
  });
});
