import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

/** Tarefas que as rotas agendaram para depois da resposta (e-mails). */
export const backgroundTasks: (() => Promise<unknown>)[] = [];

/** Executa (e esvazia) as tarefas agendadas com `runAfterResponse`. */
export async function flushBackground() {
  const tasks = backgroundTasks.splice(0);
  for (const task of tasks) await task();
}

vi.mock('@/server/background', () => ({
  runAfterResponse: (task: () => Promise<unknown>) => {
    backgroundTasks.push(task);
  },
}));
