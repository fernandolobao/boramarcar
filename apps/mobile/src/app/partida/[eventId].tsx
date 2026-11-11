import { ApiError } from '@boramarcar/api-client';
import { GAME_FORMATS, type GameFormat } from '@boramarcar/core/games';
import { tableSupportsFormat } from '@boramarcar/core/table';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { TextField } from '@/components/fields';
import { formatLabel } from '@/components/table/labels';
import { AppText, Button, Card, ErrorState, Loading, styles } from '@/components/ui';
import { api } from '@/lib/api';
import { t } from '@/lib/i18n';
import { useColors } from '@/lib/theme';
import { useAsync } from '@/lib/use-async';

const FORMATS = GAME_FORMATS.filter(tableSupportsFormat);
const row = { flexDirection: 'row', flexWrap: 'wrap', gap: 8 } as const;

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <Card style={{ gap: 10 }}>
      <AppText accessibilityRole="header" style={{ fontWeight: '700', fontSize: 18 }}>
        {title}
      </AppText>
      {hint ? <AppText muted>{hint}</AppText> : null}
      {children}
    </Card>
  );
}

/** Número inteiro opcional digitado (vazio = sem valor). */
const optionalInt = (text: string) => (text.trim() ? Number(text) : null);

/**
 * Registrar partida no app (5.4): tipo de jogo, quem jogou (com o deck), vencedor ou empate, quem
 * começou, turno da vitória, duração e observações. Partidas em times seguem no site.
 */
