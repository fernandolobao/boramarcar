import 'server-only';
import { getProductMetrics, type Database, type ProductMetrics } from '@boramarcar/db';
import { escapeHtml } from '@boramarcar/core/email';
import { adminEmails, getBaseUrl } from '@/env';
import { deliverEmails } from './email';

/** Texto do resumo semanal (só números agregados). */
export function metricsSummary(m: ProductMetrics) {
  return [
    `Métrica norte: ${m.activeGroups} de ${m.totalGroups} grupos com partida registrada nos últimos ${m.windowDays} dias.`,
    `Retenção: ${m.retention.retained} de ${m.retention.previous} grupos ativos no período anterior continuam ativos.`,
    `Grupos novos: ${m.newGroups.count} (com 3+ pessoas: ${m.newGroups.withThreeMembers}; com encontro: ${m.newGroups.withEvent}). Entradas por convite: ${m.invites.joins}.`,
    `Encontros: ${m.events.held} aconteceram, ${m.events.tableFilled} fecharam a mesa, ${m.events.withGame} viraram partida. Participações com deck: ${m.games.withDeck} de ${m.games.playerSlots}.`,
    `Pessoas: ${m.users.total} contas (${m.users.new} novas), ${m.users.withAvailability} com disponibilidade. Decks importados: ${m.decks.new}. Feedback: ${m.feedback}.`,
  ];
}

/** Resumo semanal para ADMIN_EMAILS (cron de segunda). */
export async function sendMetricsEmail(db: Database, now = new Date()) {
  const to = adminEmails();
  if (to.length === 0) return [];
  const lines = metricsSummary(await getProductMetrics(db, now));
  const link = `${getBaseUrl()}/admin`;
  return deliverEmails(
    to.map((address) => ({
      to: address,
      subject: 'ArcanaKin: resumo semanal do beta',
      text: [...lines, '', link].join('\n'),
      html: `<div style="font-family:system-ui,sans-serif;line-height:1.5">${lines
        .map((l) => `<p style="margin:0 0 8px">${escapeHtml(l)}</p>`)
        .join('')}<p><a href="${escapeHtml(link)}">${escapeHtml(link)}</a></p></div>`,
    })),
  );
}
