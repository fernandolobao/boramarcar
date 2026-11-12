import 'server-only';
import { escapeHtml, sendEmails, type EmailMessage } from '@boramarcar/core/email';
import { palette, themes } from '@boramarcar/tokens';
import { createFormatter, createTranslator } from 'next-intl';
import { getBaseUrl, getEnv } from '@/env';
import { DEFAULT_LOCALE, isLocale, type Locale } from '@/i18n/config';
import en from '../../messages/en.json';
import ptBR from '../../messages/pt-BR.json';

const MESSAGES = { 'pt-BR': ptBR, en } as const;

/** Cores do e-mail: tema claro dos tokens (a maioria dos clientes de e-mail não troca o tema). */
const colors = themes.light;
const APP_NAME = ptBR.common.appName;

export interface EmailRecipient {
  name: string;
  email: string;
  locale: string | null;
  timeZone: string;
}

export type EventEmailKind = 'created' | 'updated' | 'cancelled' | 'reminder';

export interface EventEmailData {
  kind: EventEmailKind;
  groupName: string;
  event: {
    id: string;
    title: string;
    startsAt: Date;
    endsAt: Date | null;
  };
  location: { name: string; address: string | null } | null;
  confirmed: string[];
  ics?: { filename: string; content: string };
}

export interface WindowEmailData {
  groupName: string;
  start: Date;
  end: Date;
  locationName: string | null;
  players: string[];
}

function tools(recipient: EmailRecipient) {
  const locale: Locale = isLocale(recipient.locale) ? recipient.locale : DEFAULT_LOCALE;
  const messages = MESSAGES[locale];
  return {
    locale,
    t: createTranslator({ locale, messages, namespace: 'email' }),
    tc: createTranslator({ locale, messages, namespace: 'common' }),
    format: createFormatter({ locale, timeZone: recipient.timeZone }),
  };
}

const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;

interface Layout {
  locale: Locale;
  subject: string;
  greeting: string;
  intro: string;
  lines: string[];
  cta?: { label: string; url: string };
  note?: string;
  footer: string;
}

/** Monta HTML simples (com texto escapado) e a versão em texto puro do mesmo conteúdo. */
function render(layout: Layout): Pick<EmailMessage, 'subject' | 'html' | 'text'> {
  const p = (text: string, style = '') =>
    `<p style="margin:0 0 12px;${style}">${escapeHtml(text)}</p>`;
  const html = [
    `<!doctype html><html lang="${layout.locale}"><head><meta charset="utf-8"><title>${escapeHtml(layout.subject)}</title></head><body style="margin:0;background:${colors.canvas}">`,
    `<div style="max-width:560px;margin:0 auto;padding:24px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:16px;line-height:1.5;color:${colors.fg};background:${colors.surface}">`,
    // Nome da marca em texto (imagem e SVG são bloqueados por muitos clientes de e-mail).
    `<p style="margin:0 0 20px;font-size:20px;font-weight:800;letter-spacing:0.06em;text-transform:uppercase;color:${palette.arcano}">${escapeHtml(APP_NAME)}</p>`,
    p(layout.greeting),
    p(layout.intro),
    ...layout.lines.map((line) => p(line, 'font-weight:600')),
    layout.cta
      ? `<p style="margin:20px 0"><a href="${escapeHtml(layout.cta.url)}" style="display:inline-block;padding:10px 16px;border-radius:8px;background:${colors.primaryHover};color:${colors.onPrimary};text-decoration:none;font-weight:600">${escapeHtml(layout.cta.label)}</a></p>`
      : '',
    layout.note ? p(layout.note, `color:${colors.fgMuted};font-size:14px`) : '',
    `<hr style="border:none;border-top:1px solid ${colors.line};margin:20px 0">`,
    p(layout.footer, `color:${colors.fgMuted};font-size:13px`),
    '</div></body></html>',
  ].join('');
  const text = [
    layout.greeting,
    '',
    layout.intro,
    '',
    ...layout.lines,
    ...(layout.cta ? ['', `${layout.cta.label}: ${layout.cta.url}`] : []),
    ...(layout.note ? ['', layout.note] : []),
    '',
    '—',
    layout.footer,
  ].join('\n');
  return { subject: layout.subject, html, text };
}

const profileUrl = () => `${getBaseUrl()}/configuracoes`;

