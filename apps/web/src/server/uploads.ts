import 'server-only';
import { randomUUID } from 'node:crypto';
import { DomainError } from '@boramarcar/core';
import { checkImageUpload, isOwnUpload } from '@boramarcar/core/images';
import { del, put } from '@vercel/blob';
import { processUploadedImage } from './images';

/**
 * Foto do perfil e logo da loja no Vercel Blob. O token (`BLOB_READ_WRITE_TOKEN`) é criado pela
 * Vercel ao ligar um Blob store ao projeto; sem ele, o envio fica indisponível (o resto funciona).
 * O nome do arquivo é aleatório: a URL é pública, mas não dá para adivinhar a de outra pessoa.
 */
export async function saveUploadedImage(
  file: File,
  where: { folder: 'avatars' | 'logos'; ownerId: string },
): Promise<string> {
  const problem = checkImageUpload(file);
  if (problem) {
    throw new DomainError('invalid_input', 'Imagem não aceita', { reason: problem });
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new DomainError('upstream_error', 'Envio de imagens indisponível no momento');
  }
  const image = await processUploadedImage(Buffer.from(await file.arrayBuffer()));
  const { url } = await put(`${where.folder}/${where.ownerId}/${randomUUID()}.webp`, image, {
    access: 'public',
    contentType: 'image/webp',
    addRandomSuffix: false,
    cacheControlMaxAge: 60 * 60 * 24 * 365,
  });
  return url;
}

/** Apaga um arquivo enviado (foto ou logo trocado). URL de fora (ex.: Google) não é tocada. */
export async function deleteUploadedImage(url: string | null | undefined): Promise<void> {
  if (!isOwnUpload(url)) return;
  try {
    await del(url!);
  } catch (error) {
    // Sobra um arquivo órfão; não vale derrubar a troca de foto por isso.
    console.warn('[uploads] não foi possível apagar a imagem antiga', error);
  }
}

/** Lê o arquivo do campo `file` de um envio multipart. */
export async function fileFromRequest(req: Request): Promise<File> {
  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) {
    throw new DomainError('invalid_input', 'Envie a imagem no campo "file"', { reason: 'empty' });
  }
  return file;
}
