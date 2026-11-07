import type { Group } from '@boramarcar/api-client';
import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api } from './api';

const KEY = 'boramarcar.active-group';

interface GroupState {
  groups: Group[];
  group: Group | null;
  loading: boolean;
  error: unknown;
  select: (groupId: string) => Promise<void>;
  reload: () => Promise<void>;
}

const GroupContext = createContext<GroupState | null>(null);

/** Grupo ativo do app (lembrado no aparelho), como o seletor de grupo do site. */
export function GroupProvider({ children }: { children: ReactNode }) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [list, saved] = await Promise.all([api.groups.list(), SecureStore.getItemAsync(KEY)]);
      setGroups(list);
      setActiveId(list.some((g) => g.id === saved) ? saved : (list[0]?.id ?? null));
      setError(null);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const select = useCallback(async (groupId: string) => {
    setActiveId(groupId);
    await SecureStore.setItemAsync(KEY, groupId);
  }, []);

  const value = useMemo<GroupState>(
    () => ({
      groups,
      group: groups.find((g) => g.id === activeId) ?? null,
      loading,
      error,
      select,
      reload,
    }),
    [groups, activeId, loading, error, select, reload],
  );
  return <GroupContext.Provider value={value}>{children}</GroupContext.Provider>;
}

export function useGroup() {
  const value = useContext(GroupContext);
  if (!value) throw new Error('useGroup precisa do GroupProvider');
  return value;
}
