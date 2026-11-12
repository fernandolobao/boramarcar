import { DomainError } from '@boramarcar/core';
import { and, asc, eq, gt, inArray, ne } from 'drizzle-orm';
import type { Database } from '../client';
import {
  account,
  availabilityRules,
  availabilitySlots,
  deckCards,
  decks,
  eventParticipants,
  events,
  gamePlayers,
  games,
  groupMembers,
  groups,
  locations,
  onboardingSteps,
  pushTokens,
  session,
  user,
} from '../schema';

/** Nome exibido no histórico das partidas de quem excluiu a conta. */
export const DELETED_USER_NAME = 'Jogador removido';

/**
 * Dados pessoais do titular em formato legível por máquina (LGPD, art. 18, II e V): perfil,
 * preferências, contas de login (sem tokens), grupos, disponibilidade, presenças, partidas e
 * decks. Dados de outras pessoas (nomes de adversários, e-mails) ficam de fora.
 */
export async function exportUserData(db: Database, userId: string) {
  const [profile] = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      timeZone: user.timeZone,
      locale: user.locale,
      emailNotifications: user.emailNotifications,
      createdAt: user.createdAt,
      deletedAt: user.deletedAt,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  if (!profile || profile.deletedAt) throw new DomainError('not_found', 'Usuário não encontrado');
  const { deletedAt: _deleted, ...me } = profile;

  const [logins, memberships, slots, rules, rsvps, played, ownDecks, hosted] = await Promise.all([
    db
      .select({ provider: account.providerId, createdAt: account.createdAt })
      .from(account)
      .where(eq(account.userId, userId)),
    db
      .select({ group: groups.name, role: groupMembers.role, joinedAt: groupMembers.joinedAt })
      .from(groupMembers)
      .innerJoin(groups, eq(groups.id, groupMembers.groupId))
      .where(eq(groupMembers.userId, userId))
      .orderBy(asc(groupMembers.joinedAt)),
    db
      .select({
        group: groups.name,
        startsAt: availabilitySlots.startsAt,
        endsAt: availabilitySlots.endsAt,
        note: availabilitySlots.note,
      })
      .from(availabilitySlots)
      .innerJoin(groups, eq(groups.id, availabilitySlots.groupId))
      .where(eq(availabilitySlots.userId, userId))
      .orderBy(asc(availabilitySlots.startsAt)),
    db
      .select({
        group: groups.name,
        weekday: availabilityRules.weekday,
        startTime: availabilityRules.startTime,
        endTime: availabilityRules.endTime,
        timeZone: availabilityRules.timeZone,
        note: availabilityRules.note,
      })
      .from(availabilityRules)
      .innerJoin(groups, eq(groups.id, availabilityRules.groupId))
      .where(eq(availabilityRules.userId, userId)),
    db
      .select({
        event: events.title,
        group: groups.name,
        startsAt: events.startsAt,
        rsvp: eventParticipants.rsvp,
      })
      .from(eventParticipants)
      .innerJoin(events, eq(events.id, eventParticipants.eventId))
      .innerJoin(groups, eq(groups.id, events.groupId))
      .where(eq(eventParticipants.userId, userId))
      .orderBy(asc(events.startsAt)),
    db
      .select({
        group: groups.name,
        playedAt: games.playedAt,
        format: games.format,
        result: gamePlayers.result,
        seat: gamePlayers.seat,
        team: gamePlayers.team,
        deck: decks.name,
      })
      .from(gamePlayers)
      .innerJoin(games, eq(games.id, gamePlayers.gameId))
      .innerJoin(groups, eq(groups.id, games.groupId))
      .leftJoin(decks, eq(decks.id, gamePlayers.deckId))
      .where(eq(gamePlayers.userId, userId))
      .orderBy(asc(games.playedAt)),
    db
      .select({
        id: decks.id,
        name: decks.name,
        format: decks.format,
        visibility: decks.visibility,
        source: decks.source,
        sourceUrl: decks.sourceUrl,
        description: decks.description,
        createdAt: decks.createdAt,
      })
      .from(decks)
      .where(eq(decks.ownerId, userId))
      .orderBy(asc(decks.name)),
    db
      .select({
        group: groups.name,
        name: locations.name,
        address: locations.address,
        details: locations.details,
      })
      .from(locations)
      .innerJoin(groups, eq(groups.id, locations.groupId))
      .where(eq(locations.hostUserId, userId)),
  ]);

  const cardRows = ownDecks.length
    ? await db
        .select({
          deckId: deckCards.deckId,
          name: deckCards.cardName,
          quantity: deckCards.quantity,
          board: deckCards.board,
          proxy: deckCards.isProxy,
          foil: deckCards.isFoil,
        })
        .from(deckCards)
        .where(
          inArray(
            deckCards.deckId,
            ownDecks.map((d) => d.id),
          ),
        )
        .orderBy(asc(deckCards.cardName))
    : [];

  // Aparelhos com avisos ligados: plataforma e datas (o token em si é só um endereço técnico).
  const devices = await db
    .select({
      platform: pushTokens.platform,
      createdAt: pushTokens.createdAt,
      lastSeenAt: pushTokens.lastSeenAt,
    })
    .from(pushTokens)
    .where(eq(pushTokens.userId, userId));
  const onboarding = await db
    .select({ step: onboardingSteps.step, at: onboardingSteps.createdAt })
    .from(onboardingSteps)
    .where(eq(onboardingSteps.userId, userId));

  return {
    format: 'arcanakin-export',
    version: 1,
    exportedAt: new Date().toISOString(),
    profile: me,
    logins,
    pushDevices: devices,
    onboarding,
    groups: memberships,
    hostedPlaces: hosted,
    availability: { slots, weekly: rules },
    events: rsvps,
    games: played,
    decks: ownDecks.map(({ id, ...deck }) => ({
      ...deck,
      cards: cardRows.filter((c) => c.deckId === id).map(({ deckId: _d, ...card }) => card),
    })),
  };
}

