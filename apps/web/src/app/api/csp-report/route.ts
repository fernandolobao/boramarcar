/**
 * Recebe relatórios de violação da CSP (`report-uri` em `lib/csp.ts`) e registra uma linha curta
 * no log (Vercel), sem dados pessoais: só a diretiva, o destino bloqueado e a página.
 */
export async function POST(request: Request) {
  const text = (await request.text()).slice(0, 8_000);
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
