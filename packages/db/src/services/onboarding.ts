import { and, count, eq, gt } from 'drizzle-orm';
import type { Database } from '../client';
import {
  availabilityRules,
  availabilitySlots,
  decks,
  eventParticipants,
  groupMembers,
  onboardingSteps,
} from '../schema';

/**
 * Onboarding (Fase 7). Os passos são calculados a partir dos dados (quem já fez a ação por
 * outro caminho aparece com o passo feito); `onboarding_steps` guarda só o que não dá para
 * deduzir, como "dispensou os primeiros passos".
 */
export const ONBOARDING_FLAGS = ['checklist-dismissed', 'guide-skipped'] as const;
export type OnboardingFlag = (typeof ONBOARDING_FLAGS)[number];

export const CHECKLIST_STEPS = ['availability', 'invite', 'rsvp', 'deck'] as const;
export type ChecklistStep = (typeof CHECKLIST_STEPS)[number];

/** Com quantas pessoas o grupo já forma uma mesa de Commander (3 jogadores). */
export const TABLE_SIZE = 3;

const exists = async (query: Promise<{ n: number }[]>) => ((await query)[0]?.n ?? 0) > 0;

/** Primeiros passos no grupo ativo e se a pessoa já dispensou a lista. */
export async function getOnboardingChecklist(
  db: Database,
  input: { userId: string; groupId: string; now?: Date },
) {
  const now = input.now ?? new Date();
  const { userId, groupId } = input;
  const [flags, rules, slots, members, rsvps, ownDecks] = await Promise.all([
    db
      .select({ step: onboardingSteps.step })
      .from(onboardingSteps)
      .where(eq(onboardingSteps.userId, userId)),
    exists(
      db
        .select({ n: count() })
        .from(availabilityRules)
        .where(and(eq(availabilityRules.userId, userId), eq(availabilityRules.groupId, groupId))),
    ),
    exists(
      db
        .select({ n: count() })
        .from(availabilitySlots)
        .where(
          and(
            eq(availabilitySlots.userId, userId),
            eq(availabilitySlots.groupId, groupId),
            gt(availabilitySlots.endsAt, now),
          ),
        ),
    ),
    db.select({ n: count() }).from(groupMembers).where(eq(groupMembers.groupId, groupId)),
    exists(
      db.select({ n: count() }).from(eventParticipants).where(eq(eventParticipants.userId, userId)),
    ),
    exists(db.select({ n: count() }).from(decks).where(eq(decks.ownerId, userId))),
  ]);
  const done: Record<ChecklistStep, boolean> = {
    availability: rules || slots,
    invite: (members[0]?.n ?? 0) >= TABLE_SIZE,
    rsvp: rsvps,
    deck: ownDecks,
  };
  const steps = CHECKLIST_STEPS.map((key) => ({ key, done: done[key] }));
  return {
    steps,
    completed: steps.filter((s) => s.done).length,
    dismissed: flags.some((f) => f.step === 'checklist-dismissed'),
    members: members[0]?.n ?? 0,
  };
}

/** Registra uma escolha do onboarding (idempotente). */
export async function markOnboarding(
  db: Database,
  input: { userId: string; flag: OnboardingFlag },
) {
  await db
    .insert(onboardingSteps)
    .values({ userId: input.userId, step: input.flag })
    .onConflictDoNothing();
}
