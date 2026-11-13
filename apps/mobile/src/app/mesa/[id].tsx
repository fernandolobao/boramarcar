import { tableReducer, type TableAction, type TableState } from '@boramarcar/core/table';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { NavigationBar } from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
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

/** Modo mesa (5.6): montar a mesa, contar a vida e registrar a partida no encontro. */
export default function TableScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const setup = useAsync(() => api.table.get(id), [id]);
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

  if (phase === 'playing' && state) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
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
        <Stack.Screen options={{ headerShown: true, title: t('tableFinishTitle') }} />
        <TableFinishScreen
          eventId={id}
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

  if (setup.loading) return <Loading />;
  if (setup.error || !setup.data) return <ErrorState error={setup.error} onRetry={setup.refresh} />;
  if (setup.data.status === 'cancelled') {
    return (
      <AppText style={[styles.center, { textAlign: 'center' }]}>{t('tableCancelled')}</AppText>
    );
  }
  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: t('tableTitle') }} />
      <TableSetupScreen
        setup={setup.data}
        saved={saved}
        onStart={start}
        onDiscard={() => {
          clearTable(id);
          setSaved(null);
        }}
        onBack={leave}
      />
    </>
  );
}
