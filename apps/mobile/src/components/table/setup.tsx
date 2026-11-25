import type { TableSetup } from '@boramarcar/api-client';
import { GAME_FORMATS, type GameFormat } from '@boramarcar/core/games';
import {
  createTable,
  startingLifeFor,
  tableSupportsFormat,
  type TableState,
} from '@boramarcar/core/table';
import { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { AppText, Button, Card, styles as ui } from '@/components/ui';
import { t } from '@/lib/i18n';
import { useColors } from '@/lib/theme';
import { formatLabel } from './labels';
import { Choices } from '@/components/ds/choices';
import { Tip } from '@/components/tip';
import { Checkbox } from '@/components/ds/checkbox';

const MAX_PLAYERS = 6;
const FORMATS = GAME_FORMATS.filter(tableSupportsFormat);

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <AppText accessibilityRole="header" style={{ fontWeight: '700' }}>
        {title}
      </AppText>
      {children}
    </Card>
  );
}

/** Montar a mesa: tipo de jogo, vida inicial, jogadores, ordem e decks. */
export function TableSetupScreen({
  setup,
  saved,
  onStart,
  onDiscard,
  onBack,
  tournament,
}: {
  setup: TableSetup;
  saved: TableState | null;
  onStart: (state: TableState) => void;
  onDiscard: () => void;
  onBack: () => void;
  /** Mesa de torneio (9.1): formato e jogadores já definidos (só a ordem e os decks mudam). */
  tournament?: { name: string; tableNumber: number; format: string; seats: string[] };
}) {
  const colors = useColors();
  const preferred = tournament?.format ?? setup.defaultFormat;
  const initialFormat = (FORMATS as readonly string[]).includes(preferred)
    ? (preferred as GameFormat)
    : 'commander';
  const [format, setFormat] = useState<GameFormat>(initialFormat);
  const [life, setLife] = useState(String(startingLifeFor(initialFormat)));
  const [seats, setSeats] = useState<string[]>(
    tournament
      ? tournament.seats
      : setup.players
          .filter((p) => p.confirmed)
          .slice(0, MAX_PLAYERS)
          .map((p) => p.userId),
  );
  const [decks, setDecks] = useState<Record<string, string | null>>({});
  const byId = new Map(setup.players.map((p) => [p.userId, p]));
  const lifeValue = Number(life);
  const valid =
    seats.length >= 2 && Number.isInteger(lifeValue) && lifeValue > 0 && lifeValue <= 999;

  const toggle = (userId: string) =>
    setSeats((s) =>
      s.includes(userId)
        ? s.filter((x) => x !== userId)
        : s.length < MAX_PLAYERS
          ? [...s, userId]
          : s,
    );
  const move = (index: number, by: number) =>
    setSeats((s) => {
      const next = [...s];
      const [item] = next.splice(index, 1);
      next.splice(Math.max(0, Math.min(next.length, index + by)), 0, item!);
      return next;
    });

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <View>
        <AppText accessibilityRole="header" style={ui.title}>
          {t('tableTitle')}
        </AppText>
        <AppText muted>
          {tournament
            ? t('tableTournamentIntro', { name: tournament.name, table: tournament.tableNumber })
            : t('tableIntro')}
        </AppText>
      </View>
      <Tip id="table" />

      {saved && (
        <Section title={t('tableSavedTitle')}>
          <AppText muted>
            {t('tableSavedHint', { players: saved.players.map((p) => p.name).join(', ') })}
          </AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Button label={t('tableResume')} onPress={() => onStart(saved)} />
            <Button label={t('tableDiscard')} variant="secondary" onPress={onDiscard} />
          </View>
        </Section>
      )}

      {!tournament && (
        <Section title={t('tableFormat')}>
          <Choices
            label={t('tableFormat')}
            hideLabel
            value={format}
            onChange={(f) => {
              setFormat(f);
              setLife(String(startingLifeFor(f)));
            }}
            options={FORMATS.map((f) => ({ value: f, label: formatLabel(f) }))}
          />
        </Section>
      )}

      <Section title={t('tableStartingLife')}>
        <TextInput
          accessibilityLabel={t('tableStartingLife')}
          keyboardType="number-pad"
          maxLength={3}
          value={life}
          onChangeText={setLife}
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
      </Section>

      {!tournament && (
        <Section title={t('tablePlayers', { max: MAX_PLAYERS })}>
          {setup.players.map((p) => {
            const checked = seats.includes(p.userId);
            return (
              <Checkbox
                key={p.userId}
                label={`${p.name}${p.confirmed ? ` (${t('tableConfirmed')})` : ''}`}
                checked={checked}
                disabled={!checked && seats.length >= MAX_PLAYERS}
                onChange={() => toggle(p.userId)}
                style={{ alignItems: 'flex-start' }}
              />
            );
          })}
        </Section>
      )}

      {seats.length > 0 && (
        <Section title={t('tableSeatOrder')}>
          <AppText muted>{t('tableSeatOrderHint')}</AppText>
          {seats.map((userId, i) => {
            const p = byId.get(userId)!;
            const chosen = decks[userId] ?? null;
            return (
              <View
                key={userId}
                style={{
                  gap: 8,
                  paddingVertical: 10,
                  borderTopWidth: i ? 1 : 0,
                  borderColor: colors.border,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <AppText style={{ flex: 1, fontWeight: '700' }}>
                    {i + 1}. {p.name}
                  </AppText>
                  <Button
                    label="↑"
                    variant="secondary"
                    accessibilityLabel={t('tableMoveUp', { name: p.name })}
                    disabled={i === 0}
                    onPress={() => move(i, -1)}
                  />
                  <Button
                    label="↓"
                    variant="secondary"
                    accessibilityLabel={t('tableMoveDown', { name: p.name })}
                    disabled={i === seats.length - 1}
                    onPress={() => move(i, 1)}
                  />
                </View>
                {p.decks.length > 0 && (
                  <Choices
                    label={`${p.name} · ${t('tableDeck')}`}
                    hideLabel
                    // '' = sem deck.
                    value={chosen ?? ''}
                    onChange={(v) => setDecks((all) => ({ ...all, [userId]: v === '' ? null : v }))}
                    options={[{ id: null, name: t('tableNoDeck') }, ...p.decks].map((d) => ({
                      value: d.id ?? '',
                      label: d.name,
                    }))}
                  />
                )}
              </View>
            );
          })}
        </Section>
      )}

      {seats.length < 2 && <AppText muted>{t('tableNeedTwo')}</AppText>}
      <Button
        label={t('tableStart')}
        disabled={!valid}
        onPress={() =>
          onStart(
            createTable({
              format,
              startingLife: lifeValue,
              players: seats.map((userId) => ({
                userId,
                name: byId.get(userId)!.name,
                deckId: decks[userId] ?? null,
                commanders:
                  byId.get(userId)!.decks.find((d) => d.id === decks[userId])?.commanders ?? [],
              })),
            }),
          )
        }
      />
      <Button label={t('tableBack')} variant="secondary" onPress={onBack} />
    </ScrollView>
  );
}
