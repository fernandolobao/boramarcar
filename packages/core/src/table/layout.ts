/**
 * Disposição dos jogadores na tela, como nos contadores de mesa (Lotus): o celular fica deitado
 * no meio da mesa e cada área fica virada para quem está sentado daquele lado. A ordem dos
 * jogadores segue o sentido horário a partir do canto superior esquerdo.
 */
export interface TableLayout {
  areas: string;
  columns: number;
  /** Para cada jogador (na ordem da mesa): área da grade e rotação em graus. */
  seats: { area: string; rotate: 0 | 90 | 180 | 270 }[];
}

export function tableLayout(count: number): TableLayout {
  switch (count) {
    case 2:
      return {
        areas: '"a" "b"',
        columns: 1,
        seats: [
          { area: 'a', rotate: 180 },
          { area: 'b', rotate: 0 },
        ],
      };
    case 3:
      return {
        areas: '"a b" "c c"',
        columns: 2,
        seats: [
          { area: 'a', rotate: 90 },
          { area: 'b', rotate: 270 },
          { area: 'c', rotate: 0 },
        ],
      };
    case 4:
      return {
        areas: '"a b" "c d"',
        columns: 2,
        seats: [
          { area: 'a', rotate: 90 },
          { area: 'b', rotate: 270 },
          { area: 'd', rotate: 270 },
          { area: 'c', rotate: 90 },
        ],
      };
    case 5:
      return {
        areas: '"a b" "c d" "e e"',
        columns: 2,
        seats: [
          { area: 'a', rotate: 90 },
          { area: 'b', rotate: 270 },
          { area: 'd', rotate: 270 },
          { area: 'e', rotate: 0 },
          { area: 'c', rotate: 90 },
        ],
      };
    default:
      return {
        areas: '"a b" "c d" "e f"',
        columns: 2,
        seats: [
          { area: 'a', rotate: 90 },
          { area: 'b', rotate: 270 },
          { area: 'd', rotate: 270 },
          { area: 'f', rotate: 270 },
          { area: 'e', rotate: 90 },
          { area: 'c', rotate: 90 },
        ],
      };
  }
}

/** Cores das áreas (texto branco com contraste AA em todas). */
export const SEAT_COLORS = ['#5b21b6', '#1d4ed8', '#047857', '#b91c1c', '#b45309', '#0e7490'];

/**
 * A mesma disposição em linhas, para telas sem grade CSS (app): cada linha lista os índices dos
 * jogadores da esquerda para a direita.
 */
export function tableRows(count: number): number[][] {
  const layout = tableLayout(count);
  return [...layout.areas.matchAll(/"([^"]*)"/g)].map((match) =>
    [...new Set(match[1]!.trim().split(/\s+/))].map((area) =>
      layout.seats.findIndex((s) => s.area === area),
    ),
  );
}
