import { describe, expect, it } from 'vitest';
import { DomainError } from '../errors';
import { findCommonWindows, type AvailabilitySlot } from './index';

const at = (time: string) => new Date(`2026-11-14T${time}:00-03:00`);
const slot = (
  userId: string,
  start: string,
  end: string,
  locationIds: string[] = [],
): AvailabilitySlot => ({ userId, start: at(start), end: at(end), locationIds });

describe('findCommonWindows', () => {
  it('retorna vazio sem disponibilidades', () => {
    expect(findCommonWindows([])).toEqual([]);
  });

  it('encontra a interseção de 4 jogadores', () => {
    const windows = findCommonWindows([
      slot('ana', '14:00', '22:00'),
      slot('bia', '15:00', '20:00'),
      slot('caio', '13:00', '19:00'),
      slot('duda', '16:00', '23:00'),
    ]);
    expect(windows).toHaveLength(1);
    expect(windows[0]).toMatchObject({
      start: at('16:00'),
      end: at('19:00'),
      durationMinutes: 180,
      userIds: ['ana', 'bia', 'caio', 'duda'],
      locationId: null,
    });
  });

  it('ignora janelas mais curtas que a duração mínima', () => {
    const windows = findCommonWindows(
      [
        slot('a', '14:00', '15:00'),
        slot('b', '14:00', '15:00'),
        slot('c', '14:00', '15:00'),
        slot('d', '14:00', '15:00'),
      ],
      { minDurationMinutes: 90 },
    );
    expect(windows).toEqual([]);
  });

  it('respeita o número mínimo de jogadores', () => {
    const slots = [
      slot('a', '14:00', '18:00'),
      slot('b', '14:00', '18:00'),
      slot('c', '14:00', '18:00'),
    ];
    expect(findCommonWindows(slots)).toEqual([]);
    expect(findCommonWindows(slots, { minPlayers: 3 })).toHaveLength(1);
  });

  it('separa janelas por local e considera "qualquer local"', () => {
    const windows = findCommonWindows(
      [
        slot('a', '14:00', '20:00', ['casa-ana']),
        slot('b', '14:00', '20:00', ['loja']),
        slot('c', '14:00', '20:00'),
        slot('d', '14:00', '20:00'),
        slot('e', '14:00', '20:00', ['casa-ana', 'loja']),
      ],
      { minPlayers: 4 },
    );
    expect(windows.map((w) => [w.locationId, w.userIds])).toEqual([
      ['casa-ana', ['a', 'c', 'd', 'e']],
      ['loja', ['b', 'c', 'd', 'e']],
    ]);
  });

  it('une segmentos contíguos e divide quando o grupo muda', () => {
    const windows = findCommonWindows(
      [
        slot('a', '10:00', '18:00'),
        slot('b', '10:00', '18:00'),
        slot('c', '10:00', '18:00'),
        slot('d', '10:00', '14:00'),
        slot('e', '14:00', '18:00'),
      ],
      { minDurationMinutes: 60 },
    );
    expect(windows).toHaveLength(2);
    expect(windows.map((w) => w.userIds.join(''))).toEqual(['abcd', 'abce']);
  });

  it('ordena por número de jogadores e duração', () => {
    const windows = findCommonWindows(
      [
        slot('a', '10:00', '22:00'),
        slot('b', '10:00', '22:00'),
        slot('c', '10:00', '22:00'),
        slot('d', '10:00', '13:00'),
        slot('e', '18:00', '22:00'),
        slot('d', '18:00', '22:00'),
      ],
      { minDurationMinutes: 60 },
    );
    expect(windows[0]?.userIds).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(windows[1]?.durationMinutes).toBe(180);
  });

  it('rejeita intervalos inválidos', () => {
    expect(() => findCommonWindows([slot('a', '18:00', '14:00')])).toThrow(DomainError);
  });
});

describe('windowNotificationKey', () => {
  it('agrupa por dia local e local', async () => {
    const { windowNotificationKey } = await import('./index');
    expect(
      windowNotificationKey(
        { start: new Date('2026-11-15T01:00:00Z'), locationId: null },
        'America/Sao_Paulo',
      ),
    ).toBe('2026-11-14|tbd');
    expect(
      windowNotificationKey({ start: new Date('2026-11-15T01:00:00Z'), locationId: 'casa' }, 'UTC'),
    ).toBe('2026-11-15|casa');
  });
});
