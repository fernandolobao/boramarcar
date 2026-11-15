/**
 * Disposição dos jogadores na tela, como nos contadores de mesa (Lotus): o celular fica deitado
 * no meio da mesa e cada área fica virada para quem está sentado daquele lado. A ordem dos
 * jogadores segue o sentido horário a partir do canto superior esquerdo.
 */
export type SeatRotation = 0 | 90 | 180 | 270;

export interface TableLayout {
  /** Identificador estável (guardado no estado da mesa). */
  id: string;
  areas: string;
  columns: number;
  /** Para cada jogador (na ordem da mesa): área da grade e rotação em graus. */
  seats: { area: string; rotate: SeatRotation }[];
}

/**
 * Lados da mesa vistos pelo aparelho deitado no meio: quem está em cima lê de cabeça para baixo
 * (180°), à direita 270°, embaixo 0° e à esquerda 90°.
 */
const TOP = 180;
const RIGHT = 270;
const BOTTOM = 0;
const LEFT = 90;

/**
 * Disposições por número de jogadores, como nos contadores de mesa (Lotus): a primeira é a padrão.
 * Os assentos seguem o sentido horário a partir do canto superior esquerdo.
 */
const LAYOUTS: Record<number, TableLayout[]> = {
  2: [
    {
      id: '2-face',
      areas: '"a" "b"',
      columns: 1,
      seats: [
        { area: 'a', rotate: TOP },
        { area: 'b', rotate: BOTTOM },
      ],
    },
    {
      id: '2-sides',
      areas: '"a b"',
      columns: 2,
      seats: [
        { area: 'a', rotate: LEFT },
        { area: 'b', rotate: RIGHT },
      ],
    },
    {
      id: '2-same',
      areas: '"a" "b"',
      columns: 1,
      seats: [
        { area: 'a', rotate: BOTTOM },
        { area: 'b', rotate: BOTTOM },
      ],
    },
  ],
  3: [
    {
      id: '3-sides-bottom',
      areas: '"a b" "c c"',
      columns: 2,
      seats: [
        { area: 'a', rotate: LEFT },
        { area: 'b', rotate: RIGHT },
        { area: 'c', rotate: BOTTOM },
      ],
    },
    {
      id: '3-top-bottom',
      areas: '"a a" "b c"',
      columns: 2,
      seats: [
        { area: 'a', rotate: TOP },
        { area: 'c', rotate: BOTTOM },
        { area: 'b', rotate: BOTTOM },
      ],
    },
    {
      id: '3-top-sides',
      areas: '"a a" "b c"',
      columns: 2,
      seats: [
        { area: 'a', rotate: TOP },
        { area: 'c', rotate: RIGHT },
        { area: 'b', rotate: LEFT },
      ],
    },
  ],
  4: [
    {
      id: '4-sides',
      areas: '"a b" "c d"',
      columns: 2,
      seats: [
        { area: 'a', rotate: LEFT },
        { area: 'b', rotate: RIGHT },
        { area: 'd', rotate: RIGHT },
        { area: 'c', rotate: LEFT },
      ],
    },
    {
      id: '4-cross',
      areas: '"a a" "b c" "d d"',
      columns: 2,
      seats: [
        { area: 'a', rotate: TOP },
        { area: 'c', rotate: RIGHT },
        { area: 'd', rotate: BOTTOM },
        { area: 'b', rotate: LEFT },
      ],
    },
    {
      id: '4-long-sides',
      areas: '"a b" "c d"',
      columns: 2,
      seats: [
        { area: 'a', rotate: TOP },
        { area: 'b', rotate: TOP },
        { area: 'd', rotate: BOTTOM },
        { area: 'c', rotate: BOTTOM },
      ],
    },
  ],
  5: [
    {
      id: '5-sides-bottom',
      areas: '"a b" "c d" "e e"',
      columns: 2,
      seats: [
        { area: 'a', rotate: LEFT },
        { area: 'b', rotate: RIGHT },
        { area: 'd', rotate: RIGHT },
        { area: 'e', rotate: BOTTOM },
        { area: 'c', rotate: LEFT },
      ],
    },
    {
      id: '5-top-sides',
      areas: '"a a" "b c" "d e"',
      columns: 2,
      seats: [
        { area: 'a', rotate: TOP },
        { area: 'c', rotate: RIGHT },
        { area: 'e', rotate: RIGHT },
        { area: 'd', rotate: LEFT },
        { area: 'b', rotate: LEFT },
      ],
    },
  ],
  6: [
    {
      id: '6-sides',
      areas: '"a b" "c d" "e f"',
      columns: 2,
      seats: [
        { area: 'a', rotate: LEFT },
        { area: 'b', rotate: RIGHT },
        { area: 'd', rotate: RIGHT },
        { area: 'f', rotate: RIGHT },
        { area: 'e', rotate: LEFT },
        { area: 'c', rotate: LEFT },
      ],
    },
    {
      id: '6-ends-sides',
      areas: '"a a" "b c" "d e" "f f"',
      columns: 2,
      seats: [
        { area: 'a', rotate: TOP },
        { area: 'c', rotate: RIGHT },
        { area: 'e', rotate: RIGHT },
        { area: 'f', rotate: BOTTOM },
        { area: 'd', rotate: LEFT },
        { area: 'b', rotate: LEFT },
      ],
    },
    {
      id: '6-long-sides',
      areas: '"a b c" "d e f"',
      columns: 3,
      seats: [
        { area: 'a', rotate: TOP },
        { area: 'b', rotate: TOP },
        { area: 'c', rotate: TOP },
        { area: 'f', rotate: BOTTOM },
        { area: 'e', rotate: BOTTOM },
        { area: 'd', rotate: BOTTOM },
      ],
    },
  ],
};

