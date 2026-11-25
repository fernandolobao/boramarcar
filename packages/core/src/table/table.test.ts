import { describe, expect, it } from 'vitest';
import {
  fieldDelta,
  nextRotation,
  seatSwipe,
  tableLayout,
  tableLayouts,
  tableRows,
  tableRowWeights,
  alivePlayers,
  createTable,
  defeatReason,
  rollDie,
  startingLifeFor,
  tableDurationMinutes,
  tableGamePlayers,
  tableReducer,
  tableResult,
  tableSupportsFormat,
  commanderSources,
  type TableAction,
  type TableState,
} from './index';

const players = [
  { userId: 'a', name: 'Ana', deckId: 'd1' },
  { userId: 'b', name: 'Bia' },
  { userId: 'c', name: 'Caio' },
  { userId: 'd', name: 'Dani' },
];
const run = (state: TableState, ...actions: TableAction[]) => actions.reduce(tableReducer, state);

describe('modo mesa', () => {
  it('vida inicial e formatos', () => {
    expect(startingLifeFor('commander')).toBe(40);
    expect(startingLifeFor('modern')).toBe(20);
    expect(tableSupportsFormat('commander')).toBe(true);
    expect(tableSupportsFormat('two_headed_giant')).toBe(false);
    const t = createTable({ format: 'commander', players, now: new Date('2026-11-07T22:00:00Z') });
    expect(t.players.map((p) => p.life)).toEqual([40, 40, 40, 40]);
    expect(createTable({ format: 'commander', players, startingLife: 30 }).players[0]!.life).toBe(
      30,
    );
  });

  it('vida, dano de comandante (tira vida), veneno, monarca e desfazer', () => {
    let t = createTable({ format: 'commander', players });
    t = run(
      t,
      { type: 'life', userId: 'a', delta: -5 },
      { type: 'commander', userId: 'a', fromUserId: 'b', delta: 7 },
      { type: 'counter', userId: 'c', counter: 'poison', delta: 3 },
      { type: 'counter', userId: 'c', counter: 'poison', delta: -10 },
      { type: 'monarch', userId: 'd' },
    );
    expect(t.players[0]).toMatchObject({ life: 28, commanderDamage: { b: 7 } });
    expect(t.players[2]!.counters.poison).toBe(0);
    expect(t.monarchId).toBe('d');
    t = run(t, { type: 'undo' }, { type: 'undo' }, { type: 'undo' });
    expect(t.monarchId).toBeNull();
    expect(t.players[2]!.counters.poison).toBe(0);
    t = run(t, { type: 'undo' });
    expect(t.players[0]).toMatchObject({ life: 35, commanderDamage: {} });
    expect(run(createTable({ format: 'commander', players }), { type: 'undo' }).step).toBe(0);
  });

  it('derrotas: vida, 10 de veneno, 21 de comandante (só em formatos com comandante) e concessão', () => {
    let t = createTable({ format: 'commander', players });
    t = run(
      t,
      { type: 'commander', userId: 'b', fromUserId: 'a', delta: 21 }, // passo 1
      { type: 'counter', userId: 'c', counter: 'poison', delta: 10 }, // passo 2
      { type: 'concede', userId: 'd', conceded: true }, // passo 3
    );
    expect(t.players.map((p) => defeatReason(p, t.format))).toEqual([
      null,
      'commander',
      'poison',
      'conceded',
    ]);
    expect(tableResult(t)).toEqual({
      winnerId: 'a',
      eliminated: [
        { userId: 'b', order: 1 },
        { userId: 'c', order: 2 },
        { userId: 'd', order: 3 },
      ],
    });
    expect(tableGamePlayers(t, 'a')).toEqual([
      { userId: 'a', deckId: 'd1', seat: 1, result: 'win', eliminatedOrder: null },
      { userId: 'b', deckId: null, seat: 2, result: 'loss', eliminatedOrder: 1 },
      { userId: 'c', deckId: null, seat: 3, result: 'loss', eliminatedOrder: 2 },
      { userId: 'd', deckId: null, seat: 4, result: 'loss', eliminatedOrder: 3 },
    ]);
    // Voltou à vida (desconcedeu): sai da ordem.
    t = run(t, { type: 'concede', userId: 'd', conceded: false });
    expect(alivePlayers(t).map((p) => p.userId)).toEqual(['a', 'd']);
    expect(tableResult(t).winnerId).toBeNull();
    expect(tableGamePlayers(t, null).every((p) => p.result === 'draw')).toBe(true);

    const modern = run(
      createTable({ format: 'modern', players: players.slice(0, 2), startingLife: 40 }),
      {
        type: 'commander',
        userId: 'b',
        fromUserId: 'a',
        delta: 21,
      },
    );
    expect(defeatReason(modern.players[1]!, 'modern')).toBe(null);
    const dead = run(createTable({ format: 'modern', players: players.slice(0, 2) }), {
      type: 'life',
      userId: 'b',
      delta: -20,
    });
    expect(tableResult(dead).winnerId).toBe('a');
  });

  it('duração, dados e quem começa', () => {
    const t = createTable({ format: 'commander', players, now: new Date('2026-11-07T22:00:00Z') });
    expect(tableDurationMinutes(t, new Date('2026-11-07T23:35:20Z'))).toBe(95);
    expect(tableDurationMinutes(t, new Date('2026-11-07T22:00:05Z'))).toBe(1);
    expect(rollDie(20, () => 0)).toBe(1);
    expect(rollDie(20, () => 0.999)).toBe(20);
    expect(run(t, { type: 'first', userId: 'c' }).firstPlayerId).toBe('c');
  });
});

