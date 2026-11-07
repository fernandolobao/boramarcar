'use client';

import { tableReducer, type TableAction, type TableState } from '@boramarcar/core';
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';

const key = (eventId: string) => `bm-mesa:${eventId}`;

/** Lê a mesa salva neste aparelho (sobrevive a recarregar a página ou bloquear a tela). */
export function loadTable(eventId: string): TableState | null {
  try {
    const raw = localStorage.getItem(key(eventId));
    return raw ? (JSON.parse(raw) as TableState) : null;
  } catch {
    return null;
  }
}

const CHANGE = 'bm-mesa-change';

export function clearTable(eventId: string) {
  try {
    localStorage.removeItem(key(eventId));
  } catch {
    // Armazenamento bloqueado: nada a limpar.
  }
  window.dispatchEvent(new Event(CHANGE));
}

const subscribe = (notify: () => void) => {
  window.addEventListener('storage', notify);
  window.addEventListener(CHANGE, notify);
  return () => {
    window.removeEventListener('storage', notify);
    window.removeEventListener(CHANGE, notify);
  };
};

/** Mesa salva neste aparelho, sem diferença entre servidor e cliente na hidratação. */
export function useSavedTable(eventId: string): TableState | null {
  const raw = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return localStorage.getItem(key(eventId));
      } catch {
        return null;
      }
    },
    () => null,
  );
  return useMemo(() => {
    try {
      return raw ? (JSON.parse(raw) as TableState) : null;
    } catch {
      return null;
    }
  }, [raw]);
}

/** Estado da mesa com o reducer do core, guardado no aparelho a cada mudança. */
export function useTable(eventId: string, initial: TableState) {
  const [state, setState] = useState(initial);
  useEffect(() => {
    try {
      // O histórico de desfazer fica só na memória (pode ser grande).
      localStorage.setItem(key(eventId), JSON.stringify({ ...state, undo: [] }));
    } catch {
      // Sem armazenamento: a mesa vale até fechar a página.
    }
  }, [eventId, state]);
  const dispatch = useCallback(
    (action: TableAction) => setState((s) => tableReducer(s, action)),
    [],
  );
  return [state, dispatch] as const;
}

/** Mantém a tela acesa durante a partida, quando o navegador permite. */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let released = false;
    const request = () =>
      navigator.wakeLock
        .request('screen')
        .then((l) => {
          if (released) void l.release();
          else lock = l;
        })
        .catch(() => undefined);
    void request();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void request();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      released = true;
      document.removeEventListener('visibilitychange', onVisible);
      void lock?.release();
    };
  }, [active]);
}
