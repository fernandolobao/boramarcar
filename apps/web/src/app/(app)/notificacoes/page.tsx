import { listNotifications } from '@boramarcar/db';
import { getTranslations } from 'next-intl/server';
import { NotificationList } from '@/components/notifications';
import { requireUser } from '@/server/current-user';
import { getDb } from '@/server/db';
import { navMetadata } from '@/server/metadata';

export const generateMetadata = navMetadata('notifications');

/** Central de notificações: partidas, conquistas, pódio e avisos do ArcanaKin. */
export default async function NotificationsPage() {
  const user = await requireUser();
  const t = await getTranslations('notifications');
  const items = await listNotifications(getDb(), { userId: user.id });
  return (
    <>
      <h1 className="page-title">{t('title')}</h1>
      <section className="card">
        <NotificationList
          items={items.map((i) => ({
            ...i,
            createdAt: i.createdAt.toISOString(),
            readAt: i.readAt?.toISOString() ?? null,
          }))}
        />
      </section>
    </>
  );
}
