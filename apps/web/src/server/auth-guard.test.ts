import { describe, expect, it, vi } from 'vitest';
import { isForeignVercelUrl, withAuthGuard } from './auth-guard';

const ours = 'https://boramarcar-a1b2c3d4e-fernandolobaos-projects.vercel.app';

describe('previews confiáveis no login: só o endereço de deploy deste projeto', () => {
  it('aceita o endereço de deploy (9 letras ou números); o resto da Vercel não', () => {
    expect(isForeignVercelUrl(`${ours}/painel`)).toBe(false);
    // Outra equipe cujo nome termina igual ao da nossa.
    expect(
      isForeignVercelUrl('https://boramarcar-a1b2c3d4e-evil-fernandolobaos-projects.vercel.app'),
    ).toBe(true);
    expect(
      isForeignVercelUrl('https://boramarcar-git-ab-cd-fernandolobaos-projects.vercel.app'),
    ).toBe(true);
    // Endereço do branch: o nome do branch tem hífens, não dá para separar de outra equipe.
    expect(
      isForeignVercelUrl('https://boramarcar-git-main-fernandolobaos-projects.vercel.app/x'),
    ).toBe(true);
    expect(
      isForeignVercelUrl('https://BORAMARCAR-A1B2C3D4E-fernandolobaos-projects.vercel.app'),
    ).toBe(false);
    // Fora da Vercel, endereços relativos e lixo: não é com esta regra.
    expect(isForeignVercelUrl('https://www.arcanakin.com.br/painel')).toBe(false);
    expect(isForeignVercelUrl('/painel')).toBe(false);
    expect(isForeignVercelUrl('arcanakin://')).toBe(false);
    expect(isForeignVercelUrl('não é url')).toBe(false);
  });

  const ok = () => vi.fn(async () => new Response('ok'));
  const evil = 'https://boramarcar-git-x-evil-fernandolobaos-projects.vercel.app';

  it('recusa pedido com destino num preview que não é nosso (consulta ou corpo)', async () => {
    const handler = ok();
    const guarded = withAuthGuard(handler);
    const q = await guarded(
      new Request(
        `https://www.arcanakin.com.br/api/auth/callback/google?callbackURL=${encodeURIComponent(evil)}`,
      ),
    );
    expect(q.status).toBe(403);
    const body = await guarded(
      new Request('https://www.arcanakin.com.br/api/auth/sign-in/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'google', callbackURL: `${evil}/painel` }),
      }),
    );
    expect(body.status).toBe(403);
    const origin = await guarded(
      new Request('https://www.arcanakin.com.br/api/auth/sign-out', {
        method: 'POST',
        headers: { Origin: evil },
      }),
    );
    expect(origin.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });

  it('o pedido legítimo passa, e o corpo continua legível para o login', async () => {
    const handler = vi.fn(async (req: Request) => Response.json(await req.json()));
    const res = await withAuthGuard(handler)(
      new Request('https://www.arcanakin.com.br/api/auth/sign-in/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: ours },
        body: JSON.stringify({ provider: 'google', callbackURL: `${ours}/painel` }),
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ provider: 'google', callbackURL: `${ours}/painel` });
  });

  it('redirecionamento de resposta para preview alheio vira 403 (a sessão não sai)', async () => {
    const redirectTo = (url: string) =>
      withAuthGuard(async () => new Response(null, { status: 302, headers: { Location: url } }))(
        new Request('https://www.arcanakin.com.br/api/auth/callback/google'),
      );
    expect((await redirectTo(`${evil}/api/auth/oauth-proxy-callback?cookies=x`)).status).toBe(403);
    const good = await redirectTo(`${ours}/api/auth/oauth-proxy-callback?cookies=x`);
    expect(good.status).toBe(302);
    expect((await redirectTo('/painel')).status).toBe(302);
  });
});
