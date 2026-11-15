import { describe, expect, it } from 'vitest';
import { buildEventEmail } from './email';

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
