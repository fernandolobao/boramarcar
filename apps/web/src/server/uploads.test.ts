import sharp from 'sharp';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const put = vi.fn();
const del = vi.fn();
vi.mock('@vercel/blob', () => ({ put, del }));

const { deleteUploadedImage, saveUploadedImage } = await import('./uploads');

const photo = async () =>
  new File(
    [
      new Uint8Array(
        await sharp({
          create: { width: 300, height: 200, channels: 3, background: { r: 1, g: 2, b: 3 } },
        })
          .png()
          .toBuffer(),
      ),
    ],
    'foto.png',
    { type: 'image/png' },
  );

describe('envio de imagens para o armazenamento', () => {
  beforeEach(() => {
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', 'teste');
    put.mockReset().mockResolvedValue({ url: 'https://x.public.blob.vercel-storage.com/a.webp' });
    del.mockReset().mockResolvedValue(undefined);
  });
  afterEach(() => vi.unstubAllEnvs());

  it('guarda a imagem tratada (WebP) num caminho com a pasta e o dono, nome impossível de adivinhar', async () => {
    const url = await saveUploadedImage(await photo(), { folder: 'avatars', ownerId: 'u1' });
    expect(url).toBe('https://x.public.blob.vercel-storage.com/a.webp');
    const [pathname, body, options] = put.mock.calls[0]!;
    expect(pathname).toMatch(/^avatars\/u1\/[0-9a-f-]{36}\.webp$/);
    expect((await sharp(body as Buffer).metadata()).format).toBe('webp');
    expect(options).toMatchObject({ access: 'public', contentType: 'image/webp' });
  });

  it('recusa tipo errado antes de qualquer envio', async () => {
    const gif = new File([new Uint8Array([1, 2, 3])], 'x.gif', { type: 'image/gif' });
    await expect(saveUploadedImage(gif, { folder: 'logos', ownerId: 's1' })).rejects.toMatchObject({
      code: 'invalid_input',
      details: { reason: 'type' },
    });
    expect(put).not.toHaveBeenCalled();
  });

  it('com OIDC (só BLOB_STORE_ID, sem o token permanente) também envia', async () => {
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', '');
    vi.stubEnv('BLOB_STORE_ID', 'store_abc');
    await expect(
      saveUploadedImage(await photo(), { folder: 'avatars', ownerId: 'u1' }),
    ).resolves.toMatch(/^https:/);
  });

  it('sem o armazenamento configurado, avisa que o envio está indisponível', async () => {
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', '');
    vi.stubEnv('BLOB_STORE_ID', '');
    await expect(
      saveUploadedImage(await photo(), { folder: 'avatars', ownerId: 'u1' }),
    ).rejects.toMatchObject({ code: 'upstream_error' });
  });

  it('armazenamento recusa (ex.: store privado): erro claro e registrado, não um 500 mudo', async () => {
    const warn = vi.spyOn(console, 'error').mockImplementation(() => {});
    put.mockRejectedValueOnce(
      Object.assign(new Error('Cannot use public access on a private store'), {
        name: 'BlobAccessError',
      }),
    );
    await expect(
      saveUploadedImage(await photo(), { folder: 'avatars', ownerId: 'u1' }),
    ).rejects.toMatchObject({
      code: 'upstream_error',
      details: { reason: 'storage', cause: 'BlobAccessError' },
    });
    expect(String(warn.mock.calls[0]?.join(' '))).toContain('private store');
    warn.mockRestore();
  });

  it('apaga só arquivo nosso e do próprio dono; falha ao apagar não derruba a operação', async () => {
    const me = { folder: 'avatars', ownerId: 'u1' } as const;
    await deleteUploadedImage('https://lh3.googleusercontent.com/a/1', me);
    await deleteUploadedImage(null, me);
    expect(del).not.toHaveBeenCalled();
    del.mockRejectedValueOnce(new Error('rede'));
    await expect(
      deleteUploadedImage('https://x.public.blob.vercel-storage.com/avatars/u1/velha.webp', me),
    ).resolves.toBeUndefined();
    expect(del).toHaveBeenCalledWith(
      'https://x.public.blob.vercel-storage.com/avatars/u1/velha.webp',
    );
  });

  it('URL de outra pessoa ou de uma loja gravada como "imagem anterior" não é apagada', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const me = { folder: 'avatars', ownerId: 'u1' } as const;
    await deleteUploadedImage('https://x.public.blob.vercel-storage.com/avatars/u2/dela.webp', me);
    await deleteUploadedImage('https://x.public.blob.vercel-storage.com/logos/s1/logo.webp', me);
    expect(del).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
