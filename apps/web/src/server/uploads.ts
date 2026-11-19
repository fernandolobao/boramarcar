import 'server-only';
import { randomUUID } from 'node:crypto';
import { DomainError } from '@boramarcar/core';
import { checkImageUpload, isOwnUpload } from '@boramarcar/core/images';
import { del, put } from '@vercel/blob';
import { processUploadedImage } from './images';

/**
 * Foto do perfil e logo da loja no Vercel Blob. Ao ligar um Blob store ao projeto, a Vercel cria
 * `BLOB_STORE_ID` (acesso por OIDC, sem segredo guardado); `BLOB_READ_WRITE_TOKEN` é a alternativa
 * fora da Vercel. Sem nenhum dos dois, o envio fica indisponível (o resto funciona).
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
  // Na Vercel, o projeto ligado ao store entra por OIDC (`BLOB_STORE_ID` + credencial do deploy);
  // fora dela (ou em stores antigos), pelo token permanente.
  if (!process.env.BLOB_STORE_ID && !process.env.BLOB_READ_WRITE_TOKEN) {
    throw new DomainError('upstream_error', 'Envio de imagens indisponível no momento', {
      reason: 'storage',
    });
  }
  const image = await processUploadedImage(Buffer.from(await file.arrayBuffer()));
  try {
    const { url } = await put(`${where.folder}/${where.ownerId}/${randomUUID()}.webp`, image, {
      // O Blob store precisa ser público: a foto aparece em <img> para quem vê o perfil.
      access: 'public',
      contentType: 'image/webp',
      addRandomSuffix: false,
      cacheControlMaxAge: 60 * 60 * 24 * 365,
    });
    return url;
  } catch (error) {
    // Ex.: store privado, suspenso ou inexistente. Só o nome e a mensagem do erro (sem o token).
    const { name, message } =
      error instanceof Error ? error : { name: 'Error', message: String(error) };
    console.error(`[uploads] o Blob recusou a imagem: ${name}: ${message}`);
    // O nome do erro (ex.: `BlobAccessError`) vai na resposta: ajuda a diagnosticar e não é segredo.
    throw new DomainError('upstream_error', 'Envio de imagens indisponível no momento', {
      reason: 'storage',
      cause: name,
    });
  }
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
