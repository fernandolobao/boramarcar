import { createTestDb, createTestUser } from '@boramarcar/db/testing';
import { getUserImage, getPlayerProfile, type Database } from '@boramarcar/db';
import { google } from 'better-auth/social-providers';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  GOOGLE_SIGN_IN_OPTIONS,
  pictureFromIdToken,
  syncGoogleProfileImage,
  validProfileImageUrl,
} from './google-picture';

/** ID token de teste (sem assinatura): só o payload importa aqui. */
const idToken = (claims: Record<string, unknown>) =>
  [
    Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url'),
    Buffer.from(
      JSON.stringify({
        iss: 'https://accounts.google.com',
        sub: '1234567890',
        email: 'ana@example.com',
        email_verified: true,
        name: 'Ana',
        ...claims,
      }),
    ).toString('base64url'),
    'assinatura',
  ].join('.');

const FOTO = 'https://lh3.googleusercontent.com/a/ACg8ocJfoto-nova=s96-c';
const FOTO_ANTIGA = 'https://lh3.googleusercontent.com/a/ACg8ocJfoto-antiga=s96-c';

let db: Database;
let close: () => Promise<void>;
beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(() => close());
const imageOf = (userId: string) => getUserImage(db, userId);

describe('escopos do login com o Google', () => {
  it('pede só openid, email e profile (sem Gmail, Drive ou outros)', async () => {
    const provider = google({
      clientId: 'id',
      clientSecret: 'segredo',
      ...GOOGLE_SIGN_IN_OPTIONS,
      scope: [...GOOGLE_SIGN_IN_OPTIONS.scope],
    });
    const url = await provider.createAuthorizationURL({
      state: 'estado',
      codeVerifier: 'v'.repeat(43),
      redirectURI: 'http://localhost:3000/api/auth/callback/google',
    });
    expect(url.searchParams.get('scope')!.split(' ').sort()).toEqual([
      'email',
      'openid',
      'profile',
    ]);
  });
});

describe('foto do Google', () => {
  it('usuário novo: o Better Auth leva a claim picture para user.image', async () => {
    const provider = google({ clientId: 'id', clientSecret: 'segredo' });
    const info = await provider.getUserInfo({ idToken: idToken({ picture: FOTO }) });
    expect(info?.user).toMatchObject({ image: FOTO, email: 'ana@example.com', name: 'Ana' });
  });

  it('lê e valida a URL da foto', () => {
    expect(pictureFromIdToken(idToken({ picture: FOTO }))).toBe(FOTO);
    expect(pictureFromIdToken(idToken({}))).toBeNull();
    expect(pictureFromIdToken('nao-e-jwt')).toBeNull();
    expect(pictureFromIdToken(null)).toBeNull();
    expect(validProfileImageUrl(FOTO)).toBe(FOTO);
    expect(validProfileImageUrl('  ')).toBeNull();
    expect(validProfileImageUrl('')).toBeNull();
    expect(validProfileImageUrl('http://lh3.googleusercontent.com/a/x')).toBeNull();
    expect(validProfileImageUrl('javascript:alert(1)')).toBeNull();
    expect(validProfileImageUrl(`https://x.com/${'a'.repeat(2100)}`)).toBeNull();
  });

  it('usuário existente com foto: um novo login com outra URL atualiza a foto', async () => {
    const user = await createTestUser(db, { image: FOTO_ANTIGA, name: 'Nome escolhido' });
    const changed = await syncGoogleProfileImage(db, {
      providerId: 'google',
      userId: user.id,
      idToken: idToken({ picture: FOTO, name: 'Nome do Google' }),
    });
    expect(changed).toBe(true);
    expect(await imageOf(user.id)).toBe(FOTO);
    // Só a foto muda: o nome escolhido no ArcanaKin fica.
    expect((await getPlayerProfile(db, { userId: user.id, viewerId: user.id })).name).toBe(
      'Nome escolhido',
    );
    // A mesma URL de novo não grava nada.
    expect(
      await syncGoogleProfileImage(db, {
        providerId: 'google',
        userId: user.id,
        idToken: idToken({ picture: FOTO }),
      }),
    ).toBe(false);
  });

  it('usuário existente com foto: login sem foto (ou com foto inválida) não apaga a atual', async () => {
    const user = await createTestUser(db, { image: FOTO_ANTIGA });
    for (const claims of [{}, { picture: '' }, { picture: null }, { picture: 'http://x/y.jpg' }]) {
      expect(
        await syncGoogleProfileImage(db, {
          providerId: 'google',
          userId: user.id,
          idToken: idToken(claims),
        }),
      ).toBe(false);
    }
    expect(
      await syncGoogleProfileImage(db, { providerId: 'google', userId: user.id, idToken: null }),
    ).toBe(false);
    expect(await imageOf(user.id)).toBe(FOTO_ANTIGA);
  });

  it('usuário sem foto: recebe a foto do Google; sem foto no Google, continua sem (iniciais)', async () => {
    const semFoto = await createTestUser(db, { image: null });
    await syncGoogleProfileImage(db, {
      providerId: 'google',
      userId: semFoto.id,
      idToken: idToken({}),
    });
    expect(await imageOf(semFoto.id)).toBeNull();
    await syncGoogleProfileImage(db, {
      providerId: 'google',
      userId: semFoto.id,
      idToken: idToken({ picture: FOTO }),
    });
    expect(await imageOf(semFoto.id)).toBe(FOTO);
  });

  it('ignora outros provedores', async () => {
    const user = await createTestUser(db, { image: null });
    expect(
      await syncGoogleProfileImage(db, {
        providerId: 'credential',
        userId: user.id,
        idToken: idToken({ picture: FOTO }),
      }),
    ).toBe(false);
    expect(await imageOf(user.id)).toBeNull();
  });
});
