import { createTestDb, createTestUser } from '@boramarcar/db/testing';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetEnvCache } from '@/env';
import { asUser, call, dbMock, sessionMock, testState } from '@/test/api';
import { backgroundTasks, flushBackground } from '@/test/setup';

vi.mock('@/server/session', () => sessionMock);
vi.mock('@/server/db', () => dbMock);

const groups = await import('../groups/route');
const join = await import('../groups/join/route');
const events = await import('../groups/[groupId]/events/route');
const event = await import('../events/[eventId]/route');
const rsvp = await import('../events/[eventId]/rsvp/route');
const availability = await import('../groups/[groupId]/availability/route');
const preferences = await import('../me/preferences/route');
const cron = await import('../../cron/reminders/route');

type U = Awaited<ReturnType<typeof createTestUser>>;
let close: () => Promise<void>;
let ana: U, bia: U, caio: U, dani: U;
let groupId: string;

interface Sent {
  to: string[];
  subject: string;
  text: string;
  html: string;
  attachments?: { filename: string; content: string }[];
}
let sent: Sent[] = [];
const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
  sent.push(JSON.parse(init.body as string) as Sent);
  return Response.json({ id: `email-${sent.length}` });
});

const HOUR = 60 * 60 * 1000;
const inDays = (days: number, hourUtc: number) => {
  const d = new Date(Date.now() + days * 24 * HOUR);
  d.setUTCHours(hourUtc, 0, 0, 0);
  return d;
};
const sentTo = (u: U) => sent.filter((s) => s.to[0] === u.email);

beforeAll(async () => {
  process.env.RESEND_API_KEY = 're_test';
  process.env.CRON_SECRET = 'segredo-do-cron-123';
  resetEnvCache();
  vi.stubGlobal('fetch', fetchMock);

  const testDb = await createTestDb();
  testState.db = testDb.db;
  close = testDb.close;
  [ana, bia, caio, dani] = (await Promise.all(
    ['Ana Souza', 'Bia', 'Caio', 'Dani'].map((name) => createTestUser(testDb.db, { name })),
  )) as [U, U, U, U];
  asUser(ana);
  const created = await call(groups.POST, { method: 'POST', body: { name: 'Mesa <Commander>' } });
  groupId = created.body!.group.id;
  for (const u of [bia, caio, dani]) {
    asUser(u);
    await call(join.POST, { method: 'POST', body: { inviteCode: created.body!.group.inviteCode } });
  }
  // Bia lê em inglês, no fuso de Tóquio; Dani não quer e-mails.
  asUser(bia);
  await call(preferences.PUT, {
    method: 'PUT',
    body: { locale: 'en', timeZone: 'Asia/Tokyo' },
  });
  asUser(dani);
  await call(preferences.PUT, { method: 'PUT', body: { emailNotifications: false } });
});
afterAll(async () => {
  vi.unstubAllGlobals();
  delete process.env.RESEND_API_KEY;
  delete process.env.CRON_SECRET;
  resetEnvCache();
  await close();
});
beforeEach(() => {
  sent = [];
  backgroundTasks.splice(0);
});
afterEach(() => {
  testState.user = null;
});

