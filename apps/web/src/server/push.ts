import 'server-only';
import { sendPush, type PushMessage } from '@boramarcar/core/push';
import { forgetPushTokens, type Database, type PushTarget } from '@boramarcar/db';
import { createFormatter, createTranslator } from 'next-intl';
import { getEnv } from '@/env';
import { DEFAULT_LOCALE, isLocale, type Locale } from '@/i18n/config';
import en from '../../messages/en.json';
import ptBR from '../../messages/pt-BR.json';
import type { EventEmailKind } from './email';

const MESSAGES = { 'pt-BR': ptBR, en } as const;

function tools(target: Pick<PushTarget, 'locale' | 'timeZone'>) {
  const locale: Locale = isLocale(target.locale) ? target.locale : DEFAULT_LOCALE;
  return {
    t: createTranslator({ locale, messages: MESSAGES[locale], namespace: 'push' }),
    tc: createTranslator({ locale, messages: MESSAGES[locale], namespace: 'common' }),
    format: createFormatter({ locale, timeZone: target.timeZone }),
  };
}

const SHORT_WHEN = {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
} as const;

export interface EventPushData {
  kind: EventEmailKind;
  groupName: string;
  event: { id: string; title: string; startsAt: Date };
  locationName: string | null;
}

/** Push de encontro (novo, alterado, cancelado ou lembrete), curto, no idioma e fuso de quem recebe. */
export function buildEventPush(target: PushTarget, data: EventPushData): PushMessage {
  const { t, tc, format } = tools(target);
  const values = {
    group: data.groupName,
    title: data.event.title,
    when: format.dateTime(data.event.startsAt, SHORT_WHEN),
    where: data.locationName ?? tc('locationTbd'),
  };
  return {
    to: target.token,
    title: t(`${data.kind}.title`, values),
    body: t(`${data.kind}.body`, values),
    // O app abre o encontro ao tocar.
    data: { url: `/encontros/${data.event.id}` },
  };
}

export interface WindowPushData {
  groupName: string;
  start: Date;
  players: number;
}

/** Push "a mesa fechou!": abre a disponibilidade no app. */
export function buildWindowPush(target: PushTarget, data: WindowPushData): PushMessage {
  const { t, format } = tools(target);
  const values = {
    group: data.groupName,
    count: data.players,
    when: format.dateTime(data.start, SHORT_WHEN),
  };
  return {
    to: target.token,
    title: t('window.title', values),
    body: t('window.body', values),
    data: { url: '/disponibilidade' },
  };
}

/**
 * Envia pelo Expo Push e apaga os tokens que não existem mais. `PUSH_NOTIFICATIONS=off`
 * desliga; erros vão para o log e não afetam a ação de quem disparou o aviso.
 */
export async function deliverPush(db: Database, messages: PushMessage[]) {
  if (messages.length === 0) return null;
  const env = getEnv();
  if (env.PUSH_NOTIFICATIONS === 'off') return null;
  const result = await sendPush(messages, {
    fetch: (input, init) => fetch(input, init),
    accessToken: env.EXPO_ACCESS_TOKEN,
  });
  if (result.invalidTokens.length) await forgetPushTokens(db, result.invalidTokens);
  if (result.failed) console.error(`[push] ${result.failed} de ${messages.length} não enviado(s)`);
  return result;
}

/** Push do resumo da noite: abre o encontro no app. */
export function buildRecapPush(
  target: PushTarget,
  data: {
    eventId: string;
    title: string;
    games: number;
    top: { name: string; wins: number } | null;
  },
): PushMessage {
  const { t } = tools(target);
  return {
    to: target.token,
    title: t('recap.title', { title: data.title }),
    body:
      data.top && data.top.wins > 0
        ? t('recap.body', { name: data.top.name, wins: data.top.wins, count: data.games })
        : t('recap.bodyDraw', { count: data.games }),
    data: { url: `/encontros/${data.eventId}` },
  };
}
