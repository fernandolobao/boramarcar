'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { ApiError } from '@/lib/api';

const KNOWN = [
  'invalid_input',
  'unauthorized',
  'forbidden',
  'not_found',
  'conflict',
  'upstream_error',
] as const;

/** Executa uma ação contra a API, traduz o erro e atualiza os Server Components. */
export function useApiAction() {
  const t = useTranslations('errors');
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function run<T>(action: () => Promise<T>, after?: (result: T) => void) {
    setError(null);
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
    }
  }

  return { run, error, pending };
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
      {message}
    </p>
  );
}