describe('disposição em linhas (app)', () => {
  it('segue a mesma grade do site, em sentido horário', () => {
    expect(tableRows(2)).toEqual([[0], [1]]);
    // 3 jogadores, como no Lotus: grade 2×2 com um canto vazio (-1).
    expect(tableRows(3)).toEqual([
      [-1, 0],
      [2, 1],
    ]);
    expect(tableRows(4)).toEqual([
      [0, 1],
      [3, 2],
    ]);
    expect(tableRows(5)).toEqual([
      [0, 1],
      [4, 2],
      [-1, 3],
    ]);
    expect(tableRows(6)).toEqual([
      [0, 1],
      [5, 2],
      [4, 3],
    ]);
  });
});

describe('trocar lugares', () => {
  it('troca dois jogadores de lugar, mantém tudo de cada um e dá para desfazer', () => {
    let s = createTable({
      format: 'commander',
      players: ['a', 'b', 'c'].map((id) => ({ userId: id, name: id.toUpperCase() })),
    });
    s = tableReducer(s, { type: 'life', userId: 'a', delta: -5 });
    s = tableReducer(s, { type: 'swap', userId: 'a', withUserId: 'c' });
    expect(s.players.map((p) => p.userId)).toEqual(['c', 'b', 'a']);
    expect(s.players[2]!.life).toBe(35);
    expect(tableGamePlayers(s, 'b').map((p) => [p.userId, p.seat])).toEqual([
      ['c', 1],
      ['b', 2],
      ['a', 3],
    ]);
    expect(tableReducer(s, { type: 'swap', userId: 'a', withUserId: 'a' })).toBe(s);
    expect(tableReducer(s, { type: 'swap', userId: 'a', withUserId: 'x' })).toBe(s);
    expect(tableReducer(s, { type: 'undo' }).players.map((p) => p.userId)).toEqual(['a', 'b', 'c']);
  });
});

