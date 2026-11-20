import { ApiError } from '@boramarcar/api-client';
import { GAME_FORMATS, isGameFormat, type GameFormat } from '@boramarcar/core';
import {
  structureOptions,
  topCutOptions,
  tournamentShape,
  type TournamentStructure,
} from '@boramarcar/core/tournaments';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView } from 'react-native';
import { Checkbox } from '@/components/ds/checkbox';
import { Choices } from '@/components/ds/choices';
import { Select } from '@/components/ds/select';
import { TextField } from '@/components/fields';
import { NoGroup } from '@/components/no-group';
import { formatLabel } from '@/components/table/labels';
import { AppText, Button, ErrorState, Loading, styles } from '@/components/ui';
import { api } from '@/lib/api';
import { useGroup } from '@/lib/group';
import { formatDateMedium, t, type MessageKey } from '@/lib/i18n';
import { useAsync } from '@/lib/use-async';

/** Novo torneio (dono e admins): encontro, nome, formato e, no um contra um, melhor de N. */

const STRUCTURE: Record<TournamentStructure, MessageKey> = {
  swiss: 'tourStructureSwiss',
  single_elimination: 'tourStructureSingle',
  double_elimination: 'tourStructureDouble',
  round_robin: 'tourStructureRoundRobin',
};
export default function NewTournamentScreen() {
  const { encontro } = useLocalSearchParams<{ encontro?: string }>();
  const { group, loading } = useGroup();
  const data = useAsync(
    async () =>
      group ? Promise.all([api.events.list(group.id, 'all'), api.groups.settings(group.id)]) : null,
    [group?.id],
  );
  const [eventId, setEventId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [format, setFormat] = useState<GameFormat | null>(null);
  const [bestOf, setBestOf] = useState<'1' | '3'>('3');
  const [counts, setCounts] = useState(true);
  const [topCut, setTopCut] = useState('');
  const [structure, setStructure] = useState<TournamentStructure>('swiss');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (loading || data.loading) return <Loading />;
  if (!group) return <NoGroup />;
  if (data.error || !data.data) return <ErrorState error={data.error} onRetry={data.refresh} />;
  const [events, settings] = data.data;
  const options = events
    .filter((e) => e.status !== 'cancelled')
    .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime())
    .map((e) => ({ value: e.id, label: `${e.title} · ${formatDateMedium(e.startsAt)}` }));
  const chosenEvent =
    eventId ??
    (options.some((o) => o.value === encontro) ? encontro! : (options[0]?.value ?? null));
  const chosenFormat: GameFormat =
    format ?? (isGameFormat(settings.defaultFormat) ? settings.defaultFormat : 'commander');
  const shape = tournamentShape(chosenFormat);
  const chosenStructure: TournamentStructure = shape.table === 'pair' ? structure : 'swiss';

  const create = async () => {
    if (!chosenEvent) return;
    setBusy(true);
    setError('');
    try {
      const created = await api.tournaments.create(chosenEvent, {
        name: name.trim(),
        format: chosenFormat,
        bestOf: shape.table === 'pair' ? (Number(bestOf) as 1 | 3) : 1,
        countsInRanking: counts,
        topCut:
          chosenStructure === 'swiss' && topCut && shape.entrantSize === 1 ? Number(topCut) : null,
        structure: chosenStructure,
      });
      router.replace({ pathname: '/torneios/[id]', params: { id: created.id } });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('loadError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <AppText accessibilityRole="header" style={styles.title}>
        {t('tourNew')}
      </AppText>
      {options.length === 0 ? (
        <AppText>{t('tourNoEvents')}</AppText>
      ) : (
        <>
          <Select
            label={t('tourEvent')}
            value={chosenEvent}
            onChange={setEventId}
            options={options}
          />
          <TextField label={t('tourName')} value={name} onChangeText={setName} maxLength={120} />
          <Select
            label={t('tourFormat')}
            value={chosenFormat}
            onChange={setFormat}
            description={
              shape.entrantSize === 2
                ? t('tourHintDuo')
                : shape.table === 'pod'
                  ? t('tourHintPod')
                  : t('tourHintPair')
            }
            options={GAME_FORMATS.map((f) => ({ value: f, label: formatLabel(f) }))}
          />
          {shape.table === 'pair' && (
            <Choices
              label={t('tourBestOf')}
              value={bestOf}
              onChange={setBestOf}
              options={[
                { value: '1', label: t('tourBestOfOption', { count: 1 }) },
                { value: '3', label: t('tourBestOfOption', { count: 3 }) },
              ]}
            />
          )}
          {shape.table === 'pair' && (
            <Choices
              label={t('tourStructure')}
              value={structure}
              onChange={setStructure}
              options={structureOptions(shape.table).map((v) => ({
                value: v,
                label: t(STRUCTURE[v]),
              }))}
            />
          )}
          {/* Top cut (9.2): só no suíço; um contra um e pods; no 2HG ainda não. */}
          {chosenStructure === 'swiss' && shape.entrantSize === 1 && (
            <Choices
              label={t('tourTopCut')}
              value={topCut}
              onChange={setTopCut}
              options={[
                { value: '', label: t('tourTopCutNone') },
                ...topCutOptions(shape.table, Number.POSITIVE_INFINITY).map((n) => ({
                  value: String(n),
                  label: t('tourTopCutOption', { count: n }),
                })),
              ]}
            />
          )}
          <Checkbox label={t('tourCounts')} checked={counts} onChange={setCounts} />
          <AppText muted>{t('tourMoreOnSite')}</AppText>
          {error ? <AppText accessibilityRole="alert">{error}</AppText> : null}
          <Button
            label={t('tourCreate')}
            disabled={busy || !name.trim() || !chosenEvent}
            onPress={() => void create()}
          />
        </>
      )}
    </ScrollView>
  );
}
