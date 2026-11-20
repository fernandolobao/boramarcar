/**
 * O Better Auth confia nos previews deste projeto por um padrão com `*`
 * (`PREVIEW_ORIGINS`, ver trusted-origins.ts), que também aceita hífens: uma equipe de outra pessoa na
 * Vercel cujo nome termine em `-fernandolobaos-projects` geraria endereços que passam no padrão. Os
 * padrões do Better Auth não expressam "exatamente 9 letras ou números", então esta guarda, na rota
 * `/api/auth/*`, recusa pedidos e redirecionamentos para qualquer `*.vercel.app` que não seja o
 * endereço de deploy deste projeto. O endereço do branch (`boramarcar-git-…`) fica de fora: o nome
 * do branch tem hífens e não dá para separá-lo do nome de outra equipe.
 */
const OUR_DEPLOYMENT_HOST = /^boramarcar-[a-z0-9]{9}-fernandolobaos-projects\.vercel\.app$/;

/** A URL aponta para a Vercel, mas não para um deploy deste projeto? */
export function isForeignVercelUrl(value: string): boolean {
  if (!/^https?:\/\//i.test(value)) return false;
  let host: string;
  try {
    host = new URL(value).hostname.toLowerCase();
  } catch {
    return false;
  }
  return (host === 'vercel.app' || host.endsWith('.vercel.app')) && !OUR_DEPLOYMENT_HOST.test(host);
}

const forbidden = () =>
  Response.json(
    { error: { code: 'forbidden', message: 'Destino não permitido' } },
    { status: 403 },
  );

/** Textos do pedido que podem virar destino: parâmetros da URL, campos do JSON e a origem. */
async function requestTargets(req: Request): Promise<string[]> {
  const values = [...new URL(req.url).searchParams.values()];
  const origin = req.headers.get('origin');
  if (origin) values.push(origin);
  if (req.method !== 'GET' && req.headers.get('content-type')?.includes('application/json')) {
    const body: unknown = await req
      .clone()
      .json()
      .catch(() => null);
    if (body && typeof body === 'object') {
      for (const v of Object.values(body)) if (typeof v === 'string') values.push(v);
    }
  }
  return values;
}

/** Envolve o handler do Better Auth com a guarda (pedido e redirecionamento da resposta). */
export function withAuthGuard(handler: (req: Request) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    if ((await requestTargets(req)).some(isForeignVercelUrl)) return forbidden();
    const res = await handler(req);
    const location = res.headers.get('location');
    if (location && isForeignVercelUrl(location)) return forbidden();
    return res;
  };
}
