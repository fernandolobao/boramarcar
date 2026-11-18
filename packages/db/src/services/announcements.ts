import { changelogDraft, changelogSince, DomainError, type ChangelogEntry } from '@boramarcar/core';
import { desc, eq, isNull } from 'drizzle-orm';
import type { Database } from '../client';
import { announcements, groupMembers, groups, user } from '../schema';
import { addNotifications } from './inbox';

/**
 * Avisos do ArcanaKin e novidades da semana (`/admin`): rascunho, edição e publicação. Publicar
 * manda a notificação para todas as pessoas (ou só para um grupo); publicado não muda mais.
 */

export type AnnouncementKind = 'admin' | 'changelog';

const TITLE_MAX = 120;
const BODY_MAX = 4000;

const clean = (input: { title?: string; body?: string }) => {
  const title = input.title?.trim();
  const body = input.body?.trim();
  if (title !== undefined && (!title || title.length > TITLE_MAX)) {
    throw new DomainError('invalid_input', `O título precisa ter de 1 a ${TITLE_MAX} caracteres`);
  }
  if (body !== undefined && (!body || body.length > BODY_MAX)) {
    throw new DomainError('invalid_input', `O texto precisa ter de 1 a ${BODY_MAX} caracteres`);
  }
  return { title, body };
};

async function requireDraft(db: Database, id: string) {
  const [row] = await db.select().from(announcements).where(eq(announcements.id, id)).limit(1);
  if (!row) throw new DomainError('not_found', 'Aviso não encontrado');
  if (row.status !== 'draft') throw new DomainError('conflict', 'Aviso já publicado');
  return row;
}

export async function createAnnouncement(
  db: Database,
  input: {
    title: string;
    body: string;
    groupId: string | null;
    createdBy: string | null;
    kind?: AnnouncementKind;
  },
) {
  const { title, body } = clean(input);
  if (input.groupId) {
    const [group] = await db
      .select({ id: groups.id })
      .from(groups)
      .where(eq(groups.id, input.groupId))
      .limit(1);
    if (!group) throw new DomainError('not_found', 'Grupo não encontrado');
  }
  const [row] = await db
    .insert(announcements)
    .values({
      title: title!,
      body: body!,
      groupId: input.groupId,
      createdBy: input.createdBy,
      kind: input.kind ?? 'admin',
    })
    .returning();
  return row!;
}

/** Edita um rascunho (título, texto ou público). */
export async function updateAnnouncement(
  db: Database,
  input: { id: string; title?: string; body?: string; groupId?: string | null },
) {
  await requireDraft(db, input.id);
  const { title, body } = clean(input);
  const [row] = await db
    .update(announcements)
    .set({
      ...(title !== undefined ? { title } : {}),
      ...(body !== undefined ? { body } : {}),
      ...(input.groupId !== undefined ? { groupId: input.groupId } : {}),
    })
    .where(eq(announcements.id, input.id))
    .returning();
  return row!;
}

/** Exclui um rascunho (publicado fica no histórico de quem recebeu). */
export async function deleteAnnouncement(db: Database, input: { id: string }) {
  await requireDraft(db, input.id);
  await db.delete(announcements).where(eq(announcements.id, input.id));
}

/** Publica: cada pessoa do público (todas, ou os membros do grupo) recebe a notificação. */
export async function publishAnnouncement(db: Database, input: { id: string; now?: Date }) {
  const draft = await requireDraft(db, input.id);
  const recipients = draft.groupId
    ? await db
        .select({ userId: groupMembers.userId })
        .from(groupMembers)
        .where(eq(groupMembers.groupId, draft.groupId))
    : await db.select({ userId: user.id }).from(user).where(isNull(user.deletedAt));
  const [row] = await db
    .update(announcements)
    .set({ status: 'published', publishedAt: input.now ?? new Date() })
    .where(eq(announcements.id, draft.id))
    .returning();
  await addNotifications(
    db,
    recipients.map((r) => ({
      userId: r.userId,
      groupId: draft.groupId,
      data: { kind: 'announcement' as const, announcementId: draft.id },
    })),
  );
  return { ...row!, recipients: recipients.length };
}

/** Avisos para o `/admin`: rascunhos e publicados, mais novos primeiro. */
export async function listAnnouncements(db: Database, limit = 50) {
  return db
    .select({
      id: announcements.id,
      kind: announcements.kind,
      title: announcements.title,
      body: announcements.body,
      groupId: announcements.groupId,
      groupName: groups.name,
      status: announcements.status,
      createdAt: announcements.createdAt,
      publishedAt: announcements.publishedAt,
    })
    .from(announcements)
    .leftJoin(groups, eq(groups.id, announcements.groupId))
    .orderBy(desc(announcements.createdAt))
    .limit(limit);
}
export type AdminAnnouncement = Awaited<ReturnType<typeof listAnnouncements>>[number];

/** Dia (AAAA-MM-DD) de uma data no fuso dado. */
const dayIn = (date: Date, timeZone: string) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);

/**
 * Novidades da semana (cron de segunda): junta as entradas do arquivo de novidades desde o último
 * rascunho de novidades (ou dos últimos 7 dias, na primeira vez) e cria um rascunho para um admin
 * revisar e publicar. Sem novidades, não cria nada.
 */
export async function createChangelogDraft(
  db: Database,
  input: { entries: readonly ChangelogEntry[]; now?: Date; timeZone?: string },
) {
  const now = input.now ?? new Date();
  const timeZone = input.timeZone ?? 'America/Sao_Paulo';
  const [last] = await db
    .select({ createdAt: announcements.createdAt })
    .from(announcements)
    .where(eq(announcements.kind, 'changelog'))
    .orderBy(desc(announcements.createdAt))
    .limit(1);
  const after = dayIn(last?.createdAt ?? new Date(now.getTime() - 7 * 86_400_000), timeZone);
  const fresh = changelogSince(input.entries, after, dayIn(now, timeZone));
  if (!fresh.length) return null;
  const { title, body } = changelogDraft(fresh);
  const [row] = await db
    .insert(announcements)
    .values({ kind: 'changelog', title, body, groupId: null, createdBy: null, createdAt: now })
    .returning();
  return row!;
}
