/**
 * Registro de atividade (aba "Atividade" do Admin): as ações principais de cada pessoa, agrupadas
 * por pessoa × ação × alvo × hora (uma linha com a contagem, não uma por carta), guardadas por
 * 90 dias. Sem IP e sem conteúdo (só o nome do deck, para a frase ficar legível).
 */
export const ACTIVITY_KINDS = [
  'login',
  'deck_created',
  'deck_imported',
  'deck_updated',
  'deck_published',
  'deck_deleted',
  'collection_added',
  'collection_removed',
  'availability_changed',
  'event_created',
  'rsvp',
  'game_recorded',
  'group_created',
  'group_joined',
] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

export const isActivityKind = (value: string): value is ActivityKind =>
  (ACTIVITY_KINDS as readonly string[]).includes(value);

export const ACTIVITY_RETENTION_DAYS = 90;

export const ACTIVITY_PERIODS = ['24h', '7d', '30d', '90d'] as const;
export type ActivityPeriod = (typeof ACTIVITY_PERIODS)[number];

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const PERIOD_MS: Record<ActivityPeriod, number> = {
  '24h': DAY,
  '7d': 7 * DAY,
  '30d': 30 * DAY,
  '90d': 90 * DAY,
};

/** Hora cheia (UTC) do momento: a chave de agrupamento. */
export const activityBucket = (at: Date) => new Date(Math.floor(at.getTime() / HOUR) * HOUR);

/** Início da janela do filtro. */
export const activitySince = (now: Date, period: ActivityPeriod) =>
  new Date(now.getTime() - PERIOD_MS[period]);

/** De onde veio a entrada, pelo navegador da sessão (que não é guardado): app ou site. */
export const loginPlatform = (userAgent: string | null | undefined): 'app' | 'site' =>
  /Expo|okhttp|CFNetwork|Darwin|ReactNative/i.test(userAgent ?? '') ? 'app' : 'site';
