'use client';

import { tableReducer, type TableAction, type TableState } from '@boramarcar/core';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';

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

export type KeepAwakeStatus = 'pending' | 'native' | 'video' | 'unavailable';

/**
 * Mantém a tela acesa durante a partida. Usa a API de wake lock quando existe; onde não existe ou
 * ela é recusada (Chrome no iPhone, modo de baixo consumo), toca em loop o vídeo invisível de
 * `videoRef` — um vídeo em reprodução impede o bloqueio automático. Pede de novo ao voltar para a
 * aba ou ao entrar/sair da tela cheia, porque o sistema solta o bloqueio nessas horas.
 */
export function useKeepAwake(active: boolean) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [status, setStatus] = useState<KeepAwakeStatus>('pending');
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let lock: WakeLockSentinel | null = null;
    const video = videoRef.current;
    const playVideo = () => {
      if (!video) return setStatus('unavailable');
      // `Promise.resolve().then` também cobre navegadores antigos em que `play()` não devolve promessa.
      Promise.resolve()
        .then(() => video.play())
        .then(() => !cancelled && setStatus('video'))
        .catch(() => !cancelled && setStatus('unavailable'));
    };
    const request = () => {
      if (!('wakeLock' in navigator)) return playVideo();
      navigator.wakeLock
        .request('screen')
        .then((l) => {
          if (cancelled) return void l.release();
          lock = l;
          setStatus('native');
        })
        .catch(playVideo);
    };
    request();
    const again = () => {
      if (document.visibilityState === 'visible') request();
    };
    document.addEventListener('visibilitychange', again);
    document.addEventListener('fullscreenchange', again);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', again);
      document.removeEventListener('fullscreenchange', again);
      void lock?.release();
      video?.pause();
    };
  }, [active]);
  return { status, videoRef };
}

/** Pede tela cheia (precisa vir de um toque do usuário); sem suporte, não faz nada. */
export function enterFullscreen() {
  if (typeof document === 'undefined') return;
  document.documentElement.requestFullscreen?.({ navigationUI: 'hide' }).catch(() => undefined);
}

export function exitFullscreen() {
  if (typeof document === 'undefined' || !document.fullscreenElement) return;
  document.exitFullscreen?.().catch(() => undefined);
}

const subscribeFullscreen = (notify: () => void) => {
  document.addEventListener('fullscreenchange', notify);
  return () => document.removeEventListener('fullscreenchange', notify);
};

/** Aberto como app instalado (PWA): o navegador já não mostra barra nenhuma. */
export function isStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * Tela cheia pela API do navegador (Android, desktop). O Safari e o Chrome do iPhone não têm essa
 * API para páginas: lá, `supported` é falso e o caminho é instalar o app na tela inicial.
 */
export function useFullscreen() {
  const active = useSyncExternalStore(
    subscribeFullscreen,
    () => Boolean(document.fullscreenElement),
    () => false,
  );
  const supported =
    typeof document !== 'undefined' &&
    typeof document.documentElement.requestFullscreen === 'function';
  return { supported, active, toggle: () => (active ? exitFullscreen() : enterFullscreen()) };
}
