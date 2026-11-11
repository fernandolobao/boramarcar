'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import { activity, pressedButton } from '@/lib/activity';
import { ApiError } from '@/lib/api';

const KNOWN = [
  'invalid_input',
  'unauthorized',
  'forbidden',
  'not_found',
  'conflict',
  'upstream_error',
] as const;

/**
 * Executa uma ação contra a API, traduz o erro e atualiza os Server Components. Enquanto a ação
 * roda (inclusive a espera pelo servidor), `pending` fica verdadeiro, o botão que a disparou
 * mostra um indicador de carregamento (`aria-busy`) e a barra do topo aparece.
 */
export function useApiAction() {
  const t = useTranslations('errors');
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshing, startTransition] = useTransition();
  // Uma ação de cada vez: clique duplo, ou Enter seguido do "perdeu o foco" quando o campo é
  // desabilitado, não disparam a mesma ação de novo enquanto a primeira não termina.
  const inFlight = useRef(false);

  async function run<T>(action: () => Promise<T>, after?: (result: T) => void) {
    if (inFlight.current) return undefined;
    inFlight.current = true;
    setError(null);
    setBusy(true);
    const button = typeof document === 'undefined' ? null : pressedButton();
    button?.setAttribute('aria-busy', 'true');
    activity.start();
    try {
      const result = await action();
      startTransition(() => {
        after?.(result);
        router.refresh();
      });
      return result;
    } catch (e) {
      const code = e instanceof ApiError ? e.code : 'internal_error';
      const known = (KNOWN as readonly string[]).includes(code)
        ? (code as (typeof KNOWN)[number])
        : 'internal_error';
      // Mensagens específicas do servidor (pt-BR) são mais úteis para erros de validação de domínio.
      setError(
        e instanceof ApiError && known === 'invalid_input' && e.message !== 'Dados inválidos'
          ? e.message
          : t(known),
      );
      return undefined;
    } finally {
      inFlight.current = false;
      setBusy(false);
      button?.removeAttribute('aria-busy');
      activity.done();
    }
  }

  return { run, error, pending: busy || refreshing };
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
      {message}
    </p>
  );
}
