import { describe, expect, it } from 'vitest';
import { buildEventEmail, buildRecapEmail } from './email';

describe('e-mail de encontro', () => {
  it('chamado para o próximo: assunto e texto com o grupo, no idioma de quem recebe', () => {
    const message = buildEventEmail(
      {
        name: 'Bia Souza',
        email: 'bia@example.test',
        locale: 'pt-BR',
        timeZone: 'America/Sao_Paulo',
      },
      {
        kind: 'invite',
        groupName: 'Mesa de Quinta',
        event: {
          id: 'ev1',
          title: 'Commander',
          startsAt: new Date('2026-11-20T22:30:00Z'),
          endsAt: null,
        },
        location: null,
        confirmed: ['Ana'],
      },
    );
    expect(message.subject).toContain('Mesa de Quinta sente sua falta: Commander');
    expect(message.text).toContain('te chamou para o próximo encontro');
    expect(message.text).toContain('/eventos/ev1');
  });
});

describe('e-mail do resumo da noite', () => {
  it('dá as boas-vindas a quem estreou no grupo', () => {
    const message = buildRecapEmail(
      { name: 'Ana', email: 'ana@example.test', locale: 'pt-BR', timeZone: 'America/Sao_Paulo' },
      {
        groupName: 'Mesa de Quinta',
        recap: {
          eventId: 'ev1',
          title: 'Commander',
          startsAt: new Date('2026-11-20T22:30:00Z'),
          games: [
            {
              number: 1,
              format: 'commander',
              players: [{ name: 'Caio', commanders: [], result: 'win' }],
              winners: ['Caio'],
            },
          ],
          standings: [{ name: 'Caio', wins: 1, games: 1 }],
          artUri: null,
          debuts: ['Caio', 'Duda'],
        },
      },
    );
    expect(message.text).toContain('Primeira partida com o grupo: Caio e Duda. Boas-vindas!');
  });
});
