import { DomainError, GAME_FORMATS, isGameFormat } from '@boramarcar/core';
import {
  STORE_INVITE_DAYS,
  normalizeInstagram,
  normalizeWebsite,
  normalizeWhatsapp,
  storeSlug,
  type StoreRole,
} from '@boramarcar/core/stores';
import { randomBytes } from 'node:crypto';
import { and, asc, count, eq, inArray, isNull, like } from 'drizzle-orm';
import type { Database } from '../client';
import { storeInvites, storeMembers, stores, user } from '../schema';

/**
 * Perfis de loja (10.1). Criar a loja e dar o selo de verificada são ações de admin do
 * ArcanaKin: quem chama (a rota) confere isso. O resto confere a equipe da loja aqui.
 */

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const DAY = 86_400_000;

async function uniqueSlug(db: Database, name: string) {
  const base = storeSlug(name);
  const taken = new Set(
    (
      await db
        .select({ slug: stores.slug })
        .from(stores)
        .where(like(stores.slug, `${base}%`))
    ).map((r) => r.slug),
  );
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
}

async function newInvite(
  db: Database,
  input: { storeId: string; email: string; role: StoreRole; createdBy: string; now?: Date },
) {
  const now = input.now ?? new Date();
  const [invite] = await db
    .insert(storeInvites)
    .values({
      storeId: input.storeId,
      email: normalizeEmail(input.email),
      role: input.role,
      token: randomBytes(24).toString('base64url'),
      createdBy: input.createdBy,
      createdAt: now,
      expiresAt: new Date(now.getTime() + STORE_INVITE_DAYS * DAY),
    })
    .returning();
  return invite!;
}

/** Cria a loja (admin do ArcanaKin) e o convite de dono para o e-mail informado. */
export async function createStore(
  db: Database,
  input: { name: string; city: string; email: string; createdBy: string; now?: Date },
) {
  const name = input.name.trim();
  const city = input.city.trim();
  const email = normalizeEmail(input.email);
  if (!name || name.length > 80) throw new DomainError('invalid_input', 'Nome inválido');
  if (!city || city.length > 80) throw new DomainError('invalid_input', 'Cidade inválida');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new DomainError('invalid_input', 'E-mail inválido');
  }
  const [store] = await db
    .insert(stores)
    .values({
      slug: await uniqueSlug(db, name),
      name,
      city,
      contactEmail: email,
      createdBy: input.createdBy,
    })
    .returning();
  const invite = await newInvite(db, {
    storeId: store!.id,
    email,
    role: 'owner',
    createdBy: input.createdBy,
    now: input.now,
  });
  return { store: store!, invite };
}

/** Lojas para o `/admin`: com o e-mail de contato, o tamanho da equipe e o selo. */
export async function listStoresForAdmin(db: Database) {
  const rows = await db.select().from(stores).orderBy(asc(stores.name));
  if (!rows.length) return [];
  const counts = await db
    .select({ storeId: storeMembers.storeId, n: count() })
    .from(storeMembers)
    .where(
      inArray(
        storeMembers.storeId,
        rows.map((r) => r.id),
      ),
    )
    .groupBy(storeMembers.storeId);
  const membersOf = new Map(counts.map((c) => [c.storeId, Number(c.n)]));
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    city: r.city,
    contactEmail: r.contactEmail,
    verified: r.verified,
    members: membersOf.get(r.id) ?? 0,
    createdAt: r.createdAt,
  }));
}

/** Selo de loja verificada (admin do ArcanaKin). */
export async function setStoreVerified(
  db: Database,
  input: { storeId: string; verified: boolean },
) {
  const [row] = await db
    .update(stores)
    .set({ verified: input.verified, updatedAt: new Date() })
    .where(eq(stores.id, input.storeId))
    .returning({ id: stores.id });
  if (!row) throw new DomainError('not_found', 'Loja não encontrada');
}

const publicFields = {
  id: stores.id,
  slug: stores.slug,
  name: stores.name,
  city: stores.city,
  about: stores.about,
  address: stores.address,
  lat: stores.lat,
  lng: stores.lng,
  hours: stores.hours,
  instagram: stores.instagram,
  whatsapp: stores.whatsapp,
  website: stores.website,
  formats: stores.formats,
  verified: stores.verified,
};

/** Perfil público da loja (sem o e-mail de contato); `null` se não existe. */
export async function getStorePublic(db: Database, input: { slug: string }) {
  const [row] = await db
    .select(publicFields)
    .from(stores)
    .where(eq(stores.slug, input.slug))
    .limit(1);
  return row ?? null;
}
export type StorePublic = NonNullable<Awaited<ReturnType<typeof getStorePublic>>>;

