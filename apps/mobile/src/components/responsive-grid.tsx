import { Children, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { gridColumns } from '@/lib/layout';

/**
 * Grade de cartões (listas de torneios, lojas, eventos): mede a largura disponível e põe 2 ou 3
 * colunas no tablet (cartões de no mínimo `min` pt); no celular, uma coluna. A ordem de leitura
 * é a da lista (linha por linha).
 */
export function ResponsiveGrid({
  children,
  min = 300,
  max = 3,
  gap = 12,
}: {
  children: ReactNode;
  min?: number;
  max?: number;
  gap?: number;
}) {
  const [width, setWidth] = useState(0);
  const items = Children.toArray(children);
  const columns = width ? gridColumns(width, { min, max, gap }) : 1;
  const rows: ReactNode[][] = [];
  for (let i = 0; i < items.length; i += columns) rows.push(items.slice(i, i + columns));
  return (
    <View style={{ gap }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {rows.map((row, r) => (
        <View key={r} style={{ flexDirection: 'row', gap }}>
          {row.map((item, c) => (
            <View key={c} style={{ flex: 1 }}>
              {item}
            </View>
          ))}
          {Array.from({ length: columns - row.length }, (_, i) => (
            <View key={`empty-${i}`} style={{ flex: 1 }} />
          ))}
        </View>
      ))}
    </View>
  );
}
