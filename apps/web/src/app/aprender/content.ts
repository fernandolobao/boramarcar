import 'server-only';
import { getLearnProgress } from '@boramarcar/db';
import { LEARN, OFFICIAL_LINKS, type LearnItemId, type LearnLocale } from '@boramarcar/core/learn';
import { headers } from 'next/headers';
import { getLocale } from 'next-intl/server';
import { getDb } from '@/server/db';
import { getSessionUser } from '@/server/session';

/** Conteúdo da trilha no idioma da pessoa, quem está vendo e as lições que ela já concluiu. */
export async function learnContext() {
  const locale: LearnLocale = (await getLocale()) === 'en' ? 'en' : 'pt-BR';
  const user = await getSessionUser(await headers()).catch(() => null);
  const completed: LearnItemId[] = user
    ? await getLearnProgress(getDb(), user.id).catch(() => [])
    : [];
  return { content: LEARN[locale], links: OFFICIAL_LINKS[locale], user, completed, locale };
}
