import { accountDeletionPreview, getUserImage, getUserPreferences } from '@boramarcar/db';
import { getTranslations } from 'next-intl/server';
import { ConsentSettings } from '@/components/consent-settings';
import { CreateGroupForm, JoinGroupForm } from '@/components/group-forms';
import { DataRights } from '@/components/data-rights';
import { ImageUpload } from '@/components/image-upload';
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
  const tg = await getTranslations('group');
  const [preferences, deletion, image] = await Promise.all([
    getUserPreferences(getDb(), user.id),
    accountDeletionPreview(getDb(), user.id),
    getUserImage(getDb(), user.id),
  ]);
  return (
    <>
      <div>
        <h1 className="page-title">{t('title')}</h1>
        <p className="muted">{t('intro')}</p>
      </div>
      <section className="card">
        <ImageUpload kind="avatar" endpoint="/api/v1/me/avatar" name={user.name} image={image} />
      </section>
      <section className="card">
        <ProfileForm emailNotifications={preferences.emailNotifications} city={preferences.city} />
      </section>
      <section className="card">
        <ThemePicker />
      </section>
      {/* Grupos: criar um novo ou entrar com o código do convite (antes no fim da página do grupo). */}
      <section id="grupos" className="card scroll-mt-24 space-y-6" aria-labelledby="config-grupos">
        <h2 id="config-grupos" className="section-title mb-0">
          {tg('settingsTitle')}
        </h2>
        <div className="space-y-2">
          <h3 className="font-semibold">{tg('create')}</h3>
          <CreateGroupForm />
        </div>
        <div className="space-y-2">
          <h3 className="font-semibold">{tg('join')}</h3>
          <JoinGroupForm />
        </div>
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
