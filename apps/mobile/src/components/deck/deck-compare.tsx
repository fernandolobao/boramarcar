import type { DeckComparison } from '@boramarcar/api-client';
import { ApiError } from '@boramarcar/api-client';
import { useState } from 'react';
import { View } from 'react-native';
import { Choices } from '@/components/ds/choices';
import { ManaCost } from '@/components/mana';
import { AppText, Button } from '@/components/ui';
import { api } from '@/lib/api';
import { locale, t, type MessageKey } from '@/lib/i18n';
import { useColors } from '@/lib/theme';

const percent = (share: number) => `${Math.round(share * 100)}%`;
const num = (value: number | null) =>
  value === null ? '—' : value.toLocaleString(locale, { maximumFractionDigits: 1 });
const METRIC: Record<string, MessageKey> = {
  score: 'compareScore',
  lands: 'compareLands',
  averageCmc: 'compareAverageCmc',
  ramp: 'roleRamp',
  draw: 'roleDraw',
  removal: 'roleRemoval',
  wipe: 'roleWipe',
};

/**
 * Comparação com outros decks do mesmo comandante (4.10), como no site: cada métrica deste deck
 * e a média, as cartas comuns nos outros que faltam aqui e as escolhas próprias.
 */
export function DeckCompare({
  comparison,
  commander,
}: {
  comparison: DeckComparison;
  commander: string;
}) {
  if (comparison.decks === 0) {
    return <AppText muted>{t('compareNone', { commander })}</AppText>;
  }
  return (
    <View style={{ gap: 10 }}>
      <AppText muted>{t('compareHint', { commander, count: comparison.decks })}</AppText>
      {comparison.metrics.map((m) => (
        <View
          key={m.key}
          accessible
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 28 }}
        >
          <AppText style={{ flex: 1 }}>{t(METRIC[m.key] ?? 'compareScore')}</AppText>
          <AppText style={{ fontWeight: '700', fontVariant: ['tabular-nums'] }}>
            {num(m.value)}
          </AppText>
          <AppText
            muted
            style={{ fontVariant: ['tabular-nums'], minWidth: 96, textAlign: 'right' }}
          >
            {t('compareAverage', { value: num(m.average) })}
          </AppText>
        </View>
      ))}
      <AppText accessibilityRole="header" style={{ fontWeight: '700', marginTop: 4 }}>
        {t('compareCommonMissing')}
      </AppText>
      <AppText muted>{t('compareCommonMissingHint')}</AppText>
      {comparison.commonMissing.length === 0 ? (
        <AppText>{t('compareNoCommonMissing')}</AppText>
      ) : (
        comparison.commonMissing.slice(0, 15).map((c) => (
          <AppText key={c.name}>
            {c.name} <AppText muted>({t('compareInShare', { share: percent(c.share) })})</AppText>
          </AppText>
        ))
      )}
      <AppText accessibilityRole="header" style={{ fontWeight: '700', marginTop: 4 }}>
        {t('compareUnique')}
      </AppText>
      <AppText muted>{t('compareUniqueHint')}</AppText>
      {comparison.unique.length === 0 ? (
        <AppText>{t('compareNoUnique')}</AppText>
      ) : (
        <AppText>{comparison.unique.slice(0, 30).join(' · ')}</AppText>
      )}
    </View>
  );
}

/**
 * Alternativas para uma função do deck (4.6): cartas com a mesma função, dentro da identidade de
 * cor e do formato, até o custo escolhido. Carrega só quando a pessoa pede.
 */
export function RoleAlternatives({ deckId, role }: { deckId: string; role: string }) {
  const colors = useColors();
  const [maxCmc, setMaxCmc] = useState('3');
  const [state, setState] = useState<
    | { kind: 'idle' }
    | { kind: 'loading' }
    | {
        kind: 'done';
        cards: { name: string; manaCost?: string | null; typeLine?: string | null }[];
      }
    | { kind: 'error'; message: string }
  >({ kind: 'idle' });
  const roleName = t(`role${role.charAt(0).toUpperCase()}${role.slice(1)}` as MessageKey);
  const load = (cmc: string) => {
    setState({ kind: 'loading' });
    api.decks
      .alternatives(deckId, role, Number(cmc))
      .then((r) => setState({ kind: 'done', cards: r.cards }))
      .catch((e: unknown) =>
        setState({
          kind: 'error',
          message:
            e instanceof ApiError && e.code === 'upstream_error'
              ? t('altUpstream')
              : t('loadError'),
        }),
      );
  };
  const open = state.kind !== 'idle';

  return (
    <View style={{ gap: 6 }}>
      <Button
        label={open ? t('altHide') : t('altShow')}
        accessibilityLabel={`${open ? t('altHide') : t('altShow')} (${roleName})`}
        accessibilityState={{ expanded: open }}
        variant="secondary"
        icon="alternatives"
        style={{ alignSelf: 'flex-start', minHeight: 40 }}
        onPress={() => (open ? setState({ kind: 'idle' }) : load(maxCmc))}
      />
      {open && (
        <View style={{ gap: 6 }} accessibilityLiveRegion="polite">
          <Choices
            label={t('altMaxCmc')}
            value={maxCmc}
            onChange={(v) => {
              setMaxCmc(v);
              load(v);
            }}
            scroll
            options={['1', '2', '3', '4', '5', '6', '7'].map((n) => ({ value: n, label: n }))}
          />
          {state.kind === 'loading' && <AppText muted>{t('altLoading')}</AppText>}
          {state.kind === 'error' && (
            <AppText style={{ color: colors.danger }}>{state.message}</AppText>
          )}
          {state.kind === 'done' &&
            (state.cards.length === 0 ? (
              <AppText>{t('altNone')}</AppText>
            ) : (
              <>
                <AppText muted>{t('altTitle', { role: roleName, maxCmc })}</AppText>
                {state.cards.map((c) => (
                  <View
                    key={c.name}
                    accessible
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 28 }}
                  >
                    <AppText style={{ flex: 1 }} numberOfLines={2}>
                      {c.name}
                    </AppText>
                    <ManaCost cost={c.manaCost ?? undefined} size={14} />
                  </View>
                ))}
              </>
            ))}
        </View>
      )}
    </View>
  );
}
