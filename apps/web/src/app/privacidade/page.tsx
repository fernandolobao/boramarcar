import type { Metadata } from 'next';
import Link from 'next/link';
import { getFormatter, getLocale, getTranslations } from 'next-intl/server';
import { Icon } from '@/components/icons';
import { Logo } from '@/components/logo';
import { PRIVACY_CONTACT, PRIVACY_POLICY, PRIVACY_UPDATED } from './content';

async function policy() {
  const locale = await getLocale();
  return PRIVACY_POLICY[locale === 'en' ? 'en' : 'pt-BR'];
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await policy()).title };
}

/** Política de Privacidade (LGPD): pública, sem login, nos dois idiomas. */
export default async function PrivacyPage() {
  const p = await policy();
  const tc = await getTranslations('common');
  const format = await getFormatter();
  const updated = format.dateTime(new Date(`${PRIVACY_UPDATED}T12:00:00Z`), {
    dateStyle: 'long',
  });

  return (
    <main
      id="conteudo"
      tabIndex={-1}
      className="mx-auto max-w-3xl space-y-8 px-4 py-10 focus:outline-none sm:px-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="rounded-lg py-1">
          <Logo title={tc('appName')} className="h-6 w-auto text-arcano dark:text-pergaminho" />
        </Link>
        <Link
          href="/"
          className="inline-flex min-h-6 items-center gap-1.5 text-sm font-medium text-link underline-offset-2 hover:underline"
        >
          <Icon name="back" />
          {tc('back')}
        </Link>
      </div>
      <header className="space-y-2">
        <h1 className="page-title">{p.title}</h1>
        <p className="muted text-sm">{p.updated.replace('{date}', updated)}</p>
        <p>{p.intro}</p>
        <p>
          {p.contactLabel}:{' '}
          <a href={`mailto:${PRIVACY_CONTACT}`} className="text-link underline underline-offset-2">
            {PRIVACY_CONTACT}
          </a>
        </p>
      </header>
      <nav aria-labelledby="indice" className="card">
        <h2 id="indice" className="sr-only">
          {p.title}
        </h2>
        <ol className="grid gap-1 text-sm sm:grid-cols-2">
          {p.sections.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="text-link underline-offset-2 hover:underline">
                {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>
      {p.sections.map((s) => (
        <section
          key={s.id}
          id={s.id}
          aria-labelledby={`${s.id}-t`}
          className="scroll-mt-6 space-y-3"
        >
          <h2 id={`${s.id}-t`} className="section-title mb-0">
            {s.title}
          </h2>
          {s.paragraphs?.map((text) => (
            <p key={text}>{text}</p>
          ))}
          {s.items && (
            <ul className="list-disc space-y-1.5 pl-5">
              {s.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
          {s.after?.map((text) => (
            <p key={text}>{text}</p>
          ))}
        </section>
      ))}
    </main>
  );
}
