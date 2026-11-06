import { getUserPreferences } from '@boramarcar/db';
import { getTranslations } from 'next-intl/server';
import { ProfileForm } from '@/components/profile-form';
import { ThemePicker } from '@/components/theme-picker';
import { requireUser } from '@/server/current-user';
import { getDb } from '@/server/db';
import { navMetadata } from '@/server/metadata';

export const generateMetadata = navMetadata('settings');

export default async function SettingsPage() {
  const user = await requireUser();
  const t = await getTranslations('settings');
  const preferences = await getUserPreferences(getDb(), user.id);
  return (
    <>
      <div>
        <h1 className="page-title">{t('title')}</h1>
        <p className="muted">{t('intro')}</p>
      </div>
      <section className="card">
        <ProfileForm emailNotifications={preferences.emailNotifications} />
      </section>
      <section className="card">
        <ThemePicker />
      </section>
    </>
  );
}
