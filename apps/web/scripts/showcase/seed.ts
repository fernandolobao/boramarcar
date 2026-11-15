/**
 * Base fictícia das capturas: pessoas, grupo, locais, disponibilidade semanal e encontros (o
 * próximo e as 12 últimas quintas). Decks, coleção e partidas entram depois, pela API (capture.ts).
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
    await pool.query('truncate table "user", groups restart identity cascade');
    await db
      .insert(s.user)
      .values(
        SHOWCASE_USERS.map((u) => ({ ...u, emailVerified: true, timeZone: 'America/Sao_Paulo' })),
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
    return { sessions };
  } finally {
    await pool.end();
  }
}
