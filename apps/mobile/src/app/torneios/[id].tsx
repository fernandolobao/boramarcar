import { ApiError, type TournamentView } from '@boramarcar/api-client';
import { tableModeEligible } from '@boramarcar/core/tournaments';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { ConfirmButton } from '@/components/confirm-button';
import { Choices } from '@/components/ds/choices';
import { NumberField } from '@/components/ds/number-field';
import { Select } from '@/components/ds/select';
import { formatLabel } from '@/components/table/labels';
import { AppText, Button, Card, ErrorState, Loading, styles } from '@/components/ui';
import { api } from '@/lib/api';
import { authClient } from '@/lib/auth';
import { t, type MessageKey } from '@/lib/i18n';
import { useAsync, useRefreshOnFocus } from '@/lib/use-async';

const STATUS: Record<string, MessageKey> = {
  registration: 'tourStatusRegistration',
  running: 'tourStatusRunning',
  finished: 'tourStatusFinished',
};
const DRAW = '__empate__';
const percent = (v: number) => `${Math.round(v * 1000) / 10}%`;

type Table = TournamentView['rounds'][number]['tables'][number];
type Entrant = TournamentView['entrants'][number];

/** Resultado de uma mesa: no pod, quem venceu (ou empate); no par, jogos de cada um. */
function ResultForm({
  view,
  table,
  seated,
  onSaved,
}: {
  view: TournamentView;
  table: Table;
  seated: Entrant[];
  onSaved: () => Promise<void>;
}) {
  const pod = view.tournament.table === 'pod';
  const needed = Math.ceil(view.tournament.bestOf / 2);
  const [winner, setWinner] = useState<string | null>(null);
  const [wins, setWins] = useState<Record<string, number | null>>(
    Object.fromEntries(seated.map((s) => [s.id, table.gameWins[s.id] ?? 0])),
  );
  const [draws, setDraws] = useState<number | null>(table.gameDraws);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const body = pod
    ? winner === DRAW
      ? { gameWins: {}, gameDraws: 1 }
      : { gameWins: winner ? { [winner]: 1 } : {}, gameDraws: 0 }
    : {
        gameWins: Object.fromEntries(seated.map((s) => [s.id, wins[s.id] ?? 0])),
        gameDraws: draws ?? 0,
      };
  const ready = pod
    ? winner !== null
    : Object.values(body.gameWins).some((v) => v > 0) || body.gameDraws > 0;
  const save = async () => {
    setBusy(true);
    setError('');
    try {
      await api.tournaments.report(view.tournament.id, table.id, body);
      await onSaved();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('loadError'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={{ gap: 10 }}>
      {pod ? (
        <Choices
          label={t('tourWinnerOf', { number: table.number })}
          value={winner}
          onChange={setWinner}
          orientation="vertical"
          options={[
            ...seated.map((s) => ({ value: s.id, label: s.name })),
            { value: DRAW, label: t('tourDraw') },
          ]}
        />
      ) : (
        <>
          {seated.map((s) => (
            <NumberField
              key={s.id}
              label={t('tourGamesWonBy', { name: s.name })}
              value={wins[s.id] ?? 0}
              onChange={(v) => setWins((w) => ({ ...w, [s.id]: v }))}
              min={0}
              max={needed}
            />
          ))}
          {view.tournament.bestOf > 1 && (
            <NumberField
              label={t('tourGamesDrawn')}
              value={draws}
              onChange={setDraws}
              min={0}
              max={view.tournament.bestOf}
            />
          )}
        </>
      )}
      {error ? <AppText accessibilityRole="alert">{error}</AppText> : null}
      <Button
        label={table.reported ? t('tourCorrect') : t('tourSaveResult')}
        accessibilityLabel={`${table.reported ? t('tourCorrect') : t('tourSaveResult')} (${t('tourTable', { number: table.number })})`}
        disabled={busy || !ready}
        onPress={() => void save()}
      />
    </View>
  );
}

/** Página do torneio (9.1): inscrições, rodadas e mesas, classificação e organização. */

/** Nome da fase do top cut (9.2). */
const STAGE: Record<'quarterfinal' | 'semifinal' | 'final', MessageKey> = {
  quarterfinal: 'tourStageQuarterfinal',
  semifinal: 'tourStageSemifinal',
  final: 'tourStageFinal',
};
export default function TournamentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: session } = authClient.useSession();
  const me = session?.user.id ?? '';
  const view = useAsync(() => api.tournaments.get(id), [id]);
  const members = useAsync(
    // Torneio de loja (sem grupo): a inscrição é pelo evento, então não há membros para escolher.
    async () =>
      view.data?.tournament.groupId ? api.groups.members(view.data.tournament.groupId) : [],
    [view.data?.tournament.groupId],
  );
  useRefreshOnFocus(view.refresh);
  const [person, setPerson] = useState<string | null>(null);
  const [partner, setPartner] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [correcting, setCorrecting] = useState<string | null>(null);

  if (view.loading) return <Loading />;
  if (view.error || !view.data) return <ErrorState error={view.error} onRetry={view.refresh} />;
  const v = view.data;
  const tour = v.tournament;
  const nameOf = new Map(v.entrants.map((e) => [e.id, e.name]));
  const taken = new Set(v.entrants.flatMap((e) => e.memberIds));
  const free = (members.data ?? []).filter((m) => !taken.has(m.userId));
  const current = v.rounds.at(-1);
  const nextStep = v.nextStep ?? null;

  const act = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    try {
      await action();
      await view.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('loadError'));
    } finally {
      setBusy(false);
    }
  };
  const resultText = (table: Table) => {
    if (tour.table === 'pod') {
      const w = table.entrants.find((e) => (table.gameWins[e] ?? 0) > 0);
      return w ? t('tourPodWinner', { name: nameOf.get(w) ?? '—' }) : t('tourDraw');
    }
    const line = table.entrants
      .map((e) => `${nameOf.get(e) ?? '—'}: ${table.gameWins[e] ?? 0}`)
      .join(' · ');
    return table.gameDraws > 0 ? `${line} · ${t('tourDraw')}: ${table.gameDraws}` : line;
  };

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 16 }}
      refreshControl={<RefreshControl refreshing={view.refreshing} onRefresh={view.refresh} />}
    >
      <Stack.Screen options={{ title: tour.name }} />
      <View style={{ gap: 4 }}>
        <AppText accessibilityRole="header" style={styles.title}>
          {tour.name}
        </AppText>
        <AppText muted>
          {formatLabel(tour.format)} · {t('tourBestOfOption', { count: tour.bestOf })} ·{' '}
          {v.event?.title ?? ''}
        </AppText>
        <AppText style={{ fontWeight: '700' }}>
          {t(STATUS[tour.status] ?? 'tourStatusRunning')}
        </AppText>
      </View>
      {error ? <AppText accessibilityRole="alert">{error}</AppText> : null}

      {tour.status === 'registration' && (
        <Card style={{ gap: 10 }}>
          <AppText accessibilityRole="header" style={styles.sectionTitle}>
            {t('tourEntrantsTitle')} · {t('tourEntrants', { count: v.entrants.length })}
          </AppText>
          {v.entrants.length === 0 ? <AppText muted>{t('tourNoEntrants')}</AppText> : null}
          {v.entrants.map((e) => (
            <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <AppText style={{ flex: 1, fontWeight: '600' }}>{e.name}</AppText>
              {(v.canManage || e.memberIds.includes(me)) && (
                <ConfirmButton
                  label={t('tourRemove')}
                  confirmLabel={t('tourRemoveConfirm')}
                  context={e.name}
                  disabled={busy}
                  onConfirm={() => act(() => api.tournaments.removeEntrant(tour.id, e.id))}
                />
              )}
            </View>
          ))}
          {tour.entrantSize === 1 && !taken.has(me) && (
            <Button
              label={t('tourJoinMe')}
              disabled={busy}
              onPress={() => void act(() => api.tournaments.addEntrant(tour.id, [me]))}
            />
          )}
          {(v.canManage || tour.entrantSize === 2) && free.length >= tour.entrantSize && (
            <View style={{ gap: 8 }}>
              {(v.canManage || tour.entrantSize === 1) && (
                <Select
                  label={t('tourAddPerson')}
                  value={person}
                  onChange={setPerson}
                  options={free.map((m) => ({ value: m.userId, label: m.name }))}
                />
              )}
              {tour.entrantSize === 2 && (
                <Select
                  label={t('tourAddPartner')}
                  value={partner}
                  onChange={setPartner}
                  options={free
                    .filter((m) => m.userId !== (v.canManage ? person : me))
                    .map((m) => ({ value: m.userId, label: m.name }))}
                />
              )}
              <Button
                label={t('tourAddEntrant')}
                variant="secondary"
                disabled={
                  busy ||
                  (tour.entrantSize === 1
                    ? !person
                    : !partner || (v.canManage ? !person : taken.has(me)))
                }
                onPress={() =>
                  void act(async () => {
                    await api.tournaments.addEntrant(
                      tour.id,
                      tour.entrantSize === 1 ? [person!] : [v.canManage ? person! : me, partner!],
                    );
                    setPerson(null);
                    setPartner(null);
                  })
                }
              />
            </View>
          )}
        </Card>
      )}

      {v.champion && (
        <Card>
          <AppText accessibilityLiveRegion="polite" style={{ fontWeight: '700', fontSize: 18 }}>
            🏆{' '}
            {t('tourChampion', { name: v.entrants.find((e) => e.id === v.champion)?.name ?? '—' })}
          </AppText>
        </Card>
      )}

      {[...v.rounds].reverse().map((round, index) => (
        <Card key={round.id} style={{ gap: 12 }}>
          <AppText accessibilityRole="header" style={styles.sectionTitle}>
            {tour.structure === 'double_elimination'
              ? round.tables.some((x) => x.bracket === 'final')
                ? t('tourBracketFinal')
                : t('tourRoundSimple', { number: round.number })
              : round.stageName && tour.structure === 'single_elimination'
                ? t(STAGE[round.stageName])
                : round.stageName && tour.topCut
                  ? t('tourStageHeading', {
                      size: tour.topCut,
                      stage: t(STAGE[round.stageName]),
                    })
                  : t('tourRoundOf', { number: round.number, total: tour.rounds ?? round.number })}
          </AppText>
          {round.tables.map((table) => {
            const seated = table.entrants.map(
              (eid) =>
                v.entrants.find((e) => e.id === eid) ?? { id: eid, name: '—', memberIds: [] },
            );
            if (seated.length === 1) {
              return (
                <AppText key={table.id} muted>
                  {t('tourBye', { name: seated[0]!.name })}
                </AppText>
              );
            }
            const atTable = seated.some((s) => s.memberIds.includes(me));
            const canReport =
              index === 0 &&
              tour.status === 'running' &&
              (v.canManage || (atTable && !table.reported));
            return (
              <View key={table.id} style={{ gap: 6 }}>
                <AppText accessibilityRole="header" style={styles.sectionTitle}>
                  {t('tourTable', { number: table.number })}
                  {table.bracket && table.bracket !== 'final'
                    ? ` · ${t(table.bracket === 'winners' ? 'tourBracketWinners' : 'tourBracketLosers')}`
                    : ''}
                </AppText>
                <AppText>{seated.map((s, i) => `${i + 1}. ${s.name}`).join('\n')}</AppText>
                <AppText
                  accessibilityLiveRegion="polite"
                  style={{ fontWeight: table.reported ? '600' : '400' }}
                  muted={!table.reported}
                >
                  {table.reported ? `${t('tourResult')}: ${resultText(table)}` : t('tourWaiting')}
                </AppText>
                {/* Modo mesa (pod ou melhor de 1): jogadores já na mesa; o resultado volta para cá. */}
                {canReport && tour.eventId && tableModeEligible(tour, table) && (
                  <Button
                    label={t('tourOpenInTable')}
                    accessibilityLabel={`${t('tourOpenInTable')} (${t('tourTable', { number: table.number })})`}
                    onPress={() =>
                      router.push({
                        pathname: '/mesa/[id]',
                        params: { id: tour.eventId!, torneio: tour.id, mesa: table.id },
                      })
                    }
                  />
                )}
                {canReport &&
                  (table.reported && correcting !== table.id ? (
                    <Button
                      label={t('tourCorrect')}
                      accessibilityLabel={`${t('tourCorrect')} (${t('tourTable', { number: table.number })})`}
                      variant="secondary"
                      onPress={() => setCorrecting(table.id)}
                      style={{ alignSelf: 'flex-start' }}
                    />
                  ) : (
                    <ResultForm
                      view={v}
                      table={table}
                      seated={seated}
                      onSaved={async () => {
                        setCorrecting(null);
                        await view.refresh();
                      }}
                    />
                  ))}
              </View>
            );
          })}
        </Card>
      ))}

      {tour.status !== 'registration' &&
        tour.structure !== 'single_elimination' &&
        tour.structure !== 'double_elimination' && (
          <Card style={{ gap: 8 }}>
            <AppText accessibilityRole="header" style={styles.sectionTitle}>
              {tour.topCut ? t('tourStandingsSwiss') : t('tourStandings')}
            </AppText>
            {v.standings.map((s) => {
              const line = t('tourStandingRow', {
                rank: s.rank,
                name: nameOf.get(s.entrant) ?? '—',
                points: s.points,
                record: `${s.wins + s.byes}-${s.draws}-${s.losses}`,
              });
              const tie = `OMW ${percent(s.omw)} · GW ${percent(s.gw)} · OGW ${percent(s.ogw)}`;
              return (
                <View key={s.entrant} accessible accessibilityLabel={`${line}. ${tie}`}>
                  <AppText style={{ fontWeight: '600' }}>{line}</AppText>
                  <AppText muted>{tie}</AppText>
                </View>
              );
            })}
            <AppText muted>{t('tourTiebreakers')}</AppText>
          </Card>
        )}

      {v.canManage && tour.status !== 'finished' && (
        <Card style={{ gap: 10 }}>
          <AppText accessibilityRole="header" style={styles.sectionTitle}>
            {t('tourManage')}
          </AppText>
          {tour.status === 'registration' && (
            <Button
              label={t('tourStart')}
              disabled={busy || v.entrants.length < 2}
              onPress={() => void act(() => api.tournaments.start(tour.id))}
            />
          )}
          {tour.status === 'running' && (
            <>
              <Button
                label={
                  nextStep === 'finish'
                    ? t('tourFinish')
                    : nextStep === 'topCut'
                      ? t('tourStartTopCut', { count: tour.topCut ?? 0 })
                      : current?.stage === 'top'
                        ? t('tourNextStage')
                        : t('tourNext')
                }
                disabled={busy || !nextStep}
                onPress={() => void act(() => api.tournaments.next(tour.id))}
              />
              {!nextStep && <AppText muted>{t('tourNextHint')}</AppText>}
            </>
          )}
          <ConfirmButton
            label={t('tourDelete')}
            confirmLabel={t('tourDeleteConfirm')}
            context={tour.name}
            disabled={busy}
            onConfirm={async () => {
              await act(() => api.tournaments.remove(tour.id));
              router.back();
            }}
          />
        </Card>
      )}
    </ScrollView>
  );
}
