import { isGameFormat } from '@boramarcar/core';
import { getGroupAttendance, lastRecapMonth, listLocations, listMembers } from '@boramarcar/db';
import Link from 'next/link';
import { getFormatter, getTranslations } from 'next-intl/server';
import { AttendanceCard } from '@/components/attendance-card';
import { CreateGroupForm, JoinGroupForm, SwitchGroupButton } from '@/components/group-forms';
import { GroupSettingsForm } from '@/components/group-settings-form';
import { RegenerateInviteButton } from '@/components/invite';
import { MemberActions } from '@/components/member-actions';
import { CopyField, ShareButtons } from '@/components/share-buttons';
import { getActiveGroup } from '@/server/active-group';
import { requireUser } from '@/server/current-user';
import { getDb } from '@/server/db';
import { inviteQrCode, inviteUrl } from '@/server/invite';
import { navMetadata } from '@/server/metadata';
import { Icon } from '@/components/icons';
import { LocationsSection } from '@/components/places/locations-section';
import { StackSections } from '@/components/stack-sections';

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
  // "Quem anda sumido": só dono e admins.
  const now = new Date();
  const attendance =
    active && active.role !== 'member'
      ? await getGroupAttendance(db, { groupId: active.id, userId: user.id, now })
      : null;
  const ts = await getTranslations('share');
  const tr = await getTranslations('records');
  const tm = await getTranslations('monthly');
  const recapMonth = active
    ? await lastRecapMonth(getDb(), { groupId: active.id }).then(async (value) => ({
        value,
        label: (await getFormatter()).dateTime(new Date(`${value}-15T12:00:00Z`), {
          month: 'long',
          year: 'numeric',
          timeZone: 'UTC',
        }),
      }))
    : null;
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
      {!active && <p className="muted">{t('noGroup')}</p>}
      {/* Seções em pilha de cartas: cada uma desliza por cima da anterior ao rolar. */}
      <StackSections>
        {active && (
          <>
            <section className="card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xl font-semibold">{active.name}</h2>
                {/* Atalho para os recordes e a cara do grupo (8.12). */}
                <div className="flex flex-wrap gap-2">
                  <Link href="/grupo/recordes" className="btn-secondary">
                    <Icon name="ranking" />
                    {tr('link')}
                  </Link>
                  {/* Retrospectiva do mês que passou (8.12). */}
                  {recapMonth && (
                    <Link
                      href={`/retrospectiva/${active.id}/${recapMonth.value}`}
                      className="btn-secondary"
                    >
                      <Icon name="events" />
                      {tm('link', { month: recapMonth.label })}
                    </Link>
                  )}
                </div>
              </div>
              <h3 className="section-title mt-4">{t('inviteTitle')}</h3>
              {invite && (
                <div className="grid gap-6 sm:grid-cols-[auto_1fr] sm:items-start">
                  {/* QR Code com o botão de baixar logo abaixo. */}
                  <figure className="mx-auto w-48 space-y-2 sm:mx-0">
                    <div
                      role="img"
                      aria-label={t('qrCode', { group: active.name })}
                      data-testid="invite-qr"
                      className="overflow-hidden rounded-2xl border border-ink-200 bg-white p-2 dark:border-ink-700 [&>svg]:h-auto [&>svg]:w-full"
                      // SVG gerado no servidor pela biblioteca qrcode a partir do link do convite.
                      dangerouslySetInnerHTML={{ __html: invite.qr.svg }}
                    />
                    <a
                      className="btn-secondary w-full"
                      href={invite.qr.png}
                      download={`convite-${active.inviteCode}.png`}
                    >
                      <Icon name="download" />
                      {t('downloadQr')}
                    </a>
                    <figcaption className="muted text-center text-sm">{t('qrHint')}</figcaption>
                  </figure>
                  {/* Link com o botão de copiar ao lado; depois, enviar pelo WhatsApp ou pelo
                      menu do celular. */}
                  <div className="min-w-0 space-y-4">
                    <div>
                      <CopyField label={t('inviteLink')} value={invite.url} />
                      <p className="muted mt-2 text-sm">
                        {t('inviteCode')}:{' '}
                        <span className="font-mono tracking-widest" data-testid="invite-code">
                          {active.inviteCode}
                        </span>
                      </p>
                    </div>
                    <ShareButtons
                      text={invite.text}
                      url={invite.url}
                      title={active.name}
                      copy={false}
                    />
                    {active.role !== 'member' && (
                      <div>
                        <RegenerateInviteButton groupId={active.id} />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>
            <section className="card">
              <h2 className="section-title">{t('members')}</h2>
              <ul className="divide-y divide-ink-200 dark:divide-ink-800">
                {members.map((m) => (
                  <li
                    key={m.userId}
                    className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 py-3 text-sm"
                  >
                    <span className="min-w-0">
                      <Link
                        href={m.userId === user.id ? '/perfil' : `/jogadores/${m.userId}`}
                        className="font-medium underline-offset-2 hover:underline"
                      >
                        {m.name}
                      </Link>
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
            {attendance && (
              <AttendanceCard
                groupId={active.id}
                members={attendance.members.map((m) => ({
                  ...m,
                  lastGameAt: m.lastGameAt?.toISOString() ?? null,
                  awaySince: m.awaySince?.toISOString() ?? null,
                }))}
                nextEvent={
                  attendance.nextEvent
                    ? {
                        ...attendance.nextEvent,
                        startsAt: attendance.nextEvent.startsAt.toISOString(),
                      }
                    : null
                }
                nudged={attendance.nudged}
                confirmedNext={attendance.confirmedNext}
                viewerId={user.id}
                now={now.toISOString()}
              />
            )}
            <section className="card" aria-labelledby="group-locations-title">
              <h2 id="group-locations-title" className="section-title">
                {t('locations')}
              </h2>
              <LocationsSection
                groupId={active.id}
                locations={locations}
                members={members.map((m) => ({ userId: m.userId, name: m.name }))}
                canManageAll={active.role !== 'member'}
                userId={user.id}
              />
            </section>
            <section className="card" aria-labelledby="group-settings-title">
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
          </>
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

        <section className="card">
          <h2 className="section-title">{t('create')}</h2>
          <CreateGroupForm />
        </section>
        <section className="card">
          <h2 className="section-title">{t('join')}</h2>
          <JoinGroupForm />
        </section>
      </StackSections>
    </>
  );
}
