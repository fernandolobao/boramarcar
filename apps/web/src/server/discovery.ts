import 'server-only';
import {
  findNearby,
  getMunicipality,
  nearestCitiesWithStores,
  type Database,
  type Municipality,
} from '@boramarcar/db';
import type { DiscoveryData } from '@/components/discovery/discovery-view';

/** Lojas e eventos a partir do centro da cidade, já prontos para o componente (datas em texto). */
export async function discoveryFor(db: Database, city: Municipality) {
  const found = await findNearby(db, { lat: city.lat, lng: city.lng });
  const data: DiscoveryData = {
    events: found.events.map((e) => ({ ...e, startsAt: e.startsAt.toISOString() })),
    stores: found.stores.map((s) => ({
      ...s,
      nextEvent: s.nextEvent
        ? { ...s.nextEvent, startsAt: s.nextEvent.startsAt.toISOString() }
        : null,
    })),
  };
  const nearest = found.stores.length
    ? []
    : (await nearestCitiesWithStores(db, { lat: city.lat, lng: city.lng, limit: 5 })).map(
        ({ name, uf, slug }) => ({ name, uf, slug }),
      );
  return { data, nearest, raw: found };
}

/** Cidade a partir de `uf/cidade` (parâmetro ou cookie); `null` se não existe. */
export async function cityFromParam(db: Database, value: string | null | undefined) {
  if (!value) return null;
  const [uf = '', slug = ''] = decodeURIComponent(value).split('/');
  return getMunicipality(db, { uf, slug });
}