/**
 * Exclusão da conta pelo titular (LGPD, art. 18, VI). Apaga o que é só da pessoa (login,
 * sessões, decks, disponibilidade, presenças futuras, locais que ela hospeda) e a tira dos
 * grupos. As partidas continuam no histórico dos outros jogadores, com o nome
 * "Jogador removido", sem e-mail nem foto.
 *
 * Grupos de que ela é dona: com outros membros, a posse passa para o admin mais antigo (ou o
 * membro mais antigo); sozinha, o grupo é apagado.
 */
export async function deleteUserAccount(db: Database, userId: string, now = new Date()) {
  const [me] = await db
    .select({ id: user.id, deletedAt: user.deletedAt })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  if (!me || me.deletedAt) throw new DomainError('not_found', 'Usuário não encontrado');

  const owned = await db
    .select({ groupId: groupMembers.groupId })
    .from(groupMembers)
    .where(and(eq(groupMembers.userId, userId), eq(groupMembers.role, 'owner')));

  const transferred: string[] = [];
  const deletedGroups: string[] = [];

  await db.transaction(async (tx) => {
    for (const { groupId } of owned) {
      const others = await tx
        .select({ userId: groupMembers.userId, role: groupMembers.role })
        .from(groupMembers)
        .where(and(eq(groupMembers.groupId, groupId), ne(groupMembers.userId, userId)))
        .orderBy(asc(groupMembers.joinedAt));
      if (!others.length) {
        await tx.delete(groups).where(eq(groups.id, groupId));
        deletedGroups.push(groupId);
        continue;
      }
      const heir = others.find((m) => m.role === 'admin') ?? others[0]!;
      await tx
        .update(groupMembers)
        .set({ role: 'owner' })
        .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, heir.userId)));
      transferred.push(groupId);
    }

    await tx.delete(availabilitySlots).where(eq(availabilitySlots.userId, userId));
    await tx.delete(availabilityRules).where(eq(availabilityRules.userId, userId));
    // Presenças em encontros que ainda não aconteceram; as passadas ficam (anônimas).
    const upcoming = tx.select({ id: events.id }).from(events).where(gt(events.startsAt, now));
    await tx
      .delete(eventParticipants)
      .where(
        and(eq(eventParticipants.userId, userId), inArray(eventParticipants.eventId, upcoming)),
      );
    // Endereço da casa de quem sai não fica com o grupo.
    await tx.delete(locations).where(eq(locations.hostUserId, userId));
    await tx.update(locations).set({ createdBy: null }).where(eq(locations.createdBy, userId));
    await tx.delete(decks).where(eq(decks.ownerId, userId));
    await tx.delete(groupMembers).where(eq(groupMembers.userId, userId));
    await tx.delete(session).where(eq(session.userId, userId));
    await tx.delete(pushTokens).where(eq(pushTokens.userId, userId));
    await tx.delete(onboardingSteps).where(eq(onboardingSteps.userId, userId));
    await tx.delete(account).where(eq(account.userId, userId));
    await tx
      .update(user)
      .set({
        name: DELETED_USER_NAME,
        // E-mail único e não entregável: se a pessoa voltar com o Google, nasce uma conta nova.
        email: `removido+${userId}@arcanakin.invalid`,
        emailVerified: false,
        image: null,
        timeZone: null,
        locale: null,
        emailNotifications: false,
        deletedAt: now,
        updatedAt: now,
      })
      .where(eq(user.id, userId));
  });

  return { transferredGroups: transferred, deletedGroups };
}

/** Grupos que mudam de dono se a pessoa excluir a conta (para avisar antes). */
export async function accountDeletionPreview(db: Database, userId: string) {
  const owned = await db
    .select({ groupId: groupMembers.groupId, name: groups.name })
    .from(groupMembers)
    .innerJoin(groups, eq(groups.id, groupMembers.groupId))
    .where(and(eq(groupMembers.userId, userId), eq(groupMembers.role, 'owner')));
  if (!owned.length) return { transfers: [], deletions: [] };
  const others = await db
    .select({ groupId: groupMembers.groupId })
    .from(groupMembers)
    .where(
      and(
        inArray(
          groupMembers.groupId,
          owned.map((g) => g.groupId),
        ),
        ne(groupMembers.userId, userId),
      ),
    );
  const withOthers = new Set(others.map((o) => o.groupId));
  return {
    transfers: owned.filter((g) => withOthers.has(g.groupId)).map((g) => g.name),
    deletions: owned.filter((g) => !withOthers.has(g.groupId)).map((g) => g.name),
  };
}
