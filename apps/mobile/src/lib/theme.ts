import { palette, scales, themes } from '@boramarcar/tokens';
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
  /** Texto e ícones dourados sobre o fundo (contraste AA, como `text-accent-text` no site). */
  accentText: t.accentText,
  danger: t.danger,
  success: t.success,
  /** Quantidade sobre a carta (×2): escuro translúcido, igual ao do site nos dois temas. */
  badgeBg: `${palette.noite}d9`,
  badgeText: palette.pergaminho,
  /** Selo "Foil" sobre a carta (igual ao do site, nos dois temas). */
  foilBg: scales.teal[100],
  foilText: scales.teal[900],
});

const light = fromTokens(themes.light);
const dark = fromTokens(themes.dark);
export type Colors = typeof light;

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? dark : light;
}
