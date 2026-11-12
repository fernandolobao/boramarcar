import 'server-only';
import { BETA_WEEKS } from '@boramarcar/core';
import { claimBetaWelcomes, getBeta, listGroupRecipients, type Database } from '@boramarcar/db';
import { buildBetaWelcomeEmail, deliverEmails } from './email';

/**
 * Manda o e-mail de boas-vindas aos grupos do beta que ainda não receberam (só com o beta
 * rodando; respeita quem desligou os e-mails). Chamado pelo cron diário e ao salvar o beta.
 */
export async function sendBetaWelcomes(db: Database, now = new Date()) {
  const groups = await claimBetaWelcomes(db, now);
  if (groups.length === 0) return 0;
  const { state } = await getBeta(db, now);
  const messages = (
    await Promise.all(
      groups.map(async (group) =>
        (await listGroupRecipients(db, { groupId: group.id, channel: 'email' })).map((r) =>
          buildBetaWelcomeEmail(r, {
            groupName: group.name,
            endsAt: state.endsAt!,
            weeks: BETA_WEEKS,
          }),
        ),
      ),
    )
  ).flat();
  await deliverEmails(messages);
  return messages.length;
}