const clampCount = (count: number) => Math.max(2, Math.min(6, count));

/** Disposições possíveis para este número de jogadores (a primeira é a padrão). */
export function tableLayouts(count: number): TableLayout[] {
  return LAYOUTS[clampCount(count)]!;
}

/**
 * Disposição da mesa: a escolhida (`layoutId`), ou a padrão; `rotations` gira assentos individuais
 * (por posição na mesa) por cima da disposição.
 */
export function tableLayout(
  count: number,
  layoutId?: string | null,
  rotations?: Readonly<Record<number, SeatRotation>> | null,
): TableLayout {
  const options = tableLayouts(count);
  const base = options.find((l) => l.id === layoutId) ?? options[0]!;
  if (!rotations || Object.keys(rotations).length === 0) return base;
  return {
    ...base,
    seats: base.seats.map((seat, i) => ({ ...seat, rotate: rotations[i] ?? seat.rotate })),
  };
}

/**
 * Gesto na área de um jogador, do ponto de vista dele (a área está girada): projeta o movimento na
 * tela nas direções "para cima" e "para o lado" do jogador. Só conta como para cima/baixo se passar
 * de `min` e for mais vertical que horizontal para quem está sentado ali.
 */
export function seatSwipe(
  dx: number,
  dy: number,
  rotate: SeatRotation,
  min = 48,
): 'up' | 'down' | null {
  const r = (rotate * Math.PI) / 180;
  const up = dx * Math.sin(r) - dy * Math.cos(r);
  const side = dx * Math.cos(r) + dy * Math.sin(r);
  if (Math.abs(up) < min || Math.abs(up) <= Math.abs(side)) return null;
  return up > 0 ? 'up' : 'down';
}

/** Próxima rotação no sentido horário (para "girar minha área"). */
export const nextRotation = (rotate: SeatRotation): SeatRotation =>
  ((rotate + 90) % 360) as SeatRotation;

/** Cores das áreas (texto branco com contraste AA em todas). */
export const SEAT_COLORS = ['#5b21b6', '#1d4ed8', '#047857', '#b91c1c', '#b45309', '#0e7490'];

/**
 * A mesma disposição em linhas, para telas sem grade CSS (app): cada linha lista os índices dos
 * jogadores da esquerda para a direita.
 */
export function tableRows(count: number, layout: TableLayout = tableLayout(count)): number[][] {
  return [...layout.areas.matchAll(/"([^"]*)"/g)].map((match) =>
    [...new Set(match[1]!.trim().split(/\s+/))].map((area) =>
      layout.seats.findIndex((s) => s.area === area),
    ),
  );
}