export default function RecordGameScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const colors = useColors();
  const setup = useAsync(() => api.table.get(eventId), [eventId]);
  const [format, setFormat] = useState<GameFormat | null>(null);
  const [selected, setSelected] = useState<string[] | null>(null);
  const [decks, setDecks] = useState<Record<string, string | null>>({});
  const [winner, setWinner] = useState<string | null>(null);
  const [first, setFirst] = useState<string | null>(null);
  const [turn, setTurn] = useState('');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (setup.loading) return <Loading />;
  if (setup.error || !setup.data) return <ErrorState error={setup.error} onRetry={setup.refresh} />;
  const data = setup.data;
  const chosenFormat: GameFormat =
    format ??
    ((FORMATS as readonly string[]).includes(data.defaultFormat)
      ? (data.defaultFormat as GameFormat)
      : 'commander');
  const players =
    selected ?? data.players.filter((p) => p.confirmed).map((p) => p.userId);
  const byId = new Map(data.players.map((p) => [p.userId, p]));
  const toggle = (userId: string) => {
    const next = players.includes(userId)
      ? players.filter((id) => id !== userId)
      : [...players, userId];
    setSelected(next);
    if (winner && winner !== 'draw' && !next.includes(winner)) setWinner(null);
    if (first && !next.includes(first)) setFirst(null);
  };
  const turnValue = optionalInt(turn);
  const durationValue = optionalInt(duration);

  const save = async () => {
    setError('');
    if (players.length < 2) return setError(t('gameNeedPlayers'));
    if (!winner) return setError(t('gameNeedResult'));
    if (turnValue !== null && !(Number.isInteger(turnValue) && turnValue >= 1 && turnValue <= 99)) {
      return setError(t('gameTurnInvalid'));
    }
    if (
      durationValue !== null &&
      !(Number.isInteger(durationValue) && durationValue >= 1 && durationValue <= 1440)
    ) {
      return setError(t('gameDurationInvalid'));
    }
    setSaving(true);
    try {
      await api.games.record(eventId, {
        format: chosenFormat,
        firstPlayerId: first,
        winningTurn: turnValue,
        durationMinutes: durationValue,
        notes: notes.trim() || null,
        players: players.map((userId, i) => ({
          userId,
          deckId: decks[userId] ?? null,
          seat: i + 1,
          result: winner === 'draw' ? 'draw' : userId === winner ? 'win' : 'loss',
        })),
      });
      router.back();
    } catch (e) {
      setError(
        t('gameError', { message: e instanceof ApiError ? e.message : t('loadError') }),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: t('gameTitle') }} />
      <View>
        <AppText accessibilityRole="header" style={styles.title}>
          {t('gameTitle')}
        </AppText>
        <AppText muted>{data.title}</AppText>
      </View>

      <Section title={t('tableFormat')} hint={t('gameTeamsWeb')}>
        <View style={row} accessibilityRole="radiogroup" accessibilityLabel={t('tableFormat')}>
          {FORMATS.map((f) => (
            <Button
              key={f}
              label={formatLabel(f)}
              variant="secondary"
              accessibilityRole="radio"
              accessibilityState={{ checked: chosenFormat === f }}
              selected={chosenFormat === f}
              onPress={() => setFormat(f)}
            />
          ))}
        </View>
      </Section>

      <Section title={t('gamePlayers')}>
        {data.players.map((p) => {
          const checked = players.includes(p.userId);
          return (
            <View key={p.userId} style={{ gap: 6 }}>
              <Button
                label={`${checked ? '✓ ' : ''}${p.name}${p.confirmed ? ` (${t('tableConfirmed')})` : ''}`}
                variant="secondary"
                accessibilityRole="checkbox"
                accessibilityState={{ checked }}
                selected={checked}
                onPress={() => toggle(p.userId)}
                style={{ alignItems: 'flex-start' }}
              />
              {checked && p.decks.length > 0 && (
                <View
                  style={[row, { paddingStart: 12 }]}
                  accessibilityRole="radiogroup"
                  accessibilityLabel={t('gameDeckOf', { name: p.name })}
                >
                  {[{ id: null, name: t('tableNoDeck') }, ...p.decks].map((d) => (
                    <Button
                      key={d.id ?? 'none'}
                      label={d.name}
                      variant="secondary"
                      accessibilityRole="radio"
                      accessibilityState={{ checked: (decks[p.userId] ?? null) === d.id }}
                      selected={(decks[p.userId] ?? null) === d.id}
                      onPress={() => setDecks((all) => ({ ...all, [p.userId]: d.id }))}
                    />
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </Section>

      <Section title={t('gameResult')}>
        <View style={{ gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel={t('gameResult')}>
          {players.map((userId) => (
            <Button
              key={userId}
              label={t('gameWinnerOption', { name: byId.get(userId)?.name ?? '' })}
              variant="secondary"
              accessibilityRole="radio"
              accessibilityState={{ checked: winner === userId }}
              selected={winner === userId}
              onPress={() => setWinner(userId)}
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
      </Section>

      <Section title={t('gameDetails')}>
        <AppText style={{ fontWeight: '600' }}>{t('tableFirstPlayer')}</AppText>
        <View style={row} accessibilityRole="radiogroup" accessibilityLabel={t('tableFirstPlayer')}>
          {[{ id: null as string | null, name: t('tableUnknown') }, ...players.map((id) => ({ id, name: byId.get(id)?.name ?? '' }))].map(
            (p) => (
              <Button
                key={p.id ?? 'unknown'}
                label={p.name}
                variant="secondary"
                accessibilityRole="radio"
                accessibilityState={{ checked: first === p.id }}
                selected={first === p.id}
                onPress={() => setFirst(p.id)}
              />
            ),
          )}
        </View>
        <TextField
          label={t('tableWinningTurn')}
          keyboardType="number-pad"
          maxLength={2}
          value={turn}
          onChangeText={setTurn}
        />
        <TextField
          label={t('gameDuration')}
          keyboardType="number-pad"
          maxLength={4}
          value={duration}
          onChangeText={setDuration}
        />
        <TextField label={t('gameNotes')} maxLength={500} multiline value={notes} onChangeText={setNotes} />
      </Section>

      {error !== '' && (
        <AppText accessibilityRole="alert" accessibilityLiveRegion="assertive" style={{ color: colors.danger }}>
          {error}
        </AppText>
      )}
      <Button label={t('tableSave')} disabled={saving} onPress={() => void save()} />
    </ScrollView>
  );
}
