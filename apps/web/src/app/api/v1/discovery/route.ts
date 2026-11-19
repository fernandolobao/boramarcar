import { DomainError } from '@boramarcar/core';
import { isStoreOffer, roundCoord, validCoords, type StoreOffer } from '@boramarcar/core/discovery';
import { consumeRateLimit, findNearby, getMunicipality } from '@boramarcar/db';
import { getDb } from '@/server/db';
import { errorResponse } from '@/server/http';
import { clientKey, RATE_LIMITS } from '@/server/limits';

const list = (value: string | null) =>
  (value ?? '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, 20);

/**
 * Lojas e eventos por perto (10.3), sem login: `?city=<uf>/<cidade>` (centro da cidade) ou
 * `?lat=&lng=` (posição do aparelho, arredondada a ~1 km e nunca guardada nem registrada).
 * Filtros opcionais, separados por vírgula: `formats`, `kinds`, `offers`.
 */
export async function GET(request: Request) {
  try {
    const db = getDb();
    await consumeRateLimit(db, `discovery:${await clientKey(request)}`, RATE_LIMITS.discovery);
    const params = new URL(request.url).searchParams;
    const filters = {
      formats: list(params.get('formats')),
      kinds: list(params.get('kinds')).filter(
        (k): k is 'tournament' | 'casual' => k === 'tournament' || k === 'casual',
      ),
      offers: list(params.get('offers')).filter((o): o is StoreOffer => isStoreOffer(o)),
    };
    const city = params.get('city');
    if (city) {
      const [uf = '', slug = ''] = city.split('/');
      const municipality = await getMunicipality(db, { uf, slug });
      if (!municipality) throw new DomainError('not_found', 'Cidade não encontrada');
      const found = await findNearby(db, {
        lat: municipality.lat,
        lng: municipality.lng,
        ...filters,
      });
      return Response.json(
        {
          origin: {
            kind: 'city',
            city: { name: municipality.name, uf: municipality.uf, slug: municipality.slug },
          },
          ...found,
        },
        // Igual para todo mundo: o CDN guarda por 5 minutos.
        { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300' } },
      );
    }
    if (params.has('lat') || params.has('lng')) {
      const point = validCoords(params.get('lat'), params.get('lng'));
      if (!point) throw new DomainError('invalid_input', 'Localização inválida');
      const found = await findNearby(db, {
        lat: roundCoord(point.lat),
        lng: roundCoord(point.lng),
        ...filters,
      });
      return Response.json(
        { origin: { kind: 'device' }, ...found },
        { headers: { 'Cache-Control': 'private, no-store' } },
      );
    }
    throw new DomainError('invalid_input', 'Informe a cidade ou a localização');
  } catch (error) {
    return errorResponse(error);
  }
}
