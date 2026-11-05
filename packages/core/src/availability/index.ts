import { DomainError } from '../errors';

/** Um intervalo em que um jogador pode jogar. */
export interface AvailabilitySlot {
  id?: string;
  userId: string;
  start: Date;
  end: Date;
  /** Locais aceitos pelo jogador nesse intervalo. Vazio = aceita qualquer local. */
  locationIds: readonly string[];
}

/** Janela em que jogadores suficientes estão disponíveis no mesmo local. */
export interface CommonWindow {
  start: Date;
  end: Date;
  durationMinutes: number;
  /** Ids dos jogadores disponíveis, ordenados. */
  userIds: string[];
  /** Local sugerido. `null` quando nenhum local foi cadastrado ("local a definir"). */
  locationId: string | null;
}

export interface FindCommonWindowsOptions {
  /** Mínimo de jogadores para uma mesa. Padrão: 4 (Commander). */
  minPlayers?: number;
  /** Duração mínima da janela em minutos. Padrão: 120. */
  minDurationMinutes?: number;
  /** Locais conhecidos do grupo (considerados mesmo que ninguém os tenha marcado). */
  locationIds?: readonly string[];
}

export const DEFAULT_MIN_PLAYERS = 4;
export const DEFAULT_MIN_DURATION_MINUTES = 120;

const MINUTE = 60_000;

export function assertValidSlot(slot: Pick<AvailabilitySlot, 'start' | 'end'>): void {
  if (Number.isNaN(slot.start.getTime()) || Number.isNaN(slot.end.getTime())) {
    throw new DomainError('invalid_input', 'Datas inválidas');
  }
  if (slot.end.getTime() <= slot.start.getTime()) {
    throw new DomainError('invalid_input', 'O fim deve ser depois do início');
  }
}

/**
 * Encontra janelas em que pelo menos `minPlayers` jogadores estão disponíveis ao mesmo
 * tempo e aceitam o mesmo local.
 *
 * Algoritmo (varredura de intervalos):
 * 1. Os limites de todos os intervalos dividem a linha do tempo em segmentos elementares.
 * 2. Em cada segmento, para cada local candidato, calculamos quem está disponível e aceita o local.
 * 3. Segmentos contíguos com o mesmo local e o mesmo conjunto de jogadores são unidos.
 * 4. Filtramos pela duração mínima e ordenamos (mais jogadores, mais longa, mais cedo).
 */
export function findCommonWindows(
  slots: readonly AvailabilitySlot[],
  options: FindCommonWindowsOptions = {},
): CommonWindow[] {
  const minPlayers = options.minPlayers ?? DEFAULT_MIN_PLAYERS;
  const minDuration = options.minDurationMinutes ?? DEFAULT_MIN_DURATION_MINUTES;
  if (minPlayers < 1) throw new DomainError('invalid_input', 'minPlayers deve ser >= 1');

  slots.forEach(assertValidSlot);
  if (slots.length === 0) return [];

  const candidateLocations = new Set<string>(options.locationIds ?? []);
  for (const slot of slots) slot.locationIds.forEach((id) => candidateLocations.add(id));
  const locations: (string | null)[] =
    candidateLocations.size > 0 ? [...candidateLocations].sort() : [null];

  const boundaries = [...new Set(slots.flatMap((s) => [s.start.getTime(), s.end.getTime()]))].sort(
    (a, b) => a - b,
  );

  const windows: CommonWindow[] = [];

  for (const location of locations) {
    let current: { start: number; end: number; key: string; userIds: string[] } | null = null;

    const flush = () => {
      if (current && (current.end - current.start) / MINUTE >= minDuration) {
        windows.push({
          start: new Date(current.start),
          end: new Date(current.end),
          durationMinutes: Math.round((current.end - current.start) / MINUTE),
          userIds: current.userIds,
          locationId: location,
        });
      }
      current = null;
    };

    for (let i = 0; i < boundaries.length - 1; i++) {
      const segStart = boundaries[i]!;
      const segEnd = boundaries[i + 1]!;

      const users = new Set<string>();
      for (const slot of slots) {
        const covers = slot.start.getTime() <= segStart && slot.end.getTime() >= segEnd;
        if (!covers) continue;
        const acceptsLocation =
          location === null || slot.locationIds.length === 0 || slot.locationIds.includes(location);
        if (acceptsLocation) users.add(slot.userId);
      }

      if (users.size < minPlayers) {
        flush();
        continue;
      }

      const userIds = [...users].sort();
      const key = userIds.join('|');
      if (current && current.key === key && current.end === segStart) {
        current.end = segEnd;
      } else {
        flush();
        current = { start: segStart, end: segEnd, key, userIds };
      }
    }
    flush();
  }

  return windows.sort(
    (a, b) =>
      b.userIds.length - a.userIds.length ||
      b.durationMinutes - a.durationMinutes ||
      a.start.getTime() - b.start.getTime() ||
      String(a.locationId).localeCompare(String(b.locationId)),
  );
}
