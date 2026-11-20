import { consumeRateLimit } from '@boramarcar/db';
import { getDb } from '@/server/db';
import { clientKey, RATE_LIMITS } from '@/server/limits';

const MAX_BYTES = 16_000;

/**
 * Lê o corpo até `max` bytes. Sem `Content-Length` (corpo em partes), parar no teto evita ler
 * megabytes à toa; acima do teto, `null` (descartado).
 */
async function readCapped(request: Request, max: number): Promise<string | null> {
  const reader = request.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

/**
 * Recebe relatórios de violação da CSP (`report-uri` em `lib/csp.ts`) e registra uma linha curta
 * no log (Vercel), sem dados pessoais: só a diretiva, o destino bloqueado e a página. Corpo
 * grande demais ou acima do limite por endereço é descartado em silêncio (sempre 204).
 */
export async function POST(request: Request) {
  const ignored = new Response(null, { status: 204 });
  if (Number(request.headers.get('content-length') ?? 0) > MAX_BYTES) return ignored;
  try {
    await consumeRateLimit(getDb(), `csp:${await clientKey(request)}`, RATE_LIMITS.cspReport);
  } catch {
    return ignored;
  }
  const text = await readCapped(request, MAX_BYTES);
  if (text === null) return ignored;
  try {
    const body = JSON.parse(text) as { 'csp-report'?: Record<string, unknown> };
    const report = body['csp-report'];
    if (report) {
      const page = String(report['document-uri'] ?? '').split('?')[0] ?? '';
      console.warn(
        `[csp] ${String(report['violated-directive'] ?? report['effective-directive'] ?? '?')} ` +
          `bloqueou ${String(report['blocked-uri'] ?? '?').slice(0, 200)} em ${page.slice(0, 200)}`,
      );
    }
  } catch {
    // Corpo inválido: ignora.
  }
  return new Response(null, { status: 204 });
}
