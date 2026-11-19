import {
  boundingBox,
  DISCOVERY_DAYS,
  DISCOVERY_RADIUS_KM,
  distanceKm,
  type Point,
  type StoreOffer,
} from '@boramarcar/core/discovery';
import { and, asc, count, eq, gte, inArray, isNotNull, sql } from 'drizzle-orm';
import type { Database } from '../client';
import { municipalities, storeEventEntries, storeEvents, stores } from '../schema';

/**
 * Descoberta de lojas e eventos por perto (10.3): lojas a até `radiusKm` do ponto (centro da
 * cidade escolhida ou posição do aparelho) e os eventos agendados delas. Posição da loja: o
 * endereço ou, sem ele, o centro do município; loja sem município (cidade a confirmar) fica de
 * fora. Só dados da loja e números de vagas — nada de quem se inscreveu.
 */
export async function findNearby(
  db: Database,
  input: Point & {
    radiusKm?: number;
    days?: number;
    now?: Date;
    formats?: string[];
    kinds?: ('tournament' | 'casual')[];
    offers?: StoreOffer[];
  },
) {
  const radiusKm = input.radiusKm ?? DISCOVERY_RADIUS_KM;
  const now = input.now ?? new Date();
  const until = new Date(now.getTime() + (input.days ?? DISCOVERY_DAYS) * 86_400_000);
  const box = boundingBox(input, radiusKm);
  const lat = sql<number>`coalesce(${stores.lat}, ${municipalities.lat})`;
  const lng = sql<number>`coalesce(${stores.lng}, ${municipalities.lng})`;
  // Filtro barato pelo retângulo no banco; a distância exata (haversine) vem depois.
  const candidates = await db
    .select({
      id: stores.id,
      slug: stores.slug,
      name: stores.name,
      logoUrl: stores.logoUrl,
      verified: stores.verified,
      offers: stores.offers,
      formats: stores.formats,
      lat,
      lng,
      municipality: {
        name: municipalities.name,
        uf: municipalities.uf,
        slug: municipalities.slug,
      },
    })
    .from(stores)
    .innerJoin(municipalities, eq(municipalities.code, stores.municipalityCode))
    .where(
      and(
        sql`${lat} between ${box.minLat} and ${box.maxLat}`,
        sql`${lng} between ${box.minLng} and ${box.maxLng}`,
      ),
    );
  const nearby = candidates
    .map((s) => ({ ...s, distanceKm: Math.round(distanceKm(input, s) * 10) / 10 }))
    .filter((s) => s.distanceKm <= radiusKm)
    .filter((s) => !input.offers?.length || input.offers.every((o) => s.offers.includes(o)))
    .sort((a, b) => a.distanceKm - b.distanceKm || a.name.localeCompare(b.name));
  if (!nearby.length) return { events: [], stores: [] };

  const upcoming = await db
    .select({
      id: storeEvents.id,
      storeId: storeEvents.storeId,
      title: storeEvents.title,
      startsAt: storeEvents.startsAt,
      format: storeEvents.format,
      kind: storeEvents.kind,
      capacity: storeEvents.capacity,
    })
    .from(storeEvents)
    .where(
      and(
        inArray(
          storeEvents.storeId,
          nearby.map((s) => s.id),
        ),
        eq(storeEvents.status, 'scheduled'),
        gte(storeEvents.startsAt, now),
      ),
    )
    .orderBy(asc(storeEvents.startsAt));
  const inWindow = upcoming.filter(
    (e) =>
      e.startsAt < until &&
      (!input.formats?.length || input.formats.includes(e.format)) &&
      (!input.kinds?.length || (input.kinds as string[]).includes(e.kind)),
  );
  const counts = inWindow.length
    ? await db
        .select({
          eventId: storeEventEntries.storeEventId,
          status: storeEventEntries.status,
          n: count(),
        })
        .from(storeEventEntries)
        .where(
          inArray(
            storeEventEntries.storeEventId,
            inWindow.map((e) => e.id),
          ),
        )
        .groupBy(storeEventEntries.storeEventId, storeEventEntries.status)
    : [];
  const countOf = (eventId: string, status: string) =>
    Number(counts.find((c) => c.eventId === eventId && c.status === status)?.n ?? 0);
  const storeOf = new Map(nearby.map((s) => [s.id, s]));

  return {
    events: inWindow
      .map((e) => {
        const s = storeOf.get(e.storeId)!;
        return {
          id: e.id,
          title: e.title,
          startsAt: e.startsAt,
          format: e.format,
          kind: e.kind,
          capacity: e.capacity,
          registered: countOf(e.id, 'registered'),
          waitlist: countOf(e.id, 'waitlist'),
          distanceKm: s.distanceKm,
          store: {
            name: s.name,
            slug: s.slug,
            municipality: { name: s.municipality.name, uf: s.municipality.uf },
          },
        };
      })
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime() || a.distanceKm - b.distanceKm),
    stores: nearby.map(({ lat: _lat, lng: _lng, ...s }) => {
      const next = upcoming.find((e) => e.storeId === s.id);
      return {
        ...s,
        nextEvent: next ? { id: next.id, title: next.title, startsAt: next.startsAt } : null,
      };
    }),
  };
}
export type Nearby = Awaited<ReturnType<typeof findNearby>>;
export type NearbyEvent = Nearby['events'][number];
export type NearbyStore = Nearby['stores'][number];

/** Municípios com loja própria (para o sitemap e a escolha de cidade), com quantas lojas. */
export async function citiesWithStores(db: Database) {
  return db
    .select({
      code: municipalities.code,
      name: municipalities.name,
      uf: municipalities.uf,
      slug: municipalities.slug,
      lat: municipalities.lat,
      lng: municipalities.lng,
      stores: count(),
    })
    .from(stores)
    .innerJoin(municipalities, eq(municipalities.code, stores.municipalityCode))
    .where(isNotNull(stores.municipalityCode))
    .groupBy(municipalities.code)
    .orderBy(asc(municipalities.name))
    .then((rows) => rows.map((r) => ({ ...r, stores: Number(r.stores) })));
}

/** As cidades com loja mais próximas de um ponto (quando não há loja no raio). */
export async function nearestCitiesWithStores(db: Database, input: Point & { limit?: number }) {
  return (await citiesWithStores(db))
    .map((c) => ({ ...c, distanceKm: Math.round(distanceKm(input, c) * 10) / 10 }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, input.limit ?? 5);
}
