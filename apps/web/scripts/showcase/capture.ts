/**
 * Gera as capturas do produto para a página inicial (`public/showcase/*.webp`).
 *
 *   DATABASE_URL=postgres://…@localhost:5433/showcase pnpm --filter @boramarcar/web showcase
 *
 * Precisa de um build (`pnpm build`) e de um banco local descartável chamado "showcase…": o script
 * apaga tudo e semeia um grupo fictício. Usa a rede (Scryfall) para importar os decks.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { createTable, type TableState } from '@boramarcar/core';
import { chromium, type Browser, type Page } from '@playwright/test';
import sharp from 'sharp';
import { signedSessionCookie } from '../../e2e/support/seed';
import {
  SHOWCASE_COLLECTION,
  SHOWCASE_DECKS,
  SHOWCASE_GAMES,
  SHOWCASE_USERS,
  SHOWCASE_VIEWER,
} from './data';
import { assertDisposableDatabase } from './guard';
import { seedShowcase, thursdays } from './seed';

const PORT = 3100;
const BASE = `http://localhost:${PORT}`;
const SECRET = 'showcase-'.padEnd(40, 'x');
const OUT = path.resolve(import.meta.dirname, '../../public/showcase');
const DESKTOP = { width: 1280, height: 800 };
const IPAD = { width: 1180, height: 820 };

type Theme = 'light' | 'dark';

/** Progresso no terminal (script de linha de comando). */
const log = (message: string) => process.stdout.write(`${message}\n`);

async function startServer(databaseUrl: string): Promise<ChildProcess> {
  const server = spawn('pnpm', ['start', '--port', String(PORT)], {
    cwd: path.resolve(import.meta.dirname, '../..'),
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      BETTER_AUTH_SECRET: SECRET,
      BETTER_AUTH_URL: BASE,
      GOOGLE_CLIENT_ID: 'showcase',
      GOOGLE_CLIENT_SECRET: 'showcase',
    },
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(BASE)).ok) return server;
    } catch {
      // ainda subindo
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  server.kill();
  throw new Error('O site não subiu na porta 3100. Rodou `pnpm build` antes?');
}

function api(token: string) {
  const cookie = `better-auth.session_token=${signedSessionCookie(token, SECRET)}`;
  const call = async <T = unknown>(
    method: string,
    url: string,
    body?: unknown,
    attempt = 1,
  ): Promise<T> => {
    const res = await fetch(`${BASE}/api/v1${url}`, {
      method,
      headers: { cookie, origin: BASE, 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = res.ok ? '' : await res.text();
    // Scryfall limitou as consultas: espera e tenta de novo (o import é idempotente para a pessoa).
    if (!res.ok && text.includes('429') && attempt < 6) {
      log(`Scryfall limitou (${url}); nova tentativa em ${15 * attempt}s`);
      await new Promise((r) => setTimeout(r, 15_000 * attempt));
      return call<T>(method, url, body, attempt + 1);
    }
    if (!res.ok) throw new Error(`${method} ${url}: ${res.status} ${text}`);
    return (res.status === 204 ? null : await res.json()) as T;
  };
  return call;
}

/** Decks, coleção e partidas, pela API, como uma pessoa faria. */
async function fillThroughApi(sessions: Record<string, string>) {
  const deckOf: Record<string, string> = {};
  for (const deck of SHOWCASE_DECKS) {
    const { deck: created } = await api(sessions[deck.owner]!)<{ deck: { id: string } }>(
      'POST',
      '/decks',
      {
        kind: 'text',
        name: deck.name,
        text: deck.list,
        format: 'commander',
      },
    );
    deckOf[deck.owner] = created.id;
    log(`deck ${deck.name}: ${created.id}`);
  }
  const ana = api(sessions[SHOWCASE_VIEWER]!);
  // A análise roda em segundo plano depois do import; aqui ela é refeita até vir completa.
  for (let attempt = 1; ; attempt++) {
    await new Promise((r) => setTimeout(r, 20_000));
    const result = await ana<{ errors: string[] }>(
      'POST',
      `/decks/${deckOf[SHOWCASE_VIEWER]}/analysis`,
    );
    if (result.errors.length === 0) break;
    if (attempt === 6)
      throw new Error(`Análise incompleta (${result.errors.join(', ')}): Scryfall indisponível?`);
    log(`análise incompleta (${result.errors.join(', ')}); nova tentativa`);
  }
  for (const item of SHOWCASE_COLLECTION) {
    await ana('POST', '/collection', {
      name: item.name,
      quantity: item.quantity,
      foil: item.foil ?? false,
    });
  }
  const { past } = thursdays();
  for (const [i, game] of SHOWCASE_GAMES.entries()) {
    // Na noite do encontro (a segunda partida da noite, uma hora e meia depois).
    const sameNight = SHOWCASE_GAMES.slice(0, i).filter((g) => g.week === game.week).length;
    const playedAt = new Date(past(game.week).getTime() + (60 + sameNight * 90) * 60_000);
    await ana('POST', `/events/sc-event-w${game.week}/games`, {
      format: 'commander',
      playedAt: playedAt.toISOString(),
      winningTurn: game.turn,
      durationMinutes: game.minutes,
      firstPlayerId: game.players[i % game.players.length],
      players: game.players.map((userId, seat) => ({
        userId,
        deckId: deckOf[userId] ?? null,
        seat: seat + 1,
        result: game.winner === 'draw' ? 'draw' : game.winner === userId ? 'win' : 'loss',
      })),
    });
  }
  return deckOf;
}

/**
 * Torneio de Modern (melhor de 3) com as 6 pessoas, no próximo encontro: rodada 1 inteira
 * registrada e a 2 com uma mesa registrada. Não conta no ranking (a captura do ranking não muda).
 */
async function tournamentThroughApi(sessions: Record<string, string>) {
  const ana = api(sessions[SHOWCASE_VIEWER]!);
  const { tournament } = await ana<{ tournament: { id: string } }>(
    'POST',
    '/events/sc-event-next/tournaments',
    { name: 'Copa de Modern', format: 'modern', bestOf: 3, rounds: 3, countsInRanking: false },
  );
  for (const u of SHOWCASE_USERS) {
    await api(sessions[u.id]!)('POST', `/tournaments/${tournament.id}/entrants`, {
      memberIds: [u.id],
    });
  }
  await ana('POST', `/tournaments/${tournament.id}/start`);
  type View = { rounds: { tables: { id: string; entrants: string[] }[] }[] };
  const report = async (table: { id: string; entrants: string[] }, wins: [number, number]) =>
    ana('PUT', `/tournaments/${tournament.id}/tables/${table.id}`, {
      gameWins: { [table.entrants[0]!]: wins[0], [table.entrants[1]!]: wins[1] },
      gameDraws: 0,
    });
  let view = await ana<View>('GET', `/tournaments/${tournament.id}`);
  const scores: [number, number][] = [
    [2, 1],
    [2, 0],
    [1, 2],
  ];
  for (const [i, table] of view.rounds[0]!.tables.entries()) await report(table, scores[i]!);
  await ana('POST', `/tournaments/${tournament.id}/next`);
  view = await ana<View>('GET', `/tournaments/${tournament.id}`);
  await report(view.rounds[1]!.tables[0]!, [2, 1]);
  log(`torneio: ${tournament.id}`);
  return tournament.id;
}

/** Mesa em andamento: 4 jogadores, vidas e dano de comandante variados. */
function tableInProgress(deckOf: Record<string, string>): TableState {
  const players = SHOWCASE_USERS.slice(0, 4).map((u) => ({
    userId: u.id,
    name: u.name.split(' ')[0]!,
    deckId: deckOf[u.id] ?? null,
  }));
  const state = createTable({
    format: 'commander',
    players,
    now: new Date(Date.now() - 52 * 60_000),
  });
  const lives = [31, 18, 24, 9];
  state.players.forEach((p, i) => (p.life = lives[i]!));
  state.players[3]!.commanderDamage = { [players[0]!.userId]: 14 };
  state.players[1]!.counters = { ...state.players[1]!.counters, poison: 3 };
  state.monarchId = players[0]!.userId;
  state.firstPlayerId = players[2]!.userId;
  state.step = 37;
  return state;
}

async function newPage(browser: Browser, token: string, theme: Theme, viewport: typeof DESKTOP) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 2,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    colorScheme: theme,
    reducedMotion: 'reduce',
  });
  await context.addCookies([
    { name: 'better-auth.session_token', value: signedSessionCookie(token, SECRET), url: BASE },
    // Cookies já escolhidos: sem o aviso por cima da captura.
    { name: 'ak_consent', value: 'rejected', url: BASE },
  ]);
  await context.addInitScript((t) => {
    try {
      localStorage.setItem('bm-theme', t);
    } catch {
      // sem armazenamento
    }
  }, theme);
  return context.newPage();
}

