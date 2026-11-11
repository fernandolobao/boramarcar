import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

/** Carrega dados assíncronos com estado de carregamento, erro e "puxar para atualizar". */
export function useAsync<T>(load: () => Promise<T>, deps: readonly unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const loadRef = useRef(load);
  loadRef.current = load;

  const run = useCallback(async (isRefresh: boolean) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      setData(await loadRef.current());
      setError(null);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void run(false);
  }, deps);

  return { data, setData, error, loading, refreshing, refresh: () => run(true) };
}

/**
 * Recarrega quando a tela volta a ter o foco (ex.: ao voltar de "Registrar partida" ou do modo
 * mesa), sem repetir a carga inicial. Recarrega como "puxar para atualizar": os dados atuais
 * continuam na tela até os novos chegarem.
 */
export function useRefreshOnFocus(refresh: () => unknown) {
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      void refreshRef.current();
    }, []),
  );
}