/** Confere o papel na equipe da loja (lança `forbidden`); devolve o papel. */
export async function requireStoreRole(
  db: Database,
  storeId: string,
  userId: string,
  roles: readonly StoreRole[],
) {
  const [store] = await db.select({ id: stores.id }).from(stores).where(eq(stores.id, storeId));
  if (!store) throw new DomainError('not_found', 'Loja não encontrada');
  const [member] = await db
    .select({ role: storeMembers.role })
    .from(storeMembers)
    .where(and(eq(storeMembers.storeId, storeId), eq(storeMembers.userId, userId)));
  if (!member || !roles.includes(member.role as StoreRole)) {
    throw new DomainError('forbidden', 'Você não pode fazer isso nesta loja');
  }
  return member.role as StoreRole;
}

/** Perfil para a equipe: dados públicos, equipe e convites pendentes. */
export async function getStoreForManager(
  db: Database,
  input: { slug: string; userId: string; now?: Date },
) {
  const store = await getStorePublic(db, { slug: input.slug });
  if (!store) throw new DomainError('not_found', 'Loja não encontrada');
  const role = await requireStoreRole(db, store.id, input.userId, ['owner', 'staff']);
  const [members, invites] = await Promise.all([
    db
      .select({ userId: storeMembers.userId, role: storeMembers.role, name: user.name })
      .from(storeMembers)
      .innerJoin(user, eq(user.id, storeMembers.userId))
      .where(eq(storeMembers.storeId, store.id))
      .orderBy(asc(storeMembers.createdAt)),
    role === 'owner'
      ? db
          .select({
            id: storeInvites.id,
            email: storeInvites.email,
            role: storeInvites.role,
            expiresAt: storeInvites.expiresAt,
          })
          .from(storeInvites)
          .where(and(eq(storeInvites.storeId, store.id), isNull(storeInvites.acceptedAt)))
          .orderBy(asc(storeInvites.createdAt))
      : [],
  ]);
  const now = input.now ?? new Date();
  return {
    store,
    role,
    members,
    invites: invites.filter((i) => i.expiresAt > now),
  };
}

/** Lojas em que a pessoa está na equipe. */
export async function listMyStores(db: Database, input: { userId: string }) {
  return db
    .select({ slug: stores.slug, name: stores.name, role: storeMembers.role })
    .from(storeMembers)
    .innerJoin(stores, eq(stores.id, storeMembers.storeId))
    .where(eq(storeMembers.userId, input.userId))
    .orderBy(asc(stores.name));
}

const text = (value: string | null | undefined, max: number) => {
  if (value === undefined) return undefined;
  const v = value?.trim() ?? '';
  if (v.length > max) throw new DomainError('invalid_input', 'Texto longo demais');
  return v || null;
};
const contact = (value: string | null | undefined, normalize: (v: string) => string | null) => {
  if (value === undefined) return undefined;
  if (!value || !value.trim()) return null;
  const normalized = normalize(value);
  if (!normalized) throw new DomainError('invalid_input', 'Contato inválido');
  return normalized;
};

/** Edita o perfil (dono ou equipe). Contatos chegam limpos (Instagram, WhatsApp, site). */
export async function updateStore(
  db: Database,
  input: {
    storeId: string;
    userId: string;
    name?: string;
    city?: string;
    about?: string | null;
    address?: string | null;
    lat?: number | null;
    lng?: number | null;
    hours?: string | null;
    instagram?: string | null;
    whatsapp?: string | null;
    website?: string | null;
    formats?: string[];
  },
) {
  await requireStoreRole(db, input.storeId, input.userId, ['owner', 'staff']);
  const name = input.name === undefined ? undefined : input.name.trim();
  const city = input.city === undefined ? undefined : input.city.trim();
  if (name !== undefined && (!name || name.length > 80)) {
    throw new DomainError('invalid_input', 'Nome inválido');
  }
  if (city !== undefined && (!city || city.length > 80)) {
    throw new DomainError('invalid_input', 'Cidade inválida');
  }
  if (input.formats && input.formats.some((f) => !isGameFormat(f))) {
    throw new DomainError('invalid_input', 'Formato inválido');
  }
  const coords = [input.lat, input.lng];
  if (
    coords.some((c) => c !== undefined && c !== null && !Number.isFinite(c)) ||
    (input.lat != null && Math.abs(input.lat) > 90) ||
    (input.lng != null && Math.abs(input.lng) > 180)
  ) {
    throw new DomainError('invalid_input', 'Localização inválida');
  }
  const set = {
    name,
    city,
    about: text(input.about, 2000),
    address: text(input.address, 200),
    lat: input.lat,
    lng: input.lng,
    hours: text(input.hours, 300),
    instagram: contact(input.instagram, normalizeInstagram),
    whatsapp: contact(input.whatsapp, normalizeWhatsapp),
    website: contact(input.website, normalizeWebsite),
    formats: input.formats ? GAME_FORMATS.filter((f) => input.formats!.includes(f)) : undefined,
    updatedAt: new Date(),
  };
  await db
    .update(stores)
    .set(Object.fromEntries(Object.entries(set).filter(([, v]) => v !== undefined)))
    .where(eq(stores.id, input.storeId));
}

