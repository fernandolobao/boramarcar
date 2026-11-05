import { describe, expect, it } from 'vitest';
import { eventChangeKind, type EventSnapshot } from './notify';

const base: EventSnapshot = {
  title: 'Commander',
  startsAt: new Date('2026-11-20T22:00:00Z'),
  endsAt: null,
  locationId: 'loc-1',
  status: 'scheduled',
};

describe('eventChangeKind', () => {
  it('ignora edições sem mudança e encontros finalizados', () => {
    expect(eventChangeKind(base, { ...base, startsAt: new Date(base.startsAt) })).toBeNull();
    expect(eventChangeKind(base, { ...base, status: 'finished' })).toBeNull();
  });

  it('detecta mudanças de título, horário, local e reabertura', () => {
    expect(eventChangeKind(base, { ...base, title: 'Outro' })).toBe('updated');
    expect(eventChangeKind(base, { ...base, endsAt: new Date('2026-11-21T02:00:00Z') })).toBe(
      'updated',
    );
    expect(eventChangeKind(base, { ...base, locationId: null })).toBe('updated');
    expect(eventChangeKind({ ...base, status: 'cancelled' }, base)).toBe('updated');
  });

  it('avisa do cancelamento só uma vez', () => {
    expect(eventChangeKind(base, { ...base, status: 'cancelled' })).toBe('cancelled');
    expect(
      eventChangeKind({ ...base, status: 'cancelled' }, { ...base, status: 'cancelled' }),
    ).toBeNull();
  });
});
