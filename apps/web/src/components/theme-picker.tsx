'use client';

import { useTranslations } from 'next-intl';
import { useId, useState, useSyncExternalStore } from 'react';
import { THEME_STORAGE_KEY } from '@/lib/theme';
import { Icon, type IconName } from './icons';

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
  const id = useId();
  // No servidor não há preferência: mostra "Automático" até hidratar.
  const initial = useSyncExternalStore(
    () => () => {},
    readTheme,
    () => 'system' as Theme,
  );
  const [chosen, setChosen] = useState<Theme | null>(null);
  const theme = chosen ?? initial;
  return (
    <fieldset aria-describedby={`${id}-hint`}>
      <legend className="section-title">{t('theme')}</legend>
      <p className="muted mb-3 text-sm" id={`${id}-hint`}>
        {t('themeHint')}
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        {THEMES.map((value) => (
          <label
            key={value}
            className="flex items-center gap-2 rounded-xl border border-ink-300 p-3 text-sm has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50 dark:border-ink-700 dark:has-[:checked]:bg-brand-700/20"
          >
            <input
              type="radio"
              name={`${id}-theme`}
              checked={theme === value}
              onChange={() => {
                applyTheme(value);
                setChosen(value);
              }}
            />
            <Icon name={ICON[value]} />
            {t(`themes.${value}`)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