/** Convida alguém para a equipe (só o dono). */
export async function inviteStoreMember(
  db: Database,
  input: { storeId: string; userId: string; email: string; now?: Date },
) {
  await requireStoreRole(db, input.storeId, input.userId, ['owner']);
  const email = normalizeEmail(input.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new DomainError('invalid_input', 'E-mail inválido');
  }
  return newInvite(db, {
    storeId: input.storeId,
    email,
    role: 'staff',
    createdBy: input.userId,
    now: input.now,
  });
}

/** Cancela um convite pendente (só o dono). */
export async function revokeStoreInvite(
  db: Database,
  input: { storeId: string; userId: string; inviteId: string },
) {
  await requireStoreRole(db, input.storeId, input.userId, ['owner']);
  await db
    .delete(storeInvites)
    .where(and(eq(storeInvites.id, input.inviteId), eq(storeInvites.storeId, input.storeId)));
}

/** Quem é convidado para um convite (para a página do convite), sem revelar o e-mail. */
export async function getStoreInvite(db: Database, input: { token: string; now?: Date }) {
  const [row] = await db
    .select({
      storeName: stores.name,
      slug: stores.slug,
      role: storeInvites.role,
      expiresAt: storeInvites.expiresAt,
      acceptedAt: storeInvites.acceptedAt,
    })
    .from(storeInvites)
    .innerJoin(stores, eq(stores.id, storeInvites.storeId))
    .where(eq(storeInvites.token, input.token))
    .limit(1);
  if (!row) return null;
  const now = input.now ?? new Date();
  return {
    storeName: row.storeName,
    slug: row.slug,
    role: row.role as StoreRole,
    status: row.acceptedAt
      ? ('used' as const)
      : row.expiresAt <= now
        ? ('expired' as const)
        : ('open' as const),
  };
}

/**
 * Aceita o convite: só a conta com o e-mail convidado, uma vez e no prazo. A pessoa entra na
 * equipe com o papel do convite (ou sobe para dono, se já era da equipe).
 */
export async function acceptStoreInvite(
  db: Database,
  input: { token: string; userId: string; userEmail: string; now?: Date },
) {
  const [invite] = await db
    .select()
    .from(storeInvites)
    .where(eq(storeInvites.token, input.token))
    .limit(1);
  if (!invite) throw new DomainError('not_found', 'Convite não encontrado');
  if (normalizeEmail(input.userEmail) !== invite.email) {
    throw new DomainError('forbidden', 'Este convite é para outro e-mail');
  }
  const now = input.now ?? new Date();
  if (invite.acceptedAt) throw new DomainError('conflict', 'Este convite já foi usado');
  if (invite.expiresAt <= now) throw new DomainError('conflict', 'Este convite venceu');
  await db.transaction(async (tx) => {
    const insert = tx
      .insert(storeMembers)
      .values({ storeId: invite.storeId, userId: input.userId, role: invite.role });
    // Já era da equipe: o convite de dono promove; o de equipe não muda nada.
    await (invite.role === 'owner'
      ? insert.onConflictDoUpdate({
          target: [storeMembers.storeId, storeMembers.userId],
          set: { role: 'owner' },
        })
      : insert.onConflictDoNothing());
    await tx.update(storeInvites).set({ acceptedAt: now }).where(eq(storeInvites.id, invite.id));
  });
  const [store] = await db
    .select({ slug: stores.slug, name: stores.name })
    .from(stores)
    .where(eq(stores.id, invite.storeId));
  return { slug: store!.slug, name: store!.name, role: invite.role as StoreRole };
}

/** Tira alguém da equipe (só o dono; o último dono não sai). */
export async function removeStoreMember(
  db: Database,
  input: { storeId: string; userId: string; memberId: string },
) {
  await requireStoreRole(db, input.storeId, input.userId, ['owner']);
  const owners = await db
    .select({ userId: storeMembers.userId })
    .from(storeMembers)
    .where(and(eq(storeMembers.storeId, input.storeId), eq(storeMembers.role, 'owner')));
  if (owners.length === 1 && owners[0]!.userId === input.memberId) {
    throw new DomainError('conflict', 'A loja precisa de ao menos um dono');
  }
  await db
    .delete(storeMembers)
    .where(and(eq(storeMembers.storeId, input.storeId), eq(storeMembers.userId, input.memberId)));
}

/** Exclui o perfil da loja (o dono; o admin do ArcanaKin passa `asAdmin`). */
export async function deleteStore(
  db: Database,
  input: { storeId: string; userId: string; asAdmin?: boolean },
) {
  if (!input.asAdmin) await requireStoreRole(db, input.storeId, input.userId, ['owner']);
  await db.delete(stores).where(eq(stores.id, input.storeId));
}

/** Nome da loja (para o e-mail de convite). */
export async function getStoreName(db: Database, storeId: string) {
  const [row] = await db.select({ name: stores.name }).from(stores).where(eq(stores.id, storeId));
  if (!row) throw new DomainError('not_found', 'Loja não encontrada');
  return row.name;
}
