import { tableReducer, type TableAction, type TableState } from '@boramarcar/core/table';
import { tableModeEligible } from '@boramarcar/core/tournaments';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { NavigationBar } from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { BackHandler, Platform, ToastAndroid } from 'react-native';
import { AppText, ErrorState, Loading, styles } from '@/components/ui';
import { TableBoard } from '@/components/table/board';
import { TableFinishScreen } from '@/components/table/finish';
import { TableSetupScreen } from '@/components/table/setup';
import { api } from '@/lib/api';
import { t } from '@/lib/i18n';
import { clearTable, loadTable, saveTable } from '@/lib/table-store';
import { useAsync } from '@/lib/use-async';

/** Mantém a tela acesa enquanto a mesa está aberta. */
function KeepAwake() {
  useKeepAwake();
  return null;
}

/**
 * Durante a partida, o "voltar" do sistema não fecha a mesa. Quem está na lateral desliza no
 * próprio cartão a partir da borda da tela, e o aparelho lia isso como o gesto de voltar. No iOS o
 * gesto da tela fica desligado (opções da tela); no Android, o voltar do sistema (botão ou gesto da
 * borda) só mostra como sair. Para sair: "Sair" no botão do centro.
 */
function BlockSystemBack() {
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (Platform.OS === 'android') ToastAndroid.show(t('tableBackBlocked'), ToastAndroid.SHORT);
      return true;
    });
    return () => sub.remove();
  }, []);
  return null;
}

/** Modo mesa (5.6): montar a mesa, contar a vida e registrar a partida no encontro. */
export default function TableScreen() {
  const {
    id: eventId,
    torneio,
    mesa,
  } = useLocalSearchParams<{
    id: string;
    torneio?: string;
    mesa?: string;
  }>();
  // Mesa de torneio (9.1): a partida salva no aparelho fica separada da do encontro.
  const id = torneio && mesa ? `${eventId}:${mesa}` : eventId;
  const setup = useAsync(() => api.table.get(eventId), [eventId]);
  const cup = useAsync(
    async () => (torneio && mesa ? api.tournaments.get(torneio) : null),
    [torneio, mesa],
  );
  const [saved, setSaved] = useState(() => loadTable(id));
  const [state, setState] = useState<TableState | null>(null);
  const [phase, setPhase] = useState<'setup' | 'playing' | 'finish'>('setup');

  const start = (next: TableState) => {
    saveTable(id, next);
    setState(next);
    setPhase('playing');
  };
  const dispatch = (action: TableAction) =>
    setState((current) => {
      if (!current) return current;
      const next = tableReducer(current, action);
      saveTable(id, next);
      return next;
    });
  const leave = () => (router.canGoBack() ? router.back() : router.replace('/'));

  // Mesa do torneio: jogadores na ordem dos assentos e a inscrição de cada um.
  const view = cup.data;
  const table = view?.rounds.at(-1)?.tables.find((x) => x.id === mesa);
  const seated = table?.entrants.map((eid) => view!.entrants.find((e) => e.id === eid)!) ?? [];
  const tournament =
    view && table && tableModeEligible(view.tournament, table)
      ? {
          id: view.tournament.id,
          name: view.tournament.name,
          tableId: table.id,
          tableNumber: table.number,
          format: view.tournament.format,
          seats: seated.map((e) => e.memberIds[0]!),
          entrantOf: Object.fromEntries(seated.map((e) => [e.memberIds[0]!, e.id])),
        }
      : undefined;

  if (phase === 'playing' && state) {
    return (
      <>
        {/* Fundo da tela inteira escuro: nenhuma faixa clara aparece se o tabuleiro não cobrir tudo
            (ex.: altura ainda não recalculada ao esconder a barra de status no iPad). */}
        <Stack.Screen
          options={{
            headerShown: false,
            contentStyle: { backgroundColor: '#09090b' },
            // Sem o gesto de voltar (borda da tela): ele fechava a mesa no meio da partida.
            gestureEnabled: false,
            fullScreenGestureEnabled: false,
          }}
        />
        <BlockSystemBack />
        <StatusBar hidden />
        {/* Android: a barra de navegação some também (volta com um gesto da borda). */}
        <NavigationBar hidden />
        <KeepAwake />
        <TableBoard
          state={state}
          dispatch={dispatch}
          onFinish={() => setPhase('finish')}
          onExit={leave}
        />
      </>
    );
  }
  if (phase === 'finish' && state) {
    return (
      <>
        <Stack.Screen
          options={{ headerShown: true, title: t('tableFinishTitle'), gestureEnabled: true }}
        />
        <TableFinishScreen
          eventId={eventId}
          tournament={tournament}
          state={state}
          onBack={() => setPhase('playing')}
          onSaved={() => {
            clearTable(id);
            leave();
          }}
        />
      </>
    );
  }

  if (setup.loading || cup.loading) return <Loading />;
  if (setup.error || !setup.data) return <ErrorState error={setup.error} onRetry={setup.refresh} />;
  if (cup.error) return <ErrorState error={cup.error} onRetry={cup.refresh} />;
  // Mesa de torneio que não dá para jogar aqui (já tem resultado, melhor de 3…): não cai no modo
  // mesa comum, para a partida não ser gravada fora do torneio.
  if (torneio && mesa && !tournament) {
    return (
      <AppText style={[styles.center, { textAlign: 'center' }]}>
        {t('tourTableUnavailable')}
      </AppText>
    );
  }
  if (setup.data.status === 'cancelled') {
    return (
      <AppText style={[styles.center, { textAlign: 'center' }]}>{t('tableCancelled')}</AppText>
    );
  }
  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: t('tableTitle'), gestureEnabled: true }} />
      <TableSetupScreen
        setup={setup.data}
        saved={saved}
        onStart={start}
        onDiscard={() => {
          clearTable(id);
          setSaved(null);
        }}
        onBack={leave}
        tournament={tournament}
      />
    </>
  );
}
