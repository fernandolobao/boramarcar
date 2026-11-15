import type { Metadata } from 'next';
import { getGuideState, listEvents, listLocations } from '@boramarcar/db';
import Link from 'next/link';
import { getFormatter, getTranslations } from 'next-intl/server';
import { AvailabilityForm } from '@/components/availability-forms';
import { CreateGroupForm, JoinGroupForm } from '@/components/group-forms';
import { GuideFinish, GuideHeading, GuideSkip } from '@/components/guide-actions';
import { Icon } from '@/components/icons';
import { Logo } from '@/components/logo';
import { ProfileForm } from '@/components/profile-form';
import { getActiveGroup } from '@/server/active-group';
import { requireUser } from '@/server/current-user';
import { getDb } from '@/server/db';
import { getUserPreferences } from '@boramarcar/db';

const TOTAL = 3;
type Step = 1 | 2 | 3 | 'fim';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('guide');
  return { title: t('metaTitle'), robots: { index: false } };
}

/**
 * Guia do primeiro acesso (onboarding 7.1): seu grupo, fuso e idioma, e quando você pode jogar.
 * Abre sozinho para contas novas (o layout da área logada redireciona para cá), pode ser pulado
 * em qualquer passo e reaberto pelos primeiros passos do painel. Fica fora de `(app)` para não
 * exigir grupo nem redirecionar para si mesmo.
 */
export default async function GuidePage({
  searchParams,
}: {
  searchParams: Promise<{ passo?: string }>;
}) {
  const user = await requireUser();
  const db = getDb();
  const [{ active }, guide, preferences] = await Promise.all([
    getActiveGroup(user.id),
    getGuideState(db, { userId: user.id }),
    getUserPreferences(db, user.id),
  ]);
  const { passo } = await searchParams;
  const step: Step =
    passo === 'fim'
      ? 'fim'
      : passo === '2'
        ? 2
        : passo === '3'
          ? 3
          : passo === '1'
            ? 1
            : active
              ? 2
              : 1;
  const t = await getTranslations('guide');
  const tc = await getTranslations('common');
  const format = await getFormatter();
  const hasGroup = Boolean(active) || guide.hasGroup;
  const next = (n: Step) => `/boas-vindas?passo=${n}`;
  const continueLink = (to: Step) => (
    <Link href={next(to)} className="btn-primary">
      {t('continue')}
      <Icon name="next" />
    </Link>
  );

  let content: React.ReactNode;
  if (step === 1) {
    content = (
      <>
        <GuideHeading>{t('groupTitle')}</GuideHeading>
        <p>{t('groupBody')}</p>
        {active ? (
          <>
            <p className="font-medium">{t('groupIn', { group: active.name })}</p>
            {continueLink(2)}
          </>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <section className="card space-y-2" aria-labelledby="guia-convite">
              <h2 id="guia-convite" className="section-title">
                {t('joinTitle')}
              </h2>
              <JoinGroupForm />
            </section>
            <section className="card space-y-2" aria-labelledby="guia-criar">
              <h2 id="guia-criar" className="section-title">
                {t('createTitle')}
              </h2>
              <CreateGroupForm />
            </section>
          </div>
        )}
      </>
    );
  } else if (step === 2) {
    content = (
      <>
        <GuideHeading>{t('prefsTitle')}</GuideHeading>
        <p>{t('prefsBody')}</p>
        <section className="card">
          <ProfileForm emailNotifications={preferences.emailNotifications} />
        </section>
        {continueLink(3)}
      </>
    );
  } else if (step === 3) {
    const locations = active ? await listLocations(db, active.id) : [];
    content = (
      <>
        <GuideHeading>{t('availabilityTitle')}</GuideHeading>
        <p>{t('availabilityBody')}</p>
        {active ? (
          <section className="card">
            <AvailabilityForm
              groupId={active.id}
              locations={locations.map((l) => ({ id: l.id, name: l.name }))}
              initialFrequency="weekly"
            />
          </section>
        ) : (
          <p className="muted">{t('availabilityNoGroup')}</p>
        )}
        <div className="flex flex-wrap gap-3">
          {continueLink('fim')}
          {!active && (
            <Link href={next(1)} className="btn-secondary">
              <Icon name="group" />
              {t('groupTitle')}
            </Link>
          )}
        </div>
      </>
    );
  } else {
    const [nextEvent] = active
      ? await listEvents(db, {
          groupId: active.id,
          userId: user.id,
          when: 'upcoming',
          now: new Date(),
          includeCancelled: false,
        })
      : [];
    content = (
      <>
        <GuideHeading>{t('doneTitle')}</GuideHeading>
        <p>
          {!active
            ? t('doneNoGroup')
            : nextEvent
              ? t('doneNext', {
                  group: active.name,
                  title: nextEvent.title,
                  when: format.dateTime(nextEvent.startsAt, {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
                })
              : t('doneNoEvent', { group: active.name })}
        </p>
        <GuideFinish />
      </>
    );
  }

  return (
    <main
      id="conteudo"
      tabIndex={-1}
      className="mx-auto max-w-3xl space-y-6 px-4 py-10 focus:outline-none sm:px-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Logo title={tc('appName')} className="h-6 w-auto text-arcano dark:text-pergaminho" />
        {step !== 'fim' && <GuideSkip hasGroup={hasGroup} />}
      </div>
      {step !== 'fim' && (
        <p className="text-sm font-semibold text-link">
          {t('step', { current: step, total: TOTAL })}
        </p>
      )}
      {content}
      {step === 3 && (
        <p className="muted text-sm">
          <Link href={next('fim')} className="text-link underline underline-offset-2">
            {t('skipStep')}
          </Link>
        </p>
      )}
    </main>
  );
}
