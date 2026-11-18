import type { AchievementId } from '@boramarcar/core';
import type { IconName } from './icons';

/** Ícone de cada conquista (perfil e janela de conquistas novas). */
export const ACHIEVEMENT_ICON: Record<AchievementId, IconName> = {
  first_game: 'firstGame',
  first_win: 'winner',
  games_10: 'events',
  games_50: 'veteran',
  wins_10: 'ranking',
  streak_3: 'streak',
  streak_5: 'streak',
  fast_win: 'fastWin',
  first_player_win: 'firstPlayer',
  deck_loyal: 'loyal',
  deck_variety: 'variety',
  versatile: 'versatile',
  team_win: 'team',
  season_champion: 'champion',
  games_100: 'veteran',
  wins_25: 'ranking',
  wins_50: 'ranking',
  decks_5: 'decks',
  groups_2: 'group',
  opponents_10: 'crowd',
  nemesis: 'nemesis',
  underdog_10: 'underdog',
  proxy_win: 'print',
  comeback: 'comeback',
  events_streak_4: 'eventStreak',
  months_12: 'allYear',
  enturmado: 'join',
};
