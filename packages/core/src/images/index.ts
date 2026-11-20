/**
 * Imagens enviadas por quem usa (foto do perfil e logo da loja). O servidor endireita, recorta em
 * quadrado, converte para WebP e tira os metadados (inclusive a localização da foto) antes de
 * guardar no Vercel Blob.
 */

/** Tamanho máximo do arquivo enviado (a Vercel recusa corpos acima de 4,5 MB; o site reduz antes). */
export const IMAGE_MAX_BYTES = 4 * 1024 * 1024;

/** Tipos aceitos (o que câmeras e celulares entregam ao escolher uma foto). */
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

/** Lado da imagem guardada (quadrada), em pixels. */
export const IMAGE_SIZE = 512;

/** Problema no arquivo enviado: `type`, `size` ou `empty`; `null` se está tudo certo. */
export function checkImageUpload(file: { type: string; size: number }) {
  if (!(IMAGE_TYPES as readonly string[]).includes(file.type)) return 'type' as const;
  if (file.size <= 0) return 'empty' as const;
  if (file.size > IMAGE_MAX_BYTES) return 'size' as const;
  return null;
}

/** A URL é de um arquivo nosso no Vercel Blob (pode ser apagado ao trocar ou excluir)? */
export function isOwnUpload(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === 'https:' && hostname.endsWith('.public.blob.vercel-storage.com');
  } catch {
    return false;
  }
}

/**
 * A URL é de um arquivo nosso **deste dono** (`<pasta>/<id>/…`)? Só assim o servidor apaga a imagem
 * anterior: uma URL alheia gravada como foto (ou logo) nunca leva o arquivo de outra pessoa junto.
 */
export function isUploadOf(
  url: string | null | undefined,
  owner: { folder: 'avatars' | 'logos'; ownerId: string },
): boolean {
  if (!isOwnUpload(url)) return false;
  const { pathname } = new URL(url!);
  const prefix = `/${owner.folder}/${owner.ownerId}/`;
  if (!pathname.startsWith(prefix)) return false;
  const rest = pathname.slice(prefix.length);
  return rest.length > 0 && !/[/%\\]|\.\./.test(rest);
}
