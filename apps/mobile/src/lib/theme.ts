import { useColorScheme } from 'react-native';

/** Cores do app (mesma marca do site), com contraste AA nos dois temas. */
const light = {
  background: '#fafafa',
  surface: '#ffffff',
  border: '#d4d4d8',
  text: '#18181b',
  muted: '#52525b',
  brand: '#6d28d9',
  brandText: '#ffffff',
  danger: '#b91c1c',
  success: '#15803d',
};
const dark: typeof light = {
  background: '#09090b',
  surface: '#18181b',
  border: '#3f3f46',
  text: '#f4f4f5',
  muted: '#a1a1aa',
  brand: '#a78bfa',
  brandText: '#18181b',
  danger: '#f87171',
  success: '#4ade80',
};
export type Colors = typeof light;

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? dark : light;
}
