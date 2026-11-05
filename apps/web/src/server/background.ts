import 'server-only';
import { after } from 'next/server';

/**
 * Roda a tarefa depois de a resposta ser enviada (`after` do Next), para o usuário não esperar o
 * envio de e-mails. Fora de uma requisição (scripts), roda na hora. Erros só vão para o log.
 * Nos testes, `src/test/setup.ts` troca esta função por uma fila (`flushBackground`).
 */
export function runAfterResponse(task: () => Promise<unknown>) {
  const safe = () =>
    task().catch((error: unknown) => console.error('[notify] falha ao enviar avisos', error));
  try {
    after(safe);
  } catch {
    void safe();
  }
}
