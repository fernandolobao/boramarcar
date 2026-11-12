import { getTranslations } from 'next-intl/server';
import { Icon } from '@/components/icons';

const PEOPLE = ['Ana', 'Bia', 'Caio', 'Duda'];

/**
 * Prévia do app na home, montada com os mesmos cartões das telas (não é imagem): próximo
 * encontro, "a mesa fechou!" e o placar da noite. Exemplo fictício, lido como uma imagem só.
 */
export async function AppPreview() {
  const t = await getTranslations('home.preview');
  return (
    <div role="img" aria-label={t('label')} className="relative mx-auto w-full max-w-md">
      <div aria-hidden="true" className="space-y-4">
        {/* Próximo encontro */}
        <div className="flex overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
          <span className="w-2 shrink-0 bg-primary" />
          <div className="flex-1 space-y-3 p-5">
            <p className="text-xs font-semibold tracking-wide text-link uppercase">
              {t('nextEvent')}
            </p>
            <p className="font-display text-2xl font-semibold">{t('eventTitle')}</p>
            <p className="muted flex items-center gap-2">
              <Icon name="events" />
              {t('eventWhen')}
            </p>
            <p className="muted flex items-center gap-2">
              <Icon name="location" />
              {t('eventWhere')}
            </p>
            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="flex -space-x-2">
                {PEOPLE.map((name) => (
                  <span
                    key={name}
                    className="inline-flex size-8 items-center justify-center rounded-full bg-surface-muted text-xs font-bold ring-2 ring-surface"
                  >
                    {name[0]}
                  </span>
                ))}
              </div>
              <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-on-primary">
                {t('confirmed')}
              </span>
            </div>
          </div>
        </div>

        {/* A mesa fechou */}
        <div className="ms-8 flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 shadow-sm">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-on-accent">
            <Icon name="table" />
          </span>
          <div className="min-w-0">
            <p className="font-semibold">{t('windowTitle')}</p>
            <p className="muted text-sm">{t('windowBody')}</p>
          </div>
        </div>

        {/* Placar da noite */}
        <div className="me-6 rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <p className="mb-3 inline-flex rounded-full bg-accent px-3 py-0.5 text-xs font-semibold text-on-accent">
            {t('recap')}
          </p>
          <ol className="space-y-2 text-sm">
            {(
              [
                ['Ana', t('wins', { wins: 2 })],
                ['Caio', t('wins', { wins: 1 })],
                ['Bia', t('wins', { wins: 0 })],
              ] as const
            ).map(([name, wins], i) => (
              <li key={name} className="flex items-center gap-3">
                <span
                  className={`inline-flex size-6 items-center justify-center rounded-full text-xs font-bold ${
                    i === 0 ? 'bg-accent text-on-accent' : 'bg-surface-muted'
                  }`}
                >
                  {i + 1}
                </span>
                <span className="flex-1 font-medium">{name}</span>
                <span className="muted tabular-nums">{wins}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