describe('disposição da mesa', () => {
  it('cada disposição tem um assento por jogador, áreas válidas e uma linha por faixa', () => {
    for (let count = 2; count <= 6; count++) {
      const layouts = tableLayouts(count);
      expect(layouts.length).toBeGreaterThan(1);
      expect(new Set(layouts.map((l) => l.id)).size).toBe(layouts.length);
      for (const layout of layouts) {
        expect(layout.seats).toHaveLength(count);
        const areas = new Set(layout.areas.match(/[a-z]/g));
        expect(new Set(layout.seats.map((s) => s.area))).toEqual(areas);
        const rows = tableRows(count, layout);
        expect(
          rows
            .flat()
            .filter((i) => i >= 0)
            .sort(),
        ).toEqual([...Array(count).keys()]);
        expect(tableRowWeights(layout)).toHaveLength(rows.length);
        for (const row of rows) expect(row.length).toBeLessThanOrEqual(layout.columns);
      }
    }
  });

  it('ninguém tem área maior que os outros (o aparelho fica no meio da mesa)', () => {
    for (const count of [2, 3, 4, 5, 6]) {
      for (const layout of tableLayouts(count)) {
        const weights = tableRowWeights(layout);
        const rows = [...layout.areas.matchAll(/"([^"]*)"/g)].map((m) => m[1]!.trim().split(/\s+/));
        const area = (name: string) =>
          rows.reduce(
            (sum, cells, r) =>
              sum + (cells.filter((c) => c === name).length * weights[r]!) / cells.length,
            0,
          );
        const sizes = layout.seats.map((s) => area(s.area));
        expect(new Set(sizes.map((x) => x.toFixed(6))).size, layout.id).toBe(1);
      }
    }
  });

  it('3 jogadores: a padrão é a grade 2×2 com um canto vazio, e as antigas continuam válidas', () => {
    expect(tableLayout(3).id).toBe('3-sides-open-left');
    expect(tableLayouts(3).map((l) => l.id)).toEqual(
      expect.arrayContaining([
        '3-sides-open-right',
        '3-sides-bottom',
        '3-top-bottom',
        '3-top-sides',
      ]),
    );
    expect(tableRowWeights(tableLayout(3, '3-sides-bottom'))).toEqual([2, 1]);
  });

  it('a padrão continua a mesma; layoutId e giros por assento mudam a disposição', () => {
    expect(tableLayout(4).id).toBe('4-sides');
    expect(tableLayout(4, 'nao-existe').id).toBe('4-sides');
    const cross = tableLayout(4, '4-cross');
    expect(cross.seats.map((s) => s.rotate)).toEqual([180, 270, 0, 90]);
    expect(tableLayout(4, '4-cross', { 2: 90 }).seats.map((s) => s.rotate)).toEqual([
      180, 270, 90, 90,
    ]);
    expect(nextRotation(270)).toBe(0);
    expect(nextRotation(0)).toBe(90);
  });

  it('mudar a disposição ou girar uma área não entra no desfazer', () => {
    let state = createTable({ format: 'commander', players });
    state = tableReducer(state, { type: 'life', userId: 'a', delta: -3 });
    state = tableReducer(state, { type: 'layout', layoutId: '2-sides' });
    state = tableReducer(state, { type: 'rotate', seat: 1, rotate: 180 });
    expect(state.undo).toHaveLength(1);
    expect(state.step).toBe(1);
    state = tableReducer(state, { type: 'undo' });
    expect(state.players[0]!.life).toBe(40);
    expect(state.layoutId).toBe('2-sides');
    expect(state.rotations).toEqual({ 1: 180 });
    expect(tableReducer(state, { type: 'rotate', seat: 9, rotate: 90 })).toBe(state);
    // Nova disposição zera os giros.
    expect(tableReducer(state, { type: 'layout', layoutId: '2-face' }).rotations).toEqual({});
  });
});

