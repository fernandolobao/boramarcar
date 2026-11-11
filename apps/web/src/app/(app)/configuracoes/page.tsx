import { accountDeletionPreview, getUserPreferences } from '@boramarcar/db';
import { getTranslations } from 'next-intl/server';
import { ConsentSettings } from '@/components/consent-settings';
import { DataRights } from '@/components/data-rights';
import { ProfileForm } from '@/components/profile-form';
import { ThemePicker } from '@/components/theme-picker';
import { requireUser } from '@/server/current-user';
import { getDb } from '@/server/db';
import { navMetadata } from '@/server/metadata';

export const generateMetadata = navMetadata('settings');

export default async function SettingsPage() {
  const user = await requireUser();
  const t = await getTranslations('settings');
  const tp = await getTranslations('privacySettings');
  const [preferences, deletion] = await Promise.all([
    getUserPreferences(getDb(), user.id),
    accountDeletionPreview(getDb(), user.id),
  ]);
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
      <section className="card space-y-6" aria-labelledby="privacidade-dados">
        <h2 id="privacidade-dados" className="section-title mb-0">
          {tp('title')}
        </h2>
        <ConsentSettings />
        <DataRights transfers={deletion.transfers} deletions={deletion.deletions} />
      </section>
    </>
  );
}
