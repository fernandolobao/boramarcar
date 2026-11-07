import { ApiError } from '@boramarcar/api-client';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type TextProps,
  type ViewProps,
} from 'react-native';
import { t } from '@/lib/i18n';
import { useColors } from '@/lib/theme';

/** Texto com a cor do tema; `muted` para texto secundário (contraste AA). */
export function AppText({ muted, style, ...props }: TextProps & { muted?: boolean }) {
  const colors = useColors();
  // A altura da linha acompanha o tamanho da fonte (senão títulos grandes ficam cortados).
  const flat = StyleSheet.flatten(style) ?? {};
  const fontSize = flat.fontSize ?? styles.text.fontSize;
  return (
    <Text
      {...props}
      style={[
        styles.text,
        { color: muted ? colors.muted : colors.text },
        style,
        flat.lineHeight === undefined && { lineHeight: Math.round(fontSize * 1.35) },
      ]}
      maxFontSizeMultiplier={2}
    />
  );
}

export function Title({ children }: { children: ReactNode }) {
  return (
    <AppText accessibilityRole="header" style={styles.title}>
      {children}
    </AppText>
  );
}

export function Card({ style, ...props }: ViewProps) {
  const colors = useColors();
  return (
    <View
      {...props}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, style]}
    />
  );
}

/** Botão com alvo de toque ≥ 44 pt, estado exposto e foco visível do sistema. */
export function Button({
  label,
  variant = 'primary',
  selected,
  style,
  ...props
}: PressableProps & {
  label: string;
  variant?: 'primary' | 'secondary';
  selected?: boolean;
}) {
  const colors = useColors();
  const primary = variant === 'primary' || selected;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{
        disabled: Boolean(props.disabled),
        ...(selected !== undefined ? { selected } : {}),
      }}
      {...props}
      style={(state) => [
        styles.button,
        {
          backgroundColor: primary ? colors.brand : colors.surface,
          borderColor: primary ? colors.brand : colors.border,
          opacity: props.disabled ? 0.5 : state.pressed ? 0.8 : 1,
        },
        typeof style === 'function' ? style(state) : style,
      ]}
    >
      <Text
        style={[styles.buttonText, { color: primary ? colors.brandText : colors.text }]}
        maxFontSizeMultiplier={2}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Loading() {
  const colors = useColors();
  return (
    <View style={styles.center} accessible accessibilityLabel={t('loading')}>
      <ActivityIndicator color={colors.brand} />
    </View>
  );
}

/** Erro com botão para tentar de novo (anunciado pelo leitor de tela). */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const message =
    error instanceof ApiError && error.code === 'network_error' ? t('offline') : t('loadError');
  return (
    <View style={styles.center}>
      <AppText accessibilityRole="alert" accessibilityLiveRegion="polite">
        {message}
      </AppText>
      <Button label={t('retry')} variant="secondary" onPress={onRetry} />
    </View>
  );
}

export const styles = StyleSheet.create({
  text: { fontSize: 16 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 6 },
  button: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontSize: 16, fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
});
