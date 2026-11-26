import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useLayout } from '@/lib/layout';

/**
 * Duas colunas no tablet (15.3), uma só no celular. No celular, `left` e `right` saem em
 * sequência, como filhos diretos do contêiner (a ordem de leitura é a mesma nos dois).
 */
export function SplitColumns({
  left,
  right,
  gap = 12,
  ratio = 1,
}: {
  left: ReactNode;
  right: ReactNode;
  gap?: number;
  /** Largura da direita em relação à esquerda (1 = metade cada). */
  ratio?: number;
}) {
  const { wide } = useLayout();
  if (!wide) {
    return (
      <>
        {left}
        {right}
      </>
    );
  }
  return (
    <View style={{ flexDirection: 'row', gap, alignItems: 'flex-start' }}>
      <View style={{ flex: 1, gap }}>{left}</View>
      <View style={{ flex: ratio, gap }}>{right}</View>
    </View>
  );
}
