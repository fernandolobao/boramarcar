/**
 * Base fictícia das capturas: pessoas, grupo, locais, disponibilidade semanal e encontros (o
 * próximo e as 12 últimas quintas) e três lojas em São Paulo com eventos (descoberta, 10.3). Decks,
 * coleção e partidas entram depois, pela API (capture.ts).
 */
import { randomBytes } from 'node:crypto';
import { createDb, schema } from '@boramarcar/db';
import { assertDisposableDatabase } from './guard';
import { SHOWCASE_GROUP, SHOWCASE_USERS } from './data';

const HOUR = 3600_000;
const DAY = 24 * HOUR;

/** Próxima quinta às 19h30 em São Paulo (UTC−3), e as quintas anteriores. */
export function thursdays(now = new Date()) {
  const next = new Date(now);
  next.setUTCHours(22, 30, 0, 0);
  while (next.getUTCDay() !== 4 || next <= now) next.setTime(next.getTime() + DAY);
  return { next, past: (weeksAgo: number) => new Date(next.getTime() - weeksAgo * 7 * DAY) };
}

export async function seedShowcase(databaseUrl: string) {
  assertDisposableDatabase(databaseUrl);
  const { db, pool } = createDb(databaseUrl, { max: 1 });
  const s = schema;
  const sessions: Record<string, string> = {};
  try {
    // O cache de cartas (Scryfall) fica: não é dado de ninguém e evita bater no limite de consultas.
    await pool.query('truncate table "user", groups, stores restart identity cascade');
    await db.insert(s.user).values(
      SHOWCASE_USERS.map((u) => ({
        ...u,
        emailVerified: true,
        timeZone: 'America/Sao_Paulo',
        // Contas "antigas": o guia do primeiro acesso não abre por cima das capturas.
        createdAt: new Date('2026-01-01T12:00:00Z'),
      })),
    );
    for (const u of SHOWCASE_USERS) {
      const token = `showcase-${u.id}-${randomBytes(6).toString('hex')}`;
      sessions[u.id] = token;
      await db.insert(s.session).values({
        id: `session-${u.id}`,
        token,
        userId: u.id,
        expiresAt: new Date(Date.now() + 2 * DAY),
      });
    }
    // Quem aparece nas capturas já usa o app: dicas das telas dispensadas.
    await db.insert(s.onboardingSteps).values(
      SHOWCASE_USERS.flatMap((u) =>
        (['tip-deck-analysis', 'tip-table', 'tip-collection'] as const).map((step) => ({
          userId: u.id,
          step,
        })),
      ),
    );
    await db.insert(s.groups).values({ ...SHOWCASE_GROUP, createdBy: 'sc-ana' });
    await db.insert(s.groupMembers).values(
      SHOWCASE_USERS.map((u, i) => ({
        groupId: SHOWCASE_GROUP.id,
        userId: u.id,
        role: i === 0 ? ('owner' as const) : i === 1 ? ('admin' as const) : ('member' as const),
        joinedAt: new Date(Date.now() - (120 - i * 10) * DAY),
      })),
    );
    await db.insert(s.locations).values([
      {
        id: 'sc-loc-ana',
        groupId: SHOWCASE_GROUP.id,
        name: 'Casa da Ana',
        address: 'Rua das Acácias, 120',
        hostUserId: 'sc-ana',
        createdBy: 'sc-ana',
      },
      {
        id: 'sc-loc-loja',
        groupId: SHOWCASE_GROUP.id,
        name: 'Loja Dragão Dourado',
        address: 'Av. Central, 900',
        createdBy: 'sc-bruno',
      },
    ]);
    // Quintas 19h–23h para quase todos (a mesa fecha), e um sábado à tarde para alguns.
    await db.insert(s.availabilityRules).values([
      ...SHOWCASE_USERS.slice(0, 5).map((u) => ({
        id: `sc-rule-thu-${u.id}`,
        groupId: SHOWCASE_GROUP.id,
        userId: u.id,
        weekday: 4,
        startTime: u.id === 'sc-carla' ? '20:00' : '19:00',
        endTime: '23:00',
        timeZone: 'America/Sao_Paulo',
      })),
      ...(['sc-ana', 'sc-diego', 'sc-felipe', 'sc-elisa'] as const).map((id) => ({
        id: `sc-rule-sat-${id}`,
        groupId: SHOWCASE_GROUP.id,
        userId: id,
        weekday: 6,
        startTime: '14:00',
        endTime: '18:00',
        timeZone: 'America/Sao_Paulo',
      })),
    ]);
    const { next, past } = thursdays();
    await db.insert(s.events).values([
      {
        id: 'sc-event-next',
        groupId: SHOWCASE_GROUP.id,
        title: 'Commander de quinta',
        startsAt: next,
        endsAt: new Date(next.getTime() + 4 * HOUR),
        locationId: 'sc-loc-ana',
        createdBy: 'sc-ana',
      },
      ...Array.from({ length: 12 }, (_, i) => ({
        id: `sc-event-w${i + 1}`,
        groupId: SHOWCASE_GROUP.id,
        title: 'Commander de quinta',
        startsAt: past(i + 1),
        endsAt: new Date(past(i + 1).getTime() + 4 * HOUR),
        locationId: i % 3 === 2 ? 'sc-loc-loja' : 'sc-loc-ana',
        status: 'finished' as const,
        createdBy: 'sc-ana',
      })),
    ]);
    await db.insert(s.eventParticipants).values([
      ...SHOWCASE_USERS.map((u) => ({
        eventId: 'sc-event-next',
        userId: u.id,
        rsvp: u.id === 'sc-felipe' ? ('maybe' as const) : ('yes' as const),
      })),
      ...Array.from({ length: 12 }, (_, i) =>
        SHOWCASE_USERS.map((u) => ({
          eventId: `sc-event-w${i + 1}`,
          userId: u.id,
          rsvp: 'yes' as const,
        })),
      ).flat(),
    ]);
    await seedStores(db);
    return { sessions };
  } finally {
    await pool.end();
  }
}

