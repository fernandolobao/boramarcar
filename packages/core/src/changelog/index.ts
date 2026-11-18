/**
 * Novidades para quem usa o ArcanaKin (item 14 do roadmap): uma ou duas frases por mudança
 * visível, em linguagem de usuário, em pt-BR e en. Toda segunda o cron junta as da semana num
 * rascunho "Novidades da semana" no `/admin`; um admin revisa e publica (vira notificação).
 *
 * Mudou algo que as pessoas vão notar? Acrescente uma entrada no fim (data do merge, sem termos
 * técnicos: o que a pessoa ganha, não como foi feito).
 */
export interface ChangelogEntry {
  /** Dia (AAAA-MM-DD) em que a mudança entrou. */
  date: string;
  pt: string;
  en: string;
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    date: '2026-11-18',
    pt: 'A página inicial abre em português para quem está no Brasil, e ganhou um seletor de idioma (PT | EN) no topo.',
    en: 'The home page opens in Portuguese for people in Brazil, and has a language switch (PT | EN) at the top.',
  },
  {
    date: '2026-11-18',
    pt: 'A busca de cartas em português agora encontra cartas de duas faces, como "Ídolo do Rei das Profundezas".',
    en: 'Searching cards in Portuguese now finds double-faced cards too.',
  },
  {
    date: '2026-11-18',
    pt: 'Ao adicionar à coleção uma carta que só tem uma edição, ela já vem escolhida.',
    en: 'When you add a card with a single edition to your collection, it comes already picked.',
  },
  {
    date: '2026-11-18',
    pt: 'Na página do deck, tocar no nome de uma carta mostra a edição que você usa no deck.',
    en: 'On a deck page, tapping a card name shows the edition you use in that deck.',
  },
  {
    date: '2026-11-18',
    pt: 'Convidar para o grupo ficou mais simples: "Copiar link" ao lado do link e "Baixar QR Code" logo abaixo do QR Code.',
    en: 'Inviting people is simpler: "Copy link" next to the link and "Download QR code" right below the QR code.',
  },
  {
    date: '2026-11-18',
    pt: 'Decks públicos podem ser compartilhados por link, QR Code ou WhatsApp.',
    en: 'Public decks can be shared by link, QR code or WhatsApp.',
  },
  {
    date: '2026-11-18',
    pt: 'A análise de deck dá nota também para Modern, Pauper, Standard, Draft e outros formatos, e ficou mais enxuta.',
    en: 'Deck analysis now scores Modern, Pauper, Standard, Draft and other formats too, and is more compact.',
  },
  {
    date: '2026-11-18',
    pt: '12 conquistas novas, e uma janela mostra as que você ganhou desde a última visita.',
    en: '12 new achievements, and a window shows the ones you earned since your last visit.',
  },
  {
    date: '2026-11-18',
    pt: 'Chegou o sino de notificações: partidas suas e do grupo, conquistas, mudanças no pódio e avisos do ArcanaKin.',
    en: 'Meet the notifications bell: your games and your group’s, achievements, podium changes and ArcanaKin announcements.',
  },
];

/** Entradas depois do dia `after` (exclusive) até `until` (inclusive), em AAAA-MM-DD. */
export function changelogSince(
  entries: readonly ChangelogEntry[],
  after: string,
  until: string,
): ChangelogEntry[] {
  return entries.filter((e) => e.date > after && e.date <= until);
}

/** Título e texto do rascunho (texto simples, uma novidade por linha). */
export function changelogDraft(
  entries: readonly ChangelogEntry[],
  locale: 'pt-BR' | 'en' = 'pt-BR',
) {
  return {
    title: locale === 'en' ? 'This week’s news' : 'Novidades da semana',
    body: entries.map((e) => `• ${locale === 'en' ? e.en : e.pt}`).join('\n'),
  };
}
