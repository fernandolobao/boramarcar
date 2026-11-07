import { getLocales } from 'expo-localization';

const pt = {
  appName: 'Bora Marcar',
  signInTitle: 'Organize os encontros de Magic do seu grupo',
  signInGoogle: 'Entrar com Google',
  signingIn: 'Entrando…',
  signInError: 'Não foi possível entrar. Tente de novo.',
  tabEvents: 'Encontros',
  tabRanking: 'Ranking',
  tabDecks: 'Decks',
  tabAccount: 'Conta',
  upcoming: 'Próximos encontros',
  noEvents: 'Nenhum encontro marcado.',
  locationTbd: 'Local a definir',
  noGroup: 'Você ainda não participa de um grupo. Crie ou entre num grupo pelo site.',
  loading: 'Carregando…',
  retry: 'Tentar de novo',
  loadError: 'Não foi possível carregar.',
  offline: 'Sem conexão com o servidor.',
  participants: 'Participantes',
  games: 'Partidas',
  game: 'Partida {number}',
  winner: 'Vencedor: {names}',
  draw: 'Empate',
  rsvpTitle: 'Você vai?',
  rsvpYes: 'Vou',
  rsvpMaybe: 'Talvez',
  rsvpNo: 'Não vou',
  rsvpSaved: 'Resposta salva.',
  statusCancelled: 'Cancelado',
  statusFinished: 'Finalizado',
  rankingTitle: 'Ranking do grupo',
  rankingEmpty: 'Nenhuma partida registrada ainda.',
  rankingRow: '{position}º {name}: {points} pontos, {wins} vitórias em {games} partidas',
  points: 'pts',
  wins: 'V',
  gamesShort: 'J',
  decksTitle: 'Meus decks',
  decksEmpty: 'Você ainda não tem decks. Importe pelo site.',
  cards: '{count} cartas',
  proxies: '{count} proxies',
  signedInAs: 'Conectado como',
  group: 'Grupo',
  activeGroup: 'Grupo ativo',
  signOut: 'Sair',
  openWeb: 'Abrir no site',
  serverLabel: 'Servidor: {url}',
  serverChecking: 'conectando…',
  serverUnreachable:
    'Não foi possível falar com o servidor ({url}). Se o site estiver rodando no seu computador, confira se o pnpm dev está aberto e se o celular está no mesmo Wi-Fi.',
} as const;

type Messages = Record<keyof typeof pt, string>;

const en: Messages = {
  appName: 'Bora Marcar',
  signInTitle: "Organize your group's Magic meetups",
  signInGoogle: 'Sign in with Google',
  signingIn: 'Signing in…',
  signInError: 'Could not sign in. Try again.',
  tabEvents: 'Meetups',
  tabRanking: 'Ranking',
  tabDecks: 'Decks',
  tabAccount: 'Account',
  upcoming: 'Upcoming meetups',
  noEvents: 'No meetups scheduled.',
  locationTbd: 'Location TBD',
  noGroup: "You're not in a group yet. Create or join one on the website.",
  loading: 'Loading…',
  retry: 'Try again',
  loadError: 'Could not load.',
  offline: 'No connection to the server.',
  participants: 'Participants',
  games: 'Games',
  game: 'Game {number}',
  winner: 'Winner: {names}',
  draw: 'Draw',
  rsvpTitle: 'Are you going?',
  rsvpYes: 'Going',
  rsvpMaybe: 'Maybe',
  rsvpNo: 'Not going',
  rsvpSaved: 'Answer saved.',
  statusCancelled: 'Cancelled',
  statusFinished: 'Finished',
  rankingTitle: 'Group ranking',
  rankingEmpty: 'No games recorded yet.',
  rankingRow: '{position}. {name}: {points} points, {wins} wins in {games} games',
  points: 'pts',
  wins: 'W',
  gamesShort: 'G',
  decksTitle: 'My decks',
  decksEmpty: "You don't have decks yet. Import them on the website.",
  cards: '{count} cards',
  proxies: '{count} proxies',
  signedInAs: 'Signed in as',
  group: 'Group',
  activeGroup: 'Active group',
  signOut: 'Sign out',
  openWeb: 'Open website',
  serverLabel: 'Server: {url}',
  serverChecking: 'connecting…',
  serverUnreachable:
    "Couldn't reach the server ({url}). If the website runs on your computer, check that pnpm dev is running and the phone is on the same Wi-Fi.",
};

export type MessageKey = keyof typeof pt;

/** Idioma do aparelho: português por padrão, inglês quando o sistema estiver em inglês. */
export const locale = getLocales()[0]?.languageCode === 'en' ? 'en' : 'pt-BR';
const messages: Messages = locale === 'en' ? en : pt;

/** Texto traduzido com `{variáveis}`. */
export function t(key: MessageKey, values: Record<string, string | number> = {}) {
  return messages[key].replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? ''));
}

export const formatDateTime = (date: Date) =>
  new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeStyle: 'short' }).format(date);
