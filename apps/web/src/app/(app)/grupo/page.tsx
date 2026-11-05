import { listLocations, listMembers } from '@boramarcar/db';
import { getTranslations } from 'next-intl/server';
import {
  CreateGroupForm,
  JoinGroupForm,
  LocationForm,
  SwitchGroupButton,
} from '@/components/group-forms';
import { getActiveGroup } from '@/server/active-group';
import { requireUser } from '@/server/current-user';
import { getDb } from '@/server/db';
import { navMetadata } from '@/server/metadata';

export const generateMetadata = navMetadata('group');

export default async function GroupPage() {
  const user = await requireUser();
  const { active, groups } = await getActiveGroup(user.id);
  const t = await getTranslations('group');
  const db = getDb();
  const [members, locations] = active
    ? await Promise.all([listMembers(db, active.id), listLocations(db, active.id)])
    : [[], []];

  return (
    <>
      <h1 className="page-title">{t('title')}</h1>
      {active ? (
        <div className="grid gap-6 md:grid-cols-2">
          <section className="card md:col-span-2">
            <h2 className="text-xl font-semibold">{active.name}</h2>
            <p className="muted mt-1">{t('inviteHint', { code: active.inviteCode })}</p>
            <p
              className="mt-3 inline-block rounded-xl bg-zinc-100 px-4 py-2 font-mono text-lg tracking-widest dark:bg-zinc-800"
              data-testid="invite-code"
            >
              {active.inviteCode}
            </p>
          </section>
          <section className="card">
            <h2 className="section-title">{t('members')}</h2>
            <ul className="space-y-1">
              {members.map((m) => (
                <li key={m.userId} className="flex justify-between text-sm">
                  <span>{m.name}</span>
                  <span className="muted">{t(`roles.${m.role}`)}</span>
                </li>
              ))}
            </ul>
          </section>
          <section className="card space-y-4">
            <h2 className="section-title">{t('locations')}</h2>
            <ul className="space-y-1 text-sm">
              {locations.map((l) => (
                <li key={l.id}>
                  <span className="font-medium">{l.name}</span>
                  {l.address && <span className="muted"> · {l.address}</span>}
                </li>
              ))}
            </ul>
            <LocationForm groupId={active.id} />
          </section>
        </div>
      ) : (
        <p className="muted">{t('noGroup')}</p>
      )}

      {groups.length > 1 && (
        <section className="card">
          <ul className="space-y-2">
            {groups.map((g) => (
              <li key={g.id} className="flex items-center justify-between">
                <span>{g.name}</span>
                {g.id === active?.id ? (
                  <span className="muted">{t('active')}</span>
                ) : (
                  <SwitchGroupButton groupId={g.id} />
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <section className="card">
          <h2 className="section-title">{t('create')}</h2>
          <CreateGroupForm />
        </section>
        <section className="card">
          <h2 className="section-title">{t('join')}</h2>
          <JoinGroupForm />
        </section>
      </div>
    </>
  );
}
