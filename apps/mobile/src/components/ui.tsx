import { ApiError } from '@boramarcar/api-client';
import { palette, radius } from '@boramarcar/tokens';
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
import { Icon, type IconName } from '@/components/icons';
import { fonts } from '@/lib/fonts';

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

/**
 * Sombras do sistema (as mesmas duas do site, `shadow.rest` e `shadow.raised` nos tokens), no
 * formato do React Native: iOS usa `shadow*`, Android usa `elevation`.
 */
export const elevation = {
  rest: {
    shadowColor: palette.noite,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  raised: {
    shadowColor: palette.noite,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 6,
  },
} as const;

export function Card({ style, ...props }: ViewProps) {
  const colors = useColors();
  return (
    <View
      {...props}
      style={[
        styles.card,
        elevation.rest,
        { backgroundColor: colors.surface, borderColor: colors.line },
        style,
      ]}
    />
  );
}

/** Botão com alvo de toque ≥ 44 pt, estado exposto e foco visível do sistema. */
export function Button({
  label,
  variant = 'primary',
  selected,
  icon,
  style,
  ...props
}: PressableProps & {
  label: string;
  variant?: 'primary' | 'secondary';
  selected?: boolean;
  /** Ícone à esquerda do texto (o mesmo do site para a mesma ação). */
  icon?: IconName;
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
          opacity: props.disabled ? 0.5 : state.pressed ? 0.9 : 1,
          // Afunda 1 pt no toque, como o botão do site no clique.
          transform: [{ translateY: state.pressed && !props.disabled ? 1 : 0 }],
        },
        typeof style === 'function' ? style(state) : style,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {icon ? <Icon name={icon} color={primary ? colors.brandText : colors.text} /> : null}
        <Text
          style={[styles.buttonText, { color: primary ? colors.brandText : colors.text }]}
          maxFontSizeMultiplier={2}
        >
          {label}
        </Text>
      </View>
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
  /** Título da página (Fraunces, como `page-title` no site). */
  title: { fontSize: 26, fontFamily: fonts.display, marginBottom: 12 },
  /** Título de seção (Fraunces, como `section-title` no site). */
  sectionTitle: { fontSize: 19, fontFamily: fonts.display },
  card: { borderWidth: 1, borderRadius: radius.card, padding: 16, gap: 6 },
  button: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: radius.control,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontSize: 16, fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
});
