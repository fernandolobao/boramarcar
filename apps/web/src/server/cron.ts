import 'server-only';
import { timingSafeEqual } from 'node:crypto';
import * as Sentry from '@sentry/nextjs';
import { adminEmails, getBaseUrl, getEnv } from '@/env';
import { deliverEmails } from './email';
import { errorResponse } from './http';

const matches = (given: string, expected: string) => {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};

/**
 * Cron da Vercel: a requisição traz `Authorization: Bearer $CRON_SECRET`. Sem o segredo
 * configurado, as rotas de cron ficam fechadas. Retorna a resposta 401 ou `null` se autorizado.
 */
export function rejectUnauthorizedCron(req: Request): Response | null {
  const secret = getEnv().CRON_SECRET;
  const auth = req.headers.get('authorization') ?? '';
  if (secret && matches(auth, `Bearer ${secret}`)) return null;
  return Response.json(
    { error: { code: 'unauthorized', message: 'Não autorizado' } },
    { status: 401 },
  );
}

/**
 * Roda um cron monitorado (alertas, 8.7): dentro de um monitor de cron do Sentry, que avisa
 * quando ele falha **ou nem roda** no horário; se falhar, o erro também vai para o Sentry e um
 * e-mail curto vai para ADMIN_EMAILS (funciona mesmo sem alerta configurado no Sentry).
 * `slug` é o nome do monitor; `schedule`, o mesmo crontab do `vercel.json` (UTC).
 */
export async function runCron(
  req: Request,
  slug: string,
  schedule: string,
  task: () => Promise<unknown>,
): Promise<Response> {
  const rejected = rejectUnauthorizedCron(req);
  if (rejected) return rejected;
  try {
    const result = await Sentry.withMonitor(slug, task, {
      schedule: { type: 'crontab', value: schedule },
      timezone: 'Etc/UTC',
      // Atraso aceito para começar e tempo máximo, em minutos.
      checkinMargin: 10,
      maxRuntime: 5,
    });
    return Response.json(result);
  } catch (error) {
    Sentry.captureException(error, { tags: { cron: slug } });
    await notifyCronFailure(slug, error).catch((mailError: unknown) =>
      console.error('[cron] aviso por e-mail falhou', mailError),
    );
    return errorResponse(error);
  }
}

/**
 * Tarefas independentes de um mesmo cron (ex.: lembretes, métricas, retrospectiva): cada uma roda
 * mesmo que outra falhe. Cada falha vai ao Sentry com o nome da tarefa; no fim, se alguma falhou,
 * o erro lista quais (o monitor marca o cron como falho e o aviso por e-mail sai).
 */
export async function runSteps<T extends Record<string, () => Promise<unknown>>>(
  steps: T,
): Promise<{ [K in keyof T]: Awaited<ReturnType<T[K]>> }> {
  const results: Record<string, unknown> = {};
  const failed: string[] = [];
  for (const [name, step] of Object.entries(steps)) {
    try {
      results[name] = await step();
    } catch (error) {
      failed.push(name);
      Sentry.captureException(error, { tags: { cronStep: name } });
      console.error(
        `[cron] a tarefa "${name}" falhou`,
        error instanceof Error ? error.message : error,
      );
    }
  }
  if (failed.length) {
    throw new Error(
      `Tarefas que falharam: ${failed.join(', ')} (as outras rodaram: ${JSON.stringify(results)})`,
    );
  }
  return results as { [K in keyof T]: Awaited<ReturnType<T[K]>> };
}

/** E-mail curto para o dono do projeto: qual cron falhou, quando e a mensagem do erro. */
async function notifyCronFailure(slug: string, error: unknown) {
  const to = adminEmails();
  if (to.length === 0) return;
  const message = error instanceof Error ? error.message : String(error);
  const lines = [
    `O cron "${slug}" falhou em ${new Date().toISOString()}.`,
    `Erro: ${message}`,
    'Detalhes no Sentry (tag cron) e nos logs da Vercel.',
  ];
  await deliverEmails(
    to.map((address) => ({
      to: address,
      subject: `ArcanaKin: o cron "${slug}" falhou`,
      text: lines.join('\n'),
      html: `<div style="font-family:system-ui,sans-serif;line-height:1.5">${lines
        .map((l) => `<p style="margin:0 0 8px">${escapeHtml(l)}</p>`)
        .join('')}<p><a href="${getBaseUrl()}/admin">${getBaseUrl()}/admin</a></p></div>`,
    })),
  );
}

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
