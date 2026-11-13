import type { EventHistoryItem } from '@boramarcar/api-client';
import { Link, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { TextField } from '@/components/fields';
import { NoGroup } from '@/components/no-group';
import { AppText, Button, Card, ErrorState, Loading, styles } from '@/components/ui';
import { api } from '@/lib/api';
import { useGroup } from '@/lib/group';
import { formatDateTime, t, type MessageKey } from '@/lib/i18n';
import { useColors } from '@/lib/theme';
import { useAsync } from '@/lib/use-async';

type Status = EventHistoryItem['status'];
const STATUSES: readonly Status[] = ['finished', 'scheduled', 'cancelled'];
const STATUS_LABEL: Record<Status, MessageKey> = {
  finished: 'statusFinished',
  scheduled: 'statusScheduled',
  cancelled: 'statusCancelled',
};

/** Linha de escolhas exclusivas (situação, jogador), lida como um grupo de rádio. */
function Choices<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T | undefined;
  options: readonly { value: T | undefined; label: string }[];
  onChange: (value: T | undefined) => void;
}) {
  return (
    <View style={{ gap: 6 }}>
      <AppText style={{ fontWeight: '600' }}>{label}</AppText>
      <View
        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
        accessibilityRole="radiogroup"
        accessibilityLabel={label}
      >
        {options.map((o) => (
          <Button
            key={o.value ?? ''}
            label={o.label}
            variant="secondary"
            accessibilityRole="radio"
            accessibilityState={{ checked: o.value === value }}
            selected={o.value === value}
            onPress={() => onChange(o.value)}
          />
        ))}
      </View>
    </View>
  );
}

function summary(item: EventHistoryItem) {
  const games =
    item.games === 0
      ? t('historyNoGames')
      : item.games === 1
        ? t('historyOneGame')
        : t('historyGames', { count: item.games });
  const attendees =
    item.attendees === 0
      ? t('historyNoAttendees')
      : item.attendees === 1
        ? t('historyOneAttendee')
        : t('historyAttendees', { count: item.attendees });
  const winners =
    item.winners.length > 0 ? ` · ${t('winner', { names: item.winners.join(', ') })}` : '';
  return `${games} · ${attendees}${winners}`;
}

/** Histórico de encontros passados do grupo (2.10 no site): busca, situação, jogador e páginas. */
export default function HistoryScreen() {
  const { group, loading: loadingGroup, error: groupError, reload } = useGroup();
  const colors = useColors();
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<Status | undefined>();
  const [playerId, setPlayerId] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  // A busca espera a pessoa parar de digitar (meio segundo) antes de ir ao servidor.
  useEffect(() => {
    const timer = setTimeout(() => setQuery(q.trim()), 500);
    return () => clearTimeout(timer);
  }, [q]);
  useEffect(() => setPage(1), [query, status, playerId]);

  const members = useAsync(
    () => (group ? api.groups.members(group.id) : Promise.resolve([])),
    [group?.id],
  );
  const history = useAsync(
    () =>
      group
        ? api.events.history(group.id, { q: query, status, playerId, page })
        : Promise.resolve(null),
    [group?.id, query, status, playerId, page],
  );

  if (loadingGroup) return <Loading />;
  if (groupError) return <ErrorState error={groupError} onRetry={() => void reload()} />;
  if (!group) return <NoGroup />;
  if (history.error) return <ErrorState error={history.error} onRetry={history.refresh} />;
  const data = history.data;
  const filtered = Boolean(query || status || playerId);

  return (
    <>
      <Stack.Screen options={{ title: t('historyTitle') }} />
      <FlatList
        data={data?.items ?? []}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={history.refreshing} onRefresh={history.refresh} />
        }
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 4 }}>
            <AppText accessibilityRole="header" style={[styles.title, { marginBottom: 0 }]}>
              {group.name} · {t('historyTitle')}
            </AppText>
            <Card style={{ gap: 12 }}>
              <TextField
                label={t('historySearch')}
                hint={t('historySearchHint')}
                value={q}
                onChangeText={setQ}
                returnKeyType="search"
                autoCorrect={false}
                maxLength={100}
                clearButtonMode="while-editing"
              />
              <Choices
                label={t('historyStatus')}
                value={status}
                options={[
                  { value: undefined, label: t('historyAll') },
                  ...STATUSES.map((s) => ({ value: s, label: t(STATUS_LABEL[s]) })),
                ]}
                onChange={setStatus}
              />
              {(members.data?.length ?? 0) > 0 && (
                <Choices
                  label={t('historyPlayer')}
                  value={playerId}
                  options={[
                    { value: undefined, label: t('historyAll') },
                    ...(members.data ?? []).map((m) => ({ value: m.userId, label: m.name })),
                  ]}
                  onChange={setPlayerId}
                />
              )}
              {filtered && (
                <Button
                  label={t('historyClear')}
                  variant="secondary"
                  onPress={() => {
                    setQ('');
                    setStatus(undefined);
                    setPlayerId(undefined);
                  }}
                />
              )}
            </Card>
            <AppText accessibilityRole="header" accessibilityLiveRegion="polite" muted>
              {history.loading
                ? t('loading')
                : data
                  ? data.total === 0
                    ? filtered
                      ? t('historyNoResults')
                      : t('historyEmpty')
                    : data.total === 1
                      ? t('historyOneResult')
                      : t('historyResults', { count: data.total })
                  : ''}
            </AppText>
          </View>
        }
        ListEmptyComponent={history.loading ? <Loading /> : undefined}
        renderItem={({ item }) => (
          <Link href={{ pathname: '/encontros/[id]', params: { id: item.id } }} asChild>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={[
                item.title,
                item.status !== 'scheduled' ? t(STATUS_LABEL[item.status]) : null,
                formatDateTime(item.startsAt),
                item.locationName ?? t('locationTbd'),
                summary(item),
              ]
                .filter(Boolean)
                .join(', ')}
              style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
            >
              <Card>
                <AppText style={{ fontWeight: '700' }}>
                  {item.title}
                  {item.status !== 'scheduled' && (
                    <AppText
                      style={{
                        color: item.status === 'cancelled' ? colors.danger : colors.success,
                      }}
                    >
                      {' '}
                      · {t(STATUS_LABEL[item.status])}
                    </AppText>
                  )}
                </AppText>
                <AppText muted>{formatDateTime(item.startsAt)}</AppText>
                <AppText muted>{item.locationName ?? t('locationTbd')}</AppText>
                <AppText>{summary(item)}</AppText>
              </Card>
            </Pressable>
          </Link>
        )}
        ListFooterComponent={
          data && data.pages > 1 ? (
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 }}
              accessibilityRole="toolbar"
              accessibilityLabel={t('historyPagination')}
            >
              <Button
                label={t('historyPrevious')}
                variant="secondary"
                disabled={data.page <= 1}
                onPress={() => setPage((p) => Math.max(1, p - 1))}
              />
              <AppText style={{ flex: 1, textAlign: 'center' }} accessibilityLiveRegion="polite">
                {t('historyPageOf', { page: data.page, pages: data.pages })}
              </AppText>
              <Button
                label={t('historyNext')}
                variant="secondary"
                disabled={data.page >= data.pages}
                onPress={() => setPage((p) => p + 1)}
              />
            </View>
          ) : undefined
        }
      />
    </>
  );
}
