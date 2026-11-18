import 'server-only';
import { CHANGELOG } from '@boramarcar/core/changelog';
import { escapeHtml } from '@boramarcar/core/email';
import { createChangelogDraft, type Database } from '@boramarcar/db';
import { adminEmails, getBaseUrl } from '@/env';
import { deliverEmails } from './email';

/**
 * Novidades da semana (cron de segunda): cria o rascunho com as entradas novas do arquivo de
 * novidades e avisa os admins por e-mail para revisar e publicar no `/admin`. Nada é publicado
 * sem aprovação.
 */
export async function draftWeeklyNews(db: Database, now = new Date()) {
  const draft = await createChangelogDraft(db, { entries: CHANGELOG, now });
  if (!draft) return { drafted: false, emails: 0 };
  const to = adminEmails();
  const link = `${getBaseUrl()}/admin`;
  const intro = 'As novidades da semana estão prontas para revisar. Edite se quiser e publique:';
  const sent = to.length
    ? await deliverEmails(
        to.map((address) => ({
          to: address,
          subject: 'ArcanaKin: novidades da semana para revisar',
          text: [intro, '', draft.body, '', link].join('\n'),
          html: `<div style="font-family:system-ui,sans-serif;line-height:1.5"><p>${escapeHtml(
            intro,
          )}</p><p style="white-space:pre-line">${escapeHtml(draft.body)}</p><p><a href="${escapeHtml(
            link,
          )}">${escapeHtml(link)}</a></p></div>`,
        })),
      )
    : [];
  return { drafted: true, emails: sent.length };
}