async function save(page: Page, name: string, theme: Theme) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(600);
  const png = await page.screenshot({ type: 'png' });
  const file = path.join(OUT, `${name}-${theme}.webp`);
  await sharp(png).resize({ width: 1280 }).webp({ quality: 78 }).toFile(file);
  log(`${path.basename(file)}: ${Math.round((await stat(file)).size / 1024)} KB`);
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL ?? '';
  assertDisposableDatabase(databaseUrl);
  const { sessions } = await seedShowcase(databaseUrl);
  const server = await startServer(databaseUrl);
  try {
    const deckOf = await fillThroughApi(sessions);
    const tournamentId = await tournamentThroughApi(sessions);
    await mkdir(OUT, { recursive: true });
    const browser = await chromium.launch({ channel: 'chrome' });
    const token = sessions[SHOWCASE_VIEWER]!;
    const table = tableInProgress(deckOf);
    try {
      for (const theme of ['light', 'dark'] as const) {
        const page = await newPage(browser, token, theme, DESKTOP);
        // [tela, endereço, texto que deve ficar no alto da captura]
        for (const [name, url, top] of [
          ['painel', '/painel', null],
          ['disponibilidade', '/disponibilidade', null],
          ['deck', `/decks/${deckOf[SHOWCASE_VIEWER]}`, 'Análise'],
          ['colecao', '/colecao', 'Valor estimado'],
          ['ranking', '/ranking', null],
          ['torneio', `/torneios/${tournamentId}`, null],
          ['lojas', '/lojas?cidade=sp/sao-paulo', null],
          ['loja', '/lojas/dragao-dourado', null],
        ] as const) {
          await page.goto(`${BASE}${url}`);
          if (top) {
            const target = page.getByText(top, { exact: true }).first();
            await target.waitFor();
            await target.evaluate((el) =>
              window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 48),
            );
          }
          await save(page, name, theme);
        }
        await page.context().close();

        const ipad = await newPage(browser, token, theme, IPAD);
        await ipad.addInitScript(
          (s) => localStorage.setItem('bm-mesa:sc-event-next', s),
          JSON.stringify(table),
        );
        await ipad.goto(`${BASE}/mesa/sc-event-next`);
        // Pelo teclado: o ponteiro não fica sobre a mesa deixando um realce na captura.
        await ipad.getByRole('button', { name: 'Continuar partida' }).press('Enter');
        await ipad.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
        await save(ipad, 'mesa', theme);
        await ipad.context().close();
      }
    } finally {
      await browser.close();
    }
  } finally {
    server.kill();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
