import type { AchievementId } from '../achievements';
import type { GameResult } from '../ranking';

/**
 * Notificações dentro do site e do app (central com o sino). Guardam só dados (quem, qual
 * partida); o texto é montado no idioma de quem lê, e nomes de pessoas são lidos na hora (quem
 * excluiu a conta aparece anonimizado).
 */
export const NOTIFICATION_KINDS = [
  'game',
  'group_game',
  'achievement',
  'podium',
  'announcement',
  'nudge',
] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export type NotificationData =
  /** Partida em que a pessoa jogou (registrada por outra pessoa). */
  | {
      kind: 'game';
      gameId: string;
      eventId: string;
      result: GameResult;
      winnerIds: string[];
    }
  /** Partida no grupo em que a pessoa não jogou. */
  | { kind: 'group_game'; gameId: string; eventId: string; winnerIds: string[] }
  /** Conquista nova. */
  | { kind: 'achievement'; achievementId: AchievementId }
  /** Pódio do grupo mudou (1º, 2º, 3º em ordem). */
  | { kind: 'podium'; userIds: string[] }
  /** Aviso da administração do ArcanaKin (ou as novidades da semana). */
  | { kind: 'announcement'; announcementId: string }
  /** "Chamar para o próximo": a pessoa foi chamada para um encontro. */
  | { kind: 'nudge'; eventId: string };
