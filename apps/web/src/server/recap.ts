import 'server-only';
import {
  claimEventRecap,
  listGroupRecipients,
  listPushTargets,
  type Database,
} from '@boramarcar/db';
import { buildRecapEmail, deliverEmails } from './email';
import { buildRecapPush, deliverPush } from './push';

/**
 * Resumo da noite (8.6): ao finalizar o encontro (ou registrar uma partida num encontro já
 * finalizado), manda uma vez o e-mail e o push para quem jogou ou confirmou presença. E-mail
 * respeita quem desligou os avisos; push vai para os aparelhos registrados.
 */
export async function sendEventRecap(db: Database, eventId: string) {
  const claimed = await claimEventRecap(db, eventId);
  if (!claimed) return null;
  const { recap, groupId, groupName, userIds } = claimed;
  const [emailTo, pushTo] = await Promise.all([
    listGroupRecipients(db, { groupId, onlyUserIds: userIds, channel: 'email' }),
    listGroupRecipients(db, { groupId, onlyUserIds: userIds, channel: 'push' }),
  ]);
  const top = recap.standings[0] ?? null;
  const [emails] = await Promise.all([
    deliverEmails(emailTo.map((r) => buildRecapEmail(r, { groupName, recap }))).catch(
      (error: unknown) => {
        console.error('[recap] e-mail', error);
        return [];
      },
    ),
    listPushTargets(
      db,
      pushTo.map((r) => r.userId),
    )
      .then((targets) =>
        deliverPush(
          db,
          targets.map((target) =>
            buildRecapPush(target, {
              eventId,
              title: recap.title,
              games: recap.games.length,
              top,
            }),
          ),
        ),
      )
      .catch((error: unknown) => console.error('[recap] push', error)),
  ]);
  return { emails: emails.length, recipients: userIds.length };
}