describe('e-mails de encontros', () => {
  let eventId: string;

  it('avisa o grupo de um encontro novo, no idioma e fuso de cada um, com .ics', async () => {
    asUser(ana);
    const res = await call(events.POST, {
      method: 'POST',
      params: { groupId },
      body: { title: 'Commander & pizza', startsAt: inDays(5, 22).toISOString() },
    });
    expect(res.status).toBe(201);
    eventId = res.body!.event.id;
    // Nada sai antes da resposta: o envio fica para depois.
    expect(sent).toHaveLength(0);
    await flushBackground();

    expect(sent.map((s) => s.to[0]).sort()).toEqual([bia.email, caio.email].sort());
    const [toCaio] = sentTo(caio);
    expect(toCaio!.subject).toBe('Novo encontro: Commander & pizza');
    expect(toCaio!.text).toContain('Olá, Caio!');
    expect(toCaio!.text).toContain('Mesa <Commander> marcou um novo encontro');
    expect(toCaio!.text).toContain('19:00'); // 22h UTC = 19h em São Paulo
    expect(toCaio!.html).toContain('Mesa &lt;Commander&gt;');
    expect(toCaio!.html).not.toContain('<Commander>');
    expect(toCaio!.html).toContain('<html lang="pt-BR">');
    expect(toCaio!.text).toContain('/configuracoes');
    const ics = Buffer.from(toCaio!.attachments![0]!.content, 'base64').toString('utf8');
    expect(toCaio!.attachments![0]!.filename).toBe('commander-pizza.ics');
    expect(ics).toContain(`UID:${eventId}@boramarcar`);

    const [toBia] = sentTo(bia);
    expect(toBia!.subject).toBe('New game night: Commander & pizza');
    expect(toBia!.text).toContain('Hi, Bia!');
    expect(toBia!.text).toContain('7:00 AM'); // 22h UTC = 7h do dia seguinte em Tóquio
  });

  it('avisa participantes de mudanças reais e de cancelamento', async () => {
    asUser(ana);
    await call(event.PATCH, {
      method: 'PATCH',
      params: { eventId },
      body: { title: 'Commander & pizza' },
    });
    await flushBackground();
    expect(sent).toHaveLength(0);

    // Caio entra no encontro; Bia recusa e deixa de receber atualizações.
    for (const [u, answer] of [
      [caio, 'yes'],
      [bia, 'no'],
    ] as const) {
      asUser(u);
      await call(rsvp.PUT, { method: 'PUT', params: { eventId }, body: { rsvp: answer } });
    }
    await flushBackground();
    expect(sent).toHaveLength(0);

    asUser(ana);
    await call(event.PATCH, {
      method: 'PATCH',
      params: { eventId },
      body: { startsAt: inDays(6, 22).toISOString() },
    });
    await flushBackground();
    expect(sent.map((s) => s.to[0])).toEqual([caio.email]);
    expect(sent[0]!.subject).toBe('Encontro alterado: Commander & pizza');
    expect(sent[0]!.text).toContain('Confirmados (2): Ana Souza, Caio');

    sent = [];
    await call(event.PATCH, {
      method: 'PATCH',
      params: { eventId },
      body: { status: 'cancelled' },
    });
    await flushBackground();
    expect(sent.map((s) => s.to[0])).toEqual([caio.email]);
    expect(sent[0]!.subject).toBe('Encontro cancelado: Commander & pizza');
    const ics = Buffer.from(sent[0]!.attachments![0]!.content, 'base64').toString('utf8');
    expect(ics).toContain('STATUS:CANCELLED');
  });

  it('segue funcionando quando o Resend recusa um envio', async () => {
    fetchMock.mockImplementationOnce(async () =>
      Response.json({ message: 'domínio não verificado' }, { status: 403 }),
    );
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    asUser(ana);
    const res = await call(events.POST, {
      method: 'POST',
      params: { groupId },
      body: { title: 'Outro', startsAt: inDays(9, 22).toISOString() },
    });
    expect(res.status).toBe(201);
    await flushBackground();
    expect(error).toHaveBeenCalledWith(expect.stringContaining('403'));
    expect(sent).toHaveLength(1); // o segundo destinatário ainda recebe
    error.mockRestore();
  });
});

describe('a mesa fechou!', () => {
  it('avisa uma vez quando quatro jogadores coincidem no mesmo dia', async () => {
    const start = inDays(3, 21);
    const slot = (h: number) => ({
      startsAt: new Date(start.getTime() + h * HOUR).toISOString(),
      endsAt: new Date(start.getTime() + (h + 4) * HOUR).toISOString(),
    });
    for (const u of [ana, bia, caio]) {
      asUser(u);
      await call(availability.POST, { method: 'POST', params: { groupId }, body: slot(0) });
    }
    await flushBackground();
    expect(sent).toHaveLength(0); // só 3 jogadores: a mesa não fecha

    asUser(dani);
    await call(availability.POST, { method: 'POST', params: { groupId }, body: slot(0) });
    await flushBackground();
    expect(sent.map((s) => s.to[0]).sort()).toEqual([ana.email, bia.email, caio.email].sort());
    expect(sentTo(ana)[0]!.subject).toMatch(/^A mesa fechou!/);
    expect(sentTo(ana)[0]!.text).toContain('4 jogadores de Mesa <Commander>');
    expect(sentTo(bia)[0]!.subject).toMatch(/^The table is full!/);

    // Mais disponibilidade no mesmo dia não repete o aviso.
    sent = [];
    asUser(caio);
    await call(availability.POST, { method: 'POST', params: { groupId }, body: slot(5) });
    await flushBackground();
    expect(sent).toHaveLength(0);
  });
});

describe('lembretes (cron)', () => {
  it('exige o segredo e lembra uma única vez dos encontros das próximas 24h', async () => {
    const unauthorized = await cron.GET(new Request('http://localhost/api/cron/reminders'));
    expect(unauthorized.status).toBe(401);
    const wrong = await cron.GET(
      new Request('http://localhost/api/cron/reminders', {
        headers: { Authorization: 'Bearer outro-segredo-qualquer' },
      }),
    );
    expect(wrong.status).toBe(401);

    asUser(ana);
    await call(events.POST, {
      method: 'POST',
      params: { groupId },
      body: {
        title: 'Hoje tem',
        startsAt: new Date(Date.now() + 5 * HOUR).toISOString(),
        participantIds: [caio.id],
      },
    });
    sent = [];
    backgroundTasks.splice(0);

    const authorized = () =>
      cron.GET(
        new Request('http://localhost/api/cron/reminders', {
          headers: { Authorization: 'Bearer segredo-do-cron-123' },
        }),
      );
    const first = await authorized();
    expect(first.status).toBe(200);
    expect(await first.json()).toMatchObject({ events: 1, emails: 2 });
    expect(sent.map((s) => s.to[0]).sort()).toEqual([ana.email, caio.email].sort());
    expect(sentTo(caio)[0]!.subject).toMatch(/^Lembrete: Hoje tem — /);

    sent = [];
    expect(await (await authorized()).json()).toMatchObject({ events: 0, emails: 0 });
    expect(sent).toHaveLength(0);
  });
});
