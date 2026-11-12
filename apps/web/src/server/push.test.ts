import { describe, expect, it } from 'vitest';
import { buildEventPush, buildWindowPush } from './push';

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
