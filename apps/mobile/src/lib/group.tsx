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
/** Convite aberto antes de entrar (link `arcanakin://convite/CÓDIGO`): usado logo após o login. */
const PENDING_INVITE = 'boramarcar.pending-invite';

/** Guarda o código do convite para entrar no grupo assim que a pessoa fizer login. */
export const savePendingInvite = (code: string) =>
  SecureStore.setItemAsync(PENDING_INVITE, code.trim().toUpperCase());

interface GroupState {
  groups: Group[];
  group: Group | null;
  loading: boolean;
  error: unknown;
  select: (groupId: string) => Promise<void>;
  reload: () => Promise<void>;
  /** Entra pelo código do convite e passa a usar o grupo. */
  join: (inviteCode: string) => Promise<void>;
  /** Cria um grupo e passa a usá-lo. */
  create: (name: string) => Promise<void>;
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
      // Convite aberto antes do login: entra no grupo agora e o deixa ativo.
      const pending = await SecureStore.getItemAsync(PENDING_INVITE);
      if (pending) {
        await SecureStore.deleteItemAsync(PENDING_INVITE);
        const joined = await api.groups.join(pending).catch(() => null);
        if (joined) await SecureStore.setItemAsync(KEY, joined.id);
      }
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

  const join = useCallback(
    async (inviteCode: string) => {
      const group = await api.groups.join(inviteCode.trim().toUpperCase());
      await SecureStore.setItemAsync(KEY, group.id);
      await reload();
    },
    [reload],
  );

  const create = useCallback(
    async (name: string) => {
      const group = await api.groups.create(name.trim());
      await SecureStore.setItemAsync(KEY, group.id);
      await reload();
    },
    [reload],
  );

  const value = useMemo<GroupState>(
    () => ({
      groups,
      group: groups.find((g) => g.id === activeId) ?? null,
      loading,
      error,
      select,
      reload,
      join,
      create,
    }),
    [groups, activeId, loading, error, select, reload, join, create],
  );
  return <GroupContext.Provider value={value}>{children}</GroupContext.Provider>;
}

export function useGroup() {
  const value = useContext(GroupContext);
  if (!value) throw new Error('useGroup precisa do GroupProvider');
  return value;
}
