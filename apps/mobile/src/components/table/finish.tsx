import {
  tableDurationMinutes,
  tableGamePlayers,
  tableResult,
  type TableState,
} from '@boramarcar/core/table';
import { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { AppText, Button, Card, styles as ui } from '@/components/ui';
import { api } from '@/lib/api';
import { t } from '@/lib/i18n';
import { useColors } from '@/lib/theme';

/** Conferir o resultado sugerido pelo contador e registrar a partida no encontro. */
export function TableFinishScreen({
  eventId,
  state,
  onBack,
  onSaved,
}: {
  eventId: string;
  state: TableState;
  onBack: () => void;
  onSaved: () => void;
}) {
  const colors = useColors();
  const result = tableResult(state);
  const order = new Map(result.eliminated.map((e) => [e.userId, e.order]));
  const [winner, setWinner] = useState<string>(result.winnerId ?? '');
  const [first, setFirst] = useState(state.firstPlayerId ?? '');
  const [turn, setTurn] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const turnValue = turn ? Number(turn) : null;
  const turnValid =
    turnValue === null || (Number.isInteger(turnValue) && turnValue >= 1 && turnValue <= 99);

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await api.games.record(eventId, {
        format: state.format,
        firstPlayerId: first || null,
        winningTurn: turnValue,
        durationMinutes: tableDurationMinutes(state),
        players: tableGamePlayers(state, winner === 'draw' ? null : winner),
      });
      onSaved();
    } catch {
      setError(t('tableSaveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <AppText accessibilityRole="header" style={ui.title}>
        {t('tableFinishTitle')}
      </AppText>
      <Card>
        <AppText accessibilityRole="header" style={{ fontWeight: '700' }}>
          {t('tableWinner')}
        </AppText>
        <AppText muted>{t('tableWinnerHint')}</AppText>
        <View style={{ gap: 8 }} accessibilityRole="radiogroup">
          {state.players.map((p) => (
            <Button
              key={p.userId}
              label={[
                p.name,
                t('tableLifeShort', { life: p.life }),
                order.has(p.userId) ? t('tableOutOrder', { order: order.get(p.userId)! }) : '',
              ]
                .filter(Boolean)
                .join(' · ')}
              variant="secondary"
              accessibilityRole="radio"
              accessibilityState={{ checked: winner === p.userId }}
              selected={winner === p.userId}
              onPress={() => setWinner(p.userId)}
              style={{ alignItems: 'flex-start' }}
            />
          ))}
          <Button
            label={t('tableDraw')}
            variant="secondary"
            accessibilityRole="radio"
            accessibilityState={{ checked: winner === 'draw' }}
            selected={winner === 'draw'}
            onPress={() => setWinner('draw')}
            style={{ alignItems: 'flex-start' }}
          />
        </View>
      </Card>

      <Card>
        <AppText accessibilityRole="header" style={{ fontWeight: '700' }}>
          {t('tableFirstPlayer')}
        </AppText>
        <View
          style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
          accessibilityRole="radiogroup"
        >
          {[{ userId: '', name: t('tableUnknown') }, ...state.players].map((p) => (
            <Button
              key={p.userId || 'unknown'}
              label={p.name}
              variant="secondary"
              accessibilityRole="radio"
              accessibilityState={{ checked: first === p.userId }}
              selected={first === p.userId}
              onPress={() => setFirst(p.userId)}
            />
          ))}
        </View>
      </Card>

      <Card>
        <AppText accessibilityRole="header" style={{ fontWeight: '700' }}>
          {t('tableWinningTurn')}
        </AppText>
        <TextInput
          accessibilityLabel={t('tableWinningTurn')}
          keyboardType="number-pad"
          maxLength={2}
          value={turn}
          onChangeText={setTurn}
          maxFontSizeMultiplier={2}
          style={{
            minHeight: 44,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 12,
            paddingHorizontal: 12,
            fontSize: 18,
            color: colors.text,
            backgroundColor: colors.background,
          }}
        />
        <AppText muted>{t('tableDuration', { minutes: tableDurationMinutes(state) })}</AppText>
      </Card>

      <AppText
        accessibilityRole="alert"
        accessibilityLiveRegion="assertive"
        style={{ color: colors.danger }}
      >
        {error}
      </AppText>
      <Button
        label={t('tableSave')}
        disabled={saving || !winner || !turnValid}
        onPress={() => void save()}
      />
      <Button label={t('tableBackToTable')} variant="secondary" onPress={onBack} />
    </ScrollView>
  );
}
