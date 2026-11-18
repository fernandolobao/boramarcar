import {
  getDeckCovers,
  getDeckRatings,
  getPlayerProfile,
  listNewAchievements,
} from '@boramarcar/db';
import { NewAchievements } from '@/components/new-achievements';
import { PlayerProfile } from '@/components/player-profile';
import { requireUser } from '@/server/current-user';
import { getDb } from '@/server/db';
import { navMetadata } from '@/server/metadata';
import { ManaFlowColors } from '@/components/mana-flow';
import { GOLD_FLOW } from '@boramarcar/tokens/flow';

export const generateMetadata = navMetadata('profile');

export default async function ProfilePage() {
  const user = await requireUser();
  const db = getDb();
  const [profile, fresh] = await Promise.all([
    getPlayerProfile(db, { userId: user.id, viewerId: user.id }),
    listNewAchievements(db, { userId: user.id }),
  ]);
  const ids = profile.decks.map((d) => d.id);
  const [covers, ratings] = await Promise.all([getDeckCovers(db, ids), getDeckRatings(db, ids)]);
  return (
    <>
      {/* Perfil: fluxo de mana em ouro líquido. */}
      <ManaFlowColors stops={GOLD_FLOW} />
      {/* Conquistas ganhas desde a última visita (abre sozinha). */}
      <NewAchievements
        showProfileLink={false}
        achievements={fresh.map((a) => ({
          id: a.id,
          unlockedAt: a.unlockedAt?.toISOString() ?? null,
        }))}
      />
      <PlayerProfile profile={profile} covers={covers} ratings={ratings} />
    </>
  );
}
