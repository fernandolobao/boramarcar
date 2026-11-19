import { describe, expect, it } from 'vitest';
import { buildEventPush, buildStoreEventPush, buildStoreNoticePush, buildWindowPush } from './push';

const target = {
  userId: 'u1',
  token: 'ExponentPushToken[abcdefgh1]',
  locale: 'pt-BR',
  timeZone: 'America/Sao_Paulo',
};

describe('textos do push', () => {
  const event = {
    id: 'ev1',
    title: 'Commander de sexta',
    startsAt: new Date('2026-11-20T22:30:00Z'),
  };

  it('encontro novo no idioma e fuso de quem recebe, abrindo o encontro', () => {
    const message = buildEventPush(target, {
      kind: 'created',
      groupName: 'Mesa de Quinta',
      event,
      locationName: 'Casa da Ana',
    });
    expect(message.to).toBe(target.token);
    expect(message.title).toBe('Novo encontro em Mesa de Quinta');
    expect(message.body).toContain('Commander de sexta');
    expect(message.body).toContain('19:30');
    expect(message.data).toEqual({ url: '/encontros/ev1' });
  });

  it('lembrete em inglês, com o local ou "a definir"', () => {
    const message = buildEventPush(
      { ...target, locale: 'en', timeZone: 'Europe/Lisbon' },
      { kind: 'reminder', groupName: 'G', event, locationName: null },
    );
    expect(message.title).toBe('Reminder: Commander de sexta');
    expect(message.body).toContain('10:30');
    expect(message.body).toContain('Location TBD');
  });

  it('chamado para o próximo encontro, abrindo o encontro', () => {
    const message = buildEventPush(target, {
      kind: 'invite',
      groupName: 'Mesa de Quinta',
      event,
      locationName: 'Casa da Ana',
    });
    expect(message.title).toBe('Mesa de Quinta sente sua falta!');
    expect(message.body).toContain('Commander de sexta');
    expect(message.data).toEqual({ url: '/encontros/ev1' });
  });

  it('"a mesa fechou!" abre a disponibilidade', () => {
    const message = buildWindowPush(target, {
      groupName: 'Mesa de Quinta',
      start: new Date('2026-11-21T21:00:00Z'),
      players: 4,
    });
    expect(message.title).toBe('A mesa fechou em Mesa de Quinta!');
    expect(message.body).toContain('4 jogadores');
    expect(message.data).toEqual({ url: '/disponibilidade' });
  });
});

describe('push de loja seguida (10.4)', () => {
  it('evento novo: loja no título, evento e data no texto; abre o evento no app', () => {
    const msg = buildStoreEventPush(target, {
      storeName: 'Loja do Mago',
      event: { id: 'se1', title: 'Commander de sexta', startsAt: new Date('2026-11-27T22:00:00Z') },
    });
    expect(msg.title).toContain('Loja do Mago');
    expect(msg.body).toContain('Commander de sexta');
    expect(msg.data).toEqual({ url: '/eventos-loja/se1' });
  });

  it('aviso da loja: o texto inteiro; abre a loja no app', () => {
    const msg = buildStoreNoticePush(target, {
      storeName: 'Loja do Mago',
      slug: 'loja-do-mago',
      text: 'Chegou a coleção nova!',
    });
    expect(msg).toMatchObject({ title: 'Loja do Mago', body: 'Chegou a coleção nova!' });
    expect(msg.data).toEqual({ url: '/lojas/loja-do-mago' });
  });
});
