import { getDeckCovers, getDeckRatings, getPlayerProfile } from '@boramarcar/db';
import { PlayerProfile } from '@/components/player-profile';
import { requireUser } from '@/server/current-user';
import { getDb } from '@/server/db';
import { navMetadata } from '@/server/metadata';

export const generateMetadata = navMetadata('profile');

export default async function ProfilePage() {
  const user = await requireUser();
  const db = getDb();
  const profile = await getPlayerProfile(db, { userId: user.id, viewerId: user.id });
  const ids = profile.decks.map((d) => d.id);
  const [covers, ratings] = await Promise.all([getDeckCovers(db, ids), getDeckRatings(db, ids)]);
  return <PlayerProfile profile={profile} covers={covers} ratings={ratings} />;
}
