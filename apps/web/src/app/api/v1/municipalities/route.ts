import { consumeRateLimit, searchMunicipalities } from '@boramarcar/db';
import { getDb } from '@/server/db';
import { errorResponse } from '@/server/http';
import { clientKey, RATE_LIMITS } from '@/server/limits';

/**
 * Cidades do IBGE pelo começo do nome (10.3), para escolher a cidade da loja, do perfil e da
 * descoberta. Pública (a descoberta abre sem conta), com limite por endereço.
 */
export async function GET(request: Request) {
  try {
    const db = getDb();
    await consumeRateLimit(db, `municipalities:${await clientKey(request)}`, RATE_LIMITS.search);
    const q = new URL(request.url).searchParams.get('q') ?? '';
    return Response.json({
      municipalities: (await searchMunicipalities(db, { query: q.slice(0, 80) })).map(
        ({ code, name, uf, slug }) => ({ code, name, uf, slug }),
      ),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