describe('deslizar na área do jogador', () => {
  it('"para cima" depende de onde a pessoa está sentada', () => {
    expect(seatSwipe(0, -100, 0)).toBe('up'); // embaixo: para cima na tela
    expect(seatSwipe(0, 100, 180)).toBe('up'); // em cima: para baixo na tela
    expect(seatSwipe(-100, 0, 270)).toBe('up'); // à direita: para a esquerda na tela
    expect(seatSwipe(100, 0, 90)).toBe('up'); // à esquerda: para a direita na tela
    expect(seatSwipe(0, 100, 0)).toBe('down');
  });

  it('ignora toques curtos e gestos mais "de lado" que "para cima"', () => {
    expect(seatSwipe(0, -20, 0)).toBeNull();
    expect(seatSwipe(60, -150, 90)).toBeNull();
    expect(seatSwipe(-150, -60, 0)).toBeNull();
  });
});

describe('editar um marcador pelo campo', () => {
  it('campo vazio (apagando para digitar outro número) não muda o marcador', () => {
    expect(fieldDelta(null, 3)).toBeNull();
  });
  it('número novo vira a diferença para o valor atual', () => {
    expect(fieldDelta(5, 3)).toBe(2);
    expect(fieldDelta(0, 3)).toBe(-3);
    expect(fieldDelta(3, 3)).toBeNull();
  });
});

describe('dano de comandante por comandante (parceiros)', () => {
  const withPartners = () =>
    createTable({
      format: 'commander',
      players: [
        { userId: 'a', name: 'Ana', commanders: ['Thrasios, Triton Hero', 'Tymna the Weaver'] },
        { userId: 'b', name: 'Bia', commanders: ['Omnath, Locus of Mana'] },
        { userId: 'c', name: 'Caio' },
      ],
    });

  it('cada comandante do oponente vira uma fonte de dano, com o nome quando o deck diz', () => {
    const t = withPartners();
    expect(commanderSources(t, 'b')).toEqual([
      { key: 'a', fromUserId: 'a', index: 0, name: 'Ana', commander: 'Thrasios, Triton Hero' },
      { key: 'a#2', fromUserId: 'a', index: 1, name: 'Ana', commander: 'Tymna the Weaver' },
      { key: 'c', fromUserId: 'c', index: 0, name: 'Caio', commander: null },
    ]);
  });

  it('o dano de cada comandante conta à parte: 21 do mesmo comandante derruba', () => {
    let t = run(
      withPartners(),
      { type: 'commander', userId: 'b', fromUserId: 'a', delta: 15 },
      { type: 'commander', userId: 'b', fromUserId: 'a', index: 1, delta: 15 },
    );
    expect(t.players[1]).toMatchObject({ life: 10, commanderDamage: { a: 15, 'a#2': 15 } });
    expect(defeatReason(t.players[1]!, 'commander')).toBeNull();
    t = run(t, { type: 'commander', userId: 'b', fromUserId: 'a', index: 1, delta: 6 });
    expect(defeatReason(t.players[1]!, 'commander')).toBe('commander');
  });

  it('"dois comandantes" liga a segunda fonte para quem não tem deck; desligar limpa o dano dela', () => {
    let t = run(withPartners(), { type: 'commanders', userId: 'c', count: 2 });
    expect(commanderSources(t, 'b').filter((s) => s.fromUserId === 'c')).toHaveLength(2);
    t = run(
      t,
      { type: 'commander', userId: 'b', fromUserId: 'c', index: 1, delta: 21 },
      { type: 'commanders', userId: 'c', count: 1 },
    );
    expect(t.players[1]!.commanderDamage).toEqual({});
    expect(defeatReason(t.players[1]!, 'commander')).toBeNull();
    // Desfazer devolve a segunda fonte e o dano dela.
    t = run(t, { type: 'undo' });
    expect(t.players[1]!.commanderDamage).toEqual({ 'c#2': 21 });
  });

  it('partida salva antes da mudança (sem os campos novos) continua funcionando', () => {
    const old = createTable({ format: 'commander', players });
    const legacy: TableState = {
      ...old,
      players: old.players.map(({ commanders: _c, commanderCount: _n, ...p }) => p),
    };
    expect(commanderSources(legacy, 'a').map((s) => s.key)).toEqual(['b', 'c', 'd']);
  });
});