/** Próximo dia da semana (0 = domingo) às `hour`:`minute` em São Paulo (UTC−3), daqui a `weeks`. */
function nextWeekday(weekday: number, hour: number, minute = 0, weeks = 0) {
  const d = new Date();
  d.setUTCHours(hour + 3, minute, 0, 0);
  while (d.getUTCDay() !== weekday || d <= new Date()) d.setTime(d.getTime() + DAY);
  return new Date(d.getTime() + weeks * 7 * DAY);
}

/**
 * Três lojas fictícias em São Paulo, com eventos nas próximas semanas, inscrições do grupo e a
 * Ana seguindo a Dragão Dourado (a loja onde o grupo também joga).
 */
async function seedStores(db: ReturnType<typeof createDb>['db']) {
  const s = schema;
  const base = {
    city: 'São Paulo',
    municipalityCode: '3550308',
    contactEmail: 'loja@exemplo.test',
  };
  await db.insert(s.stores).values([
    {
      ...base,
      id: 'sc-store-dragao',
      slug: 'dragao-dourado',
      name: 'Loja Dragão Dourado',
      about:
        'Cartas avulsas, boosters e mesas para jogar. Commander toda sexta e torneio de Modern aos sábados.',
      address: 'Av. Paulista, 900 — Bela Vista',
      lat: -23.5631,
      lng: -46.6544,
      hours: 'Ter. a sáb., das 12h às 22h',
      instagram: 'dragaodourado.tcg',
      offers: ['singles', 'sealed', 'play_space', 'tournaments'],
      formats: ['commander', 'modern', 'pauper'],
      verified: true,
      createdBy: 'sc-bruno',
    },
    {
      ...base,
      id: 'sc-store-taverna',
      slug: 'taverna-do-mana',
      name: 'Taverna do Mana',
      about: 'Café, jogos de tabuleiro e Magic. Pauper às quartas.',
      address: 'Rua dos Pinheiros, 410 — Pinheiros',
      lat: -23.5666,
      lng: -46.6913,
      hours: 'Todos os dias, das 14h às 23h',
      offers: ['play_space', 'tournaments'],
      formats: ['pauper', 'commander'],
      createdBy: 'sc-bruno',
    },
    {
      ...base,
      id: 'sc-store-portal',
      slug: 'portal-arcano',
      name: 'Portal Arcano',
      about: 'Especializada em cartas avulsas e lançamentos.',
      address: 'Av. Ibirapuera, 2100 — Moema',
      lat: -23.6009,
      lng: -46.6658,
      hours: 'Seg. a sáb., das 10h às 20h',
      offers: ['singles', 'sealed', 'tournaments'],
      formats: ['standard', 'sealed', 'modern'],
      createdBy: 'sc-bruno',
    },
  ]);
  await db.insert(s.storeMembers).values([
    { storeId: 'sc-store-dragao', userId: 'sc-bruno', role: 'owner' },
    { storeId: 'sc-store-taverna', userId: 'sc-bruno', role: 'owner' },
    { storeId: 'sc-store-portal', userId: 'sc-bruno', role: 'owner' },
  ]);
  const ev = (
    id: string,
    storeId: string,
    title: string,
    startsAt: Date,
    format: string,
    kind: 'tournament' | 'casual',
    code: string,
    extra: { capacity?: number; prizes?: string } = {},
  ) => ({
    id,
    storeId,
    title,
    startsAt,
    endsAt: new Date(startsAt.getTime() + 4 * HOUR),
    format,
    kind,
    code,
    createdBy: 'sc-bruno',
    ...extra,
  });
  await db.insert(s.storeEvents).values([
    ev(
      'sc-se-sexta',
      'sc-store-dragao',
      'Commander de sexta',
      nextWeekday(5, 19, 30),
      'commander',
      'casual',
      'DRGSX1',
    ),
    ev(
      'sc-se-modern',
      'sc-store-dragao',
      'Torneio de Modern',
      nextWeekday(6, 14),
      'modern',
      'tournament',
      'DRGMD2',
      {
        capacity: 16,
        prizes: 'Boosters para o top 4',
      },
    ),
    ev(
      'sc-se-pauper',
      'sc-store-taverna',
      'Pauper de quarta',
      nextWeekday(3, 20),
      'pauper',
      'tournament',
      'TAVPP3',
      {
        capacity: 12,
      },
    ),
    ev(
      'sc-se-sealed',
      'sc-store-portal',
      'Sealed de lançamento',
      nextWeekday(0, 13, 0, 1),
      'sealed',
      'tournament',
      'PRTSL4',
      {
        capacity: 24,
        prizes: 'Um booster por vitória',
      },
    ),
  ]);
  await db.insert(s.storeEventEntries).values([
    ...(['sc-ana', 'sc-carla', 'sc-diego', 'sc-elisa', 'sc-felipe'] as const).map((userId) => ({
      storeEventId: 'sc-se-modern',
      userId,
      status: 'registered',
    })),
    ...(['sc-ana', 'sc-bruno', 'sc-diego'] as const).map((userId) => ({
      storeEventId: 'sc-se-sexta',
      userId,
      status: 'registered',
    })),
    ...(['sc-carla', 'sc-elisa'] as const).map((userId) => ({
      storeEventId: 'sc-se-pauper',
      userId,
      status: 'registered',
    })),
  ]);
  await db.insert(s.storeFollowers).values({ storeId: 'sc-store-dragao', userId: 'sc-ana' });
}
