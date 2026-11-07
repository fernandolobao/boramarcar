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
}: {
  setup: TableSetup;
  saved: TableState | null;
  onStart: (state: TableState) => void;
  onDiscard: () => void;
  onBack: () => void;
}) {
  const colors = useColors();
  const initialFormat = (FORMATS as readonly string[]).includes(setup.defaultFormat)
    ? (setup.defaultFormat as GameFormat)
    : 'commander';
  const [format, setFormat] = useState<GameFormat>(initialFormat);
  const [life, setLife] = useState(String(startingLifeFor(initialFormat)));
  const [seats, setSeats] = useState<string[]>(
    setup.players
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
        <AppText muted>{t('tableIntro')}</AppText>
      </View>

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

      <Section title={t('tableFormat')}>
        <View
          style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
          accessibilityRole="radiogroup"
        >
          {FORMATS.map((f) => (
            <Button
              key={f}
              label={formatLabel(f)}
              variant="secondary"
              accessibilityRole="radio"
              accessibilityState={{ checked: format === f }}
              selected={format === f}
              onPress={() => {
                setFormat(f);
                setLife(String(startingLifeFor(f)));
              }}
            />
          ))}
        </View>
      </Section>

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

      <Section title={t('tablePlayers', { max: MAX_PLAYERS })}>
        {setup.players.map((p) => {
          const checked = seats.includes(p.userId);
          return (
            <Button
              key={p.userId}
              label={`${checked ? '✓ ' : ''}${p.name}${p.confirmed ? ` (${t('tableConfirmed')})` : ''}`}
              variant="secondary"
              accessibilityRole="checkbox"
              accessibilityState={{
                checked,
                disabled: !checked && seats.length >= MAX_PLAYERS,
              }}
              selected={checked}
              disabled={!checked && seats.length >= MAX_PLAYERS}
              onPress={() => toggle(p.userId)}
              style={{ alignItems: 'flex-start' }}
            />
          );
        })}
      </Section>

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
                  <View
                    style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}
                    accessibilityRole="radiogroup"
                    accessibilityLabel={`${p.name} · ${t('tableDeck')}`}
                  >
                    {[{ id: null, name: t('tableNoDeck') }, ...p.decks].map((d) => (
                      <Button
                        key={d.id ?? 'none'}
                        label={d.name}
                        variant="secondary"
                        accessibilityRole="radio"
                        accessibilityState={{ checked: chosen === d.id }}
                        selected={chosen === d.id}
                        onPress={() => setDecks((all) => ({ ...all, [userId]: d.id }))}
                      />
                    ))}
                  </View>
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
              })),
            }),
          )
        }
      />
      <Button label={t('tableBack')} variant="secondary" onPress={onBack} />
    </ScrollView>
  );
}
