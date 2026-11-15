'use client';

import { useTranslations } from 'next-intl';
import { useState, useSyncExternalStore } from 'react';
import { THEME_STORAGE_KEY } from '@/lib/theme';
import { Icon, type IconName } from './icons';
import { Choices } from './ds/choices';

export const THEMES = ['system', 'light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];

const ICON: Record<Theme, IconName> = {
  system: 'themeSystem',
  light: 'themeLight',
  dark: 'themeDark',
};

function readTheme(): Theme {
  const value = document.documentElement.dataset.theme;
  return value === 'light' || value === 'dark' ? value : 'system';
}

/** Aplica e guarda o tema neste navegador (`system` = segue o aparelho). */
export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'system') delete root.dataset.theme;
  else root.dataset.theme = theme;
  try {
    if (theme === 'system') localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Armazenamento bloqueado: o tema vale só até recarregar a página.
  }
}

/** Escolha do tema (Automático/Claro/Escuro) como grupo de rádios nativo. */
export function ThemePicker() {
  const t = useTranslations('settings');
  // No servidor não há preferência: mostra "Automático" até hidratar.
  const initial = useSyncExternalStore(
    () => () => {},
    readTheme,
    () => 'system' as Theme,
  );
  const [chosen, setChosen] = useState<Theme | null>(null);
  const theme = chosen ?? initial;
  return (
    <Choices
      label={t('theme')}
      description={t('themeHint')}
      variant="cards"
      value={theme}
      onChange={(value) => {
        applyTheme(value);
        setChosen(value);
      }}
      options={THEMES.map((value) => ({ value, label: t(`themes.${value}`) }))}
      icons={Object.fromEntries(THEMES.map((v) => [v, <Icon key={v} name={ICON[v]} />]))}
    />
  );
}
