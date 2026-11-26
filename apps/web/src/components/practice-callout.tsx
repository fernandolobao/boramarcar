import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Icon } from './icons';

/**
 * Da trilha para a mesa de testes (11.4): convite para jogar alguns turnos sozinho com um deck.
 * Sem conta, o link passa pela entrada.
 */
export async function PracticeCallout({ signedIn }: { signedIn: boolean }) {
  const t = await getTranslations('learn.practice');
  const href = signedIn ? '/decks' : '/entrar?para=/decks';
  return (
    <section aria-labelledby="pratique" className="card flex flex-wrap items-center gap-4">
      <Icon name="play" className="size-6 shrink-0 text-link" />
      <div className="min-w-0 flex-1 space-y-1">
        <h2 id="pratique" className="section-title mb-0">
          {t('title')}
        </h2>
        <p className="text-sm">{t('text')}</p>
      </div>
      <Link href={href} className="btn-primary">
        {signedIn ? t('link') : t('signIn')}
        <Icon name="next" />
      </Link>
    </section>
  );
}
