import { isGameFormat } from '@boramarcar/core';
import { listLocations, listMembers } from '@boramarcar/db';
import { getTranslations } from 'next-intl/server';
import {
  CreateGroupForm,
  JoinGroupForm,
  LocationForm,
  SwitchGroupButton,
} from '@/components/group-forms';
import { GroupSettingsForm } from '@/components/group-settings-form';
import { RegenerateInviteButton } from '@/components/invite';
import { MemberActions } from '@/components/member-actions';
import { ShareButtons } from '@/components/share-buttons';
import { getActiveGroup } from '@/server/active-group';
import { requireUser } from '@/server/current-user';
import { getDb } from '@/server/db';
import { inviteQrCode, inviteUrl } from '@/server/invite';
import { navMetadata } from '@/server/metadata';
import { Icon } from '@/components/icons';

export const generateMetadata = navMetadata('group');

export default async function GroupPage() {
  const user = await requireUser();
  const { active, groups } = await getActiveGroup(user.id);
  const t = await getTranslations('group');
  const tg = await getTranslations('groupSettings');
  const db = getDb();
  const [members, locations] = active
    ? await Promise.all([listMembers(db, active.id), listLocations(db, active.id)])
    : [[], []];
  const ts = await getTranslations('share');
  const invite = active
    ? await (async () => {
        const url = inviteUrl(active.inviteCode);
        return {
          url,
          qr: await inviteQrCode(url),
          text: ts('inviteText', { group: active.name, url }),
        };
      })()
    : null;

  return (
    <>
      <h1 className="page-title">{t('title')}</h1>
      {active ? (
        <div className="grid gap-6 md:grid-cols-2">
          <section className="card md:col-span-2">
            <h2 className="text-xl font-semibold">{active.name}</h2>
            <h3 className="section-title mt-4">{t('inviteTitle')}</h3>
            {invite && (
              <div className="grid gap-6 sm:grid-cols-[auto_1fr] sm:items-start">
                <figure className="mx-auto w-56 sm:mx-0">
                  <div
                    role="img"
                    aria-label={t('qrCode', { group: active.name })}
                    data-testid="invite-qr"
                    className="overflow-hidden rounded-2xl border border-zinc-200 bg-white p-2 dark:border-zinc-700 [&>svg]:h-auto [&>svg]:w-full"
                    // SVG gerado no servidor pela biblioteca qrcode a partir do link do convite.
                    dangerouslySetInnerHTML={{ __html: invite.qr.svg }}
                  />
                  <figcaption className="muted mt-2 text-center">{t('qrHint')}</figcaption>
                </figure>
                <div className="min-w-0 space-y-4">
                  <div>
                    <p className="label">{t('inviteLink')}</p>
                    <p
                      className="break-all rounded-xl bg-zinc-100 px-3 py-2 font-mono text-sm dark:bg-zinc-800"
                      data-testid="invite-url"
                    >
                      {invite.url}
                    </p>
                    <p className="muted mt-2">
                      {t('inviteCode')}:{' '}
                      <span className="font-mono tracking-widest" data-testid="invite-code">
                        {active.inviteCode}
                      </span>
                    </p>
                  </div>
                  <ShareButtons text={invite.text} url={invite.url} title={active.name} />
                  <div className="flex flex-wrap gap-2">
                    <a
                      className="btn-secondary"
                      href={invite.qr.png}
                      download={`convite-${active.inviteCode}.png`}
                    >
                      <Icon name="download" />
                      {t('downloadQr')}
                    </a>
                    {active.role !== 'member' && <RegenerateInviteButton groupId={active.id} />}
                  </div>
                </div>
              </div>
            )}
          </section>
          <section className="card md:col-span-2">
            <h2 className="section-title">{t('members')}</h2>
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {members.map((m) => (
                <li
                  key={m.userId}
                  className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 py-3 text-sm"
                >
                  <span className="min-w-0">
                    <span className="font-medium">{m.name}</span>
                    {m.userId === user.id && <span className="muted"> ({t('you')})</span>}
                    <span className="muted block">{t(`roles.${m.role}`)}</span>
                  </span>
                  <MemberActions
                    groupId={active.id}
                    actorId={user.id}
                    actorRole={active.role}
                    member={{ userId: m.userId, name: m.name, role: m.role }}
                    memberCount={members.length}
                  />
                </li>
              ))}
            </ul>
          </section>
          <section className="card space-y-4 md:col-span-2">
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
          <section className="card md:col-span-2" aria-labelledby="group-settings-title">
            <h2 id="group-settings-title" className="section-title">
              {tg('title')}
            </h2>
            <GroupSettingsForm
              groupId={active.id}
              canEdit={active.role !== 'member'}
              settings={{
                tableSize: active.tableSize,
                minDurationMinutes: active.minDurationMinutes,
                pointsWin: active.pointsWin,
                pointsDraw: active.pointsDraw,
                pointsLoss: active.pointsLoss,
                defaultFormat: isGameFormat(active.defaultFormat)
                  ? active.defaultFormat
                  : 'commander',
              }}
            />
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