/** E-mail de encontro (novo, alterado, cancelado ou lembrete) no idioma e fuso de quem recebe. */
export function buildEventEmail(recipient: EmailRecipient, data: EventEmailData): EmailMessage {
  const { locale, t, tc, format } = tools(recipient);
  const { event } = data;
  const when = event.endsAt
    ? format.dateTimeRange(event.startsAt, event.endsAt, { dateStyle: 'full', timeStyle: 'short' })
    : format.dateTime(event.startsAt, { dateStyle: 'full', timeStyle: 'short' });
  const shortWhen = format.dateTime(event.startsAt, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
  const where = data.location
    ? [data.location.name, data.location.address].filter(Boolean).join(' — ')
    : tc('locationTbd');
  const cancelled = data.kind === 'cancelled';

  const rendered = render({
    locale,
    subject: t(`${data.kind}.subject`, { title: event.title, when: shortWhen }),
    greeting: t('greeting', { name: firstName(recipient.name) }),
    intro: t(`${data.kind}.intro`, { group: data.groupName }),
    lines: [
      event.title,
      t('when', { when }),
      t('where', { where }),
      ...(data.confirmed.length && !cancelled
        ? [t('confirmed', { count: data.confirmed.length, names: data.confirmed.join(', ') })]
        : []),
    ],
    cta: { label: t('openEvent'), url: `${getBaseUrl()}/eventos/${event.id}` },
    note: data.ics ? t('calendarHint') : undefined,
    footer: t('footer', { group: data.groupName, url: profileUrl() }),
  });
  return {
    to: recipient.email,
    ...rendered,
    attachments: data.ics
      ? [{ ...data.ics, contentType: 'text/calendar; charset=utf-8' }]
      : undefined,
  };
}

/** E-mail "a mesa fechou!": jogadores suficientes livres no mesmo horário. */
export function buildWindowEmail(recipient: EmailRecipient, data: WindowEmailData): EmailMessage {
  const { locale, t, tc, format } = tools(recipient);
  const when = format.dateTimeRange(data.start, data.end, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
  const shortWhen = format.dateTime(data.start, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  return {
    to: recipient.email,
    ...render({
      locale,
      subject: t('window.subject', { when: shortWhen }),
      greeting: t('greeting', { name: firstName(recipient.name) }),
      intro: t('window.intro', { count: data.players.length, group: data.groupName }),
      lines: [
        t('when', { when }),
        t('where', { where: data.locationName ?? tc('locationTbd') }),
        t('window.players', { names: data.players.join(', ') }),
      ],
      cta: { label: t('window.cta'), url: `${getBaseUrl()}/disponibilidade` },
      footer: t('footer', { group: data.groupName, url: profileUrl() }),
    }),
  };
}

/**
 * Entrega os e-mails pelo Resend. Sem RESEND_API_KEY (dev, testes, previews), só registra no log.
 * Falhas são registradas e não interrompem quem chamou: avisos são "melhor esforço".
 */
export async function deliverEmails(messages: EmailMessage[]) {
  if (messages.length === 0) return [];
  const env = getEnv();
  if (!env.RESEND_API_KEY) {
    console.warn(`[email] RESEND_API_KEY ausente; ${messages.length} e-mail(s) não enviado(s).`);
    return [];
  }
  const results = await sendEmails(messages, {
    apiKey: env.RESEND_API_KEY,
    from: env.EMAIL_FROM,
    fetch: (input, init) => fetch(input, init),
  });
  for (const r of results.filter((r) => !r.ok)) {
    console.error(`[email] falha ao enviar: ${r.error}`);
  }
  return results;
}

/** Boas-vindas ao beta (8.5): o que é, até quando vai e como mandar feedback. */
export function buildBetaWelcomeEmail(
  recipient: EmailRecipient,
  data: { groupName: string; endsAt: Date; weeks: number },
): EmailMessage {
  const { locale, t, format } = tools(recipient);
  const until = format.dateTime(data.endsAt, { day: 'numeric', month: 'long' });
  return {
    to: recipient.email,
    ...render({
      locale,
      subject: t('beta.subject', { group: data.groupName }),
      greeting: t('greeting', { name: firstName(recipient.name) }),
      intro: t('beta.intro', { group: data.groupName, weeks: data.weeks, until }),
      lines: [t('beta.use'), t('beta.feedback')],
      cta: { label: t('beta.cta'), url: `${getBaseUrl()}/feedback?de=/painel` },
      note: t('beta.note'),
      footer: t('footer', { group: data.groupName, url: profileUrl() }),
    }),
  };
}
