import { exportUserData } from '@boramarcar/db';
import { authed } from '@/server/http';

/** "Baixar meus dados" (LGPD, art. 18, II e V): JSON com os dados pessoais de quem pede. */
export const GET = authed(async ({ db, user }) => {
  const data = await exportUserData(db, user.id);
  const day = data.exportedAt.slice(0, 10);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="arcanakin-meus-dados-${day}.json"`,
      'Cache-Control': 'no-store',
    },
  });
});
