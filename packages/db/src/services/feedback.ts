import { DomainError } from '@boramarcar/core';
import { desc, eq } from 'drizzle-orm';
import type { Database } from '../client';
import { feedback, user } from '../schema';

/**
 * Feedback do beta (8.4). Guardado para o dono do projeto ler e responder; some com a conta.
 */
export const FEEDBACK_KINDS = ['problem', 'idea', 'other'] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];
export const FEEDBACK_PLATFORMS = ['web', 'ios', 'android'] as const;
export type FeedbackPlatform = (typeof FEEDBACK_PLATFORMS)[number];
export const MAX_FEEDBACK_LENGTH = 2000;

/** Só o caminho da página (sem domínio nem query string, onde poderia haver dados). */
export function feedbackPage(raw: string | null | undefined) {
  if (!raw) return null;
  const path = raw.split(/[?#]/)[0]!.trim();
  return path.startsWith('/') && !path.startsWith('//') ? path.slice(0, 200) : null;
}

export async function createFeedback(
  db: Database,
  input: {
    userId: string;
    kind: FeedbackKind;
    message: string;
    page?: string | null;
    platform: FeedbackPlatform;
  },
) {
  const message = input.message.trim();
  if (message.length < 3) throw new DomainError('invalid_input', 'Conte um pouco mais');
  if (message.length > MAX_FEEDBACK_LENGTH) {
    throw new DomainError('invalid_input', 'Texto longo demais');
  }
  const [row] = await db
    .insert(feedback)
    .values({
      userId: input.userId,
      kind: input.kind,
      message,
      page: feedbackPage(input.page),
      platform: input.platform,
    })
    .returning();
  return row!;
}

/** Feedbacks mais recentes, com quem mandou (para o dono do projeto responder). */
export async function listRecentFeedback(db: Database, limit = 50) {
  return db
    .select({
      id: feedback.id,
      kind: feedback.kind,
      message: feedback.message,
      page: feedback.page,
      platform: feedback.platform,
      createdAt: feedback.createdAt,
      name: user.name,
      email: user.email,
    })
    .from(feedback)
    .innerJoin(user, eq(user.id, feedback.userId))
    .orderBy(desc(feedback.createdAt))
    .limit(limit);
}
