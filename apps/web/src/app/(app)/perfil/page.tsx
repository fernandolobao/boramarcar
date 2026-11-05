import { getUserPreferences } from '@boramarcar/db';
import { getTranslations } from 'next-intl/server';
import { ProfileForm } from '@/components/profile-form';
import { requireUser } from '@/server/current-user';
import { getDb } from '@/server/db';
import { navMetadata } from '@/server/metadata';

export const generateMetadata = navMetadata('profile');

export default async function ProfilePage() {
  const user = await requireUser();
  const t = await getTranslations('profile');
  const preferences = await getUserPreferences(getDb(), user.id);
  return (
    <>
      <div>
        <h1 className="page-title">{t('title')}</h1>
        <p className="muted">
          {user.name} · {user.email}
        </p>
      </div>
      <section className="card">
        <ProfileForm emailNotifications={preferences.emailNotifications} />
      </section>
    </>
  );
}
