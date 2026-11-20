import { describe, expect, it } from 'vitest';
import { IMAGE_MAX_BYTES, checkImageUpload, isOwnUpload, isUploadOf } from './index';

describe('envio de imagem (foto do perfil e logo da loja)', () => {
  it('aceita JPEG, PNG e WebP até 4 MB', () => {
    expect(checkImageUpload({ type: 'image/jpeg', size: 1_000_000 })).toBeNull();
    expect(checkImageUpload({ type: 'image/png', size: IMAGE_MAX_BYTES })).toBeNull();
    expect(checkImageUpload({ type: 'image/webp', size: 10 })).toBeNull();
  });

  it('recusa outro tipo, arquivo grande demais ou vazio', () => {
    expect(checkImageUpload({ type: 'image/gif', size: 10 })).toBe('type');
    expect(checkImageUpload({ type: 'application/pdf', size: 10 })).toBe('type');
    expect(checkImageUpload({ type: 'image/jpeg', size: IMAGE_MAX_BYTES + 1 })).toBe('size');
    expect(checkImageUpload({ type: 'image/jpeg', size: 0 })).toBe('empty');
  });

  it('reconhece arquivo nosso (Vercel Blob) para apagar ao trocar; foto do Google não', () => {
    expect(isOwnUpload('https://abc123.public.blob.vercel-storage.com/avatars/u1/x.webp')).toBe(
      true,
    );
    expect(isOwnUpload('https://lh3.googleusercontent.com/a/xyz')).toBe(false);
    expect(isOwnUpload('https://evil.test/abc.public.blob.vercel-storage.com/x')).toBe(false);
    expect(isOwnUpload(null)).toBe(false);
  });

  it('arquivo de um dono: só na pasta e no ID de quem pede (não apaga foto ou logo alheio)', () => {
    const base = 'https://abc.public.blob.vercel-storage.com';
    const mine = { folder: 'avatars', ownerId: 'u1' } as const;
    expect(isUploadOf(`${base}/avatars/u1/x.webp`, mine)).toBe(true);
    expect(isUploadOf(`${base}/avatars/u2/x.webp`, mine)).toBe(false);
    expect(isUploadOf(`${base}/avatars/u10/x.webp`, mine)).toBe(false);
    expect(isUploadOf(`${base}/logos/u1/x.webp`, mine)).toBe(false);
    expect(isUploadOf(`${base}/avatars/u1/../u2/x.webp`, mine)).toBe(false);
    expect(isUploadOf(`${base}/avatars/u1%2F..%2Fu2/x.webp`, mine)).toBe(false);
    expect(isUploadOf('https://lh3.googleusercontent.com/avatars/u1/x', mine)).toBe(false);
    expect(isUploadOf(null, mine)).toBe(false);
  });
});
