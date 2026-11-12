import {
  bracketChecklist,
  type BracketCriterion,
  type BracketEstimate,
} from '@boramarcar/core/analysis';
import { View } from 'react-native';
import { AppText } from '@/components/ui';
import { t, type MessageKey } from '@/lib/i18n';
import { useColors, type Colors } from '@/lib/theme';

const TITLES: Record<BracketCriterion, MessageKey> = {
  game_changers: 'bracketGameChangers',
  mass_land_denial: 'bracketMassLandDenial',
  extra_turns: 'bracketExtraTurns',
  two_card_combo: 'bracketTwoCard',
  arguable_combo: 'bracketArguable',
};
const STATUS: Record<'counted' | 'clear' | 'unchecked', MessageKey> = {
  counted: 'bracketCounted',
  clear: 'bracketClear',
  unchecked: 'bracketUnchecked',
};
const slotColor = (colors: Colors, bracket: 2 | 3 | 4) =>
  bracket === 2 ? colors.success : bracket === 3 ? colors.accent : colors.danger;
const bracketLabel = (b: number) => (b >= 4 ? '4+' : String(b));

/**
 * Lista de progresso do bracket (como no site): cada critério oficial, se já conta, o contador
 * por degrau (casas coloridas, decorativas: o número está em texto) e o próximo passo.
 */
export function BracketChecklist({
  bracket,
}: {
  bracket: BracketEstimate & { source: 'spellbook' | 'local' };
}) {
  const colors = useColors();
  const list = bracketChecklist(bracket, bracket.source);
  return (
    <View style={{ gap: 10 }}>
      <AppText muted>
        {t('bracketCountedTotal', { counted: list.counted, total: list.items.length })}
      </AppText>
      {list.items.map((item) => (
        <View
          key={item.code}
          accessible
          style={{
            gap: 4,
            padding: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: item.decisive ? colors.brand : colors.line,
            backgroundColor: item.status === 'counted' ? colors.surface : colors.surfaceMuted,
          }}
        >
          <AppText style={{ fontWeight: '700' }}>
            {item.status === 'counted' ? '✓ ' : ''}
            {t(TITLES[item.code])}
          </AppText>
          <AppText muted>
            {t(STATUS[item.status])}
            {item.status === 'counted'
              ? ` · ${
                  item.implies === 2
                    ? t('bracketNoRaise')
                    : t('bracketImplies', { bracket: bracketLabel(item.implies) })
                }`
              : ''}
            {item.decisive ? ` · ${t('bracketDecisive')}` : ''}
          </AppText>
          {item.status !== 'unchecked' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View
                importantForAccessibility="no-hide-descendants"
                accessibilityElementsHidden
                style={{ flexDirection: 'row', gap: 4 }}
              >
                {item.slots.slice(0, 10).map((slot, i) => (
                  <View
                    key={i}
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 6,
                      borderWidth: 2,
                      borderColor: slotColor(colors, slot),
                      backgroundColor: i < item.count ? slotColor(colors, slot) : 'transparent',
                    }}
                  />
                ))}
              </View>
              <AppText>{t('bracketCount', { count: item.count })}</AppText>
            </View>
          )}
          {item.entries.length > 0 && (
            <AppText>{item.entries.map((e) => e.cards.join(' + ')).join(', ')}</AppText>
          )}
          {item.next && (
            <AppText style={{ fontWeight: '600' }}>
              {item.next.kind === 'add'
                ? t('bracketNextAdd', {
                    amount: item.next.amount,
                    bracket: bracketLabel(item.next.bracket),
                  })
                : item.next.bracket === 2
                  ? t('bracketNextRemoveClear', { amount: item.next.amount })
                  : t('bracketNextRemove', {
                      amount: item.next.amount,
                      bracket: bracketLabel(item.next.bracket),
                    })}
            </AppText>
          )}
        </View>
      ))}
    </View>
  );
}
