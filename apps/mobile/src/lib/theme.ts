import { themes } from '@boramarcar/tokens';
import { useColorScheme } from 'react-native';

/** Cores do app a partir dos design tokens do ArcanaKin (os mesmos do site, contraste AA testado). */
const fromTokens = (t: (typeof themes)['light']) => ({
  /** Fundo da tela (Pergaminho no claro, Noite no escuro). */
  background: t.canvas,
  surface: t.surface,
  surfaceMuted: t.surfaceMuted,
  /** Bordas de campos e botões secundários (≥ 3:1). */
  border: t.lineStrong,
  /** Bordas decorativas (cartões). */
  line: t.line,
  text: t.fg,
  muted: t.fgMuted,
  brand: t.primary,
  brandText: t.onPrimary,
  link: t.link,
  accent: t.accent,
  onAccent: t.onAccent,
  danger: t.danger,
  success: t.success,
});

const light = fromTokens(themes.light);
const dark = fromTokens(themes.dark);
export type Colors = typeof light;

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? dark : light;
}
