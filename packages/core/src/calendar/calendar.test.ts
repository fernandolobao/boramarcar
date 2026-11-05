import { describe, expect, it } from 'vitest';
import { buildIcs, escapeIcsText, foldIcsLine, slugify, whatsappShareUrl } from './index';

describe('buildIcs', () => {
  const base = {
    uid: 'evt-1@boramarcar',
    title: 'Commander; sábado, 4 jogadores',
    start: new Date('2026-11-14T22:30:00Z'),
  };

  it('gera um VEVENT válido com duração padrão', () => {
    const ics = buildIcs(base, new Date('2026-11-10T12:00:00Z'));
    expect(ics).toContain('BEGIN:VCALENDAR\r\nVERSION:2.0');
    expect(ics).toContain('UID:evt-1@boramarcar');
    expect(ics).toContain('DTSTAMP:20261110T120000Z');
    expect(ics).toContain('DTSTART:20261114T223000Z');
    expect(ics).toContain('DTEND:20261115T023000Z');
    expect(ics).toContain('SUMMARY:Commander\\; sábado\\, 4 jogadores');
    expect(ics).toContain('STATUS:CONFIRMED');
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics).not.toContain('LOCATION');
  });

  it('inclui local, descrição, url e cancelamento', () => {
    const ics = buildIcs({
      ...base,
      end: new Date('2026-11-15T01:00:00Z'),
      location: 'Casa da Ana, Rua 1',
      description: 'Levem os decks\nPizza depois',
      url: 'https://boramarcar.app/eventos/1',
      status: 'cancelled',
      sequence: 2,
    });
    expect(ics).toContain('DTEND:20261115T010000Z');
    expect(ics).toContain('LOCATION:Casa da Ana\\, Rua 1');
    expect(ics).toContain('DESCRIPTION:Levem os decks\\nPizza depois');
    expect(ics).toContain('URL:https://boramarcar.app/eventos/1');
    expect(ics).toContain('STATUS:CANCELLED');
    expect(ics).toContain('SEQUENCE:2');
  });
});

describe('helpers', () => {
  it('escapa texto', () => {
    expect(escapeIcsText('a\\b,c;d\ne')).toBe('a\\\\b\\,c\\;d\\ne');
  });

  it('dobra linhas longas sem quebrar caracteres multibyte', () => {
    const line = `SUMMARY:${'á'.repeat(80)}`;
    const folded = foldIcsLine(line);
    const parts = folded.split('\r\n ');
    expect(parts.length).toBeGreaterThan(1);
    expect(parts.join('')).toBe(line);
    for (const part of parts) expect(new TextEncoder().encode(part).length).toBeLessThanOrEqual(75);
    expect(foldIcsLine('curta')).toBe('curta');
  });

  it('gera link do WhatsApp', () => {
    expect(whatsappShareUrl('Bora jogar? 🃏 & tal')).toBe(
      'https://wa.me/?text=Bora%20jogar%3F%20%F0%9F%83%8F%20%26%20tal',
    );
  });

  it('gera slugs', () => {
    expect(slugify('Commander de Sábado!')).toBe('commander-de-sabado');
    expect(slugify('***')).toBe('evento');
  });
});
