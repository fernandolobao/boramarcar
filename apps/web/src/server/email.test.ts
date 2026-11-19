import { describe, expect, it } from 'vitest';
import { buildEventEmail, buildRecapEmail, buildStoreInviteEmail } from './email';

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

describe('e-mail de convite da loja (10.1)', () => {
  it('dono: assunto com a loja, link do convite, prazo e o aviso de que vale só para este e-mail', () => {
    const msg = buildStoreInviteEmail('dono@loja.test', {
      storeName: 'Loja do Mago',
      role: 'owner',
      token: 'abc123',
      days: 14,
    });
    expect(msg.to).toBe('dono@loja.test');
    expect(msg.subject).toBe('Loja do Mago no ArcanaKin: seu convite');
    expect(msg.html).toContain('/loja/convite/abc123');
    expect(msg.text).toMatch(/14 dias/);
    expect(msg.text).toMatch(/dono@loja\.test/);
  });

  it('equipe: texto de quem vai ajudar a cuidar do perfil', () => {
    const msg = buildStoreInviteEmail('aj@loja.test', {
      storeName: 'Loja do Mago',
      role: 'staff',
      token: 't',
      days: 14,
    });
    expect(msg.text).toMatch(/equipe/);
  });
});
