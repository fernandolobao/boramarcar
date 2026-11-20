import 'server-only';
import { DomainError } from '@boramarcar/core';
import { IMAGE_SIZE } from '@boramarcar/core/images';
import sharp from 'sharp';

/**
 * Prepara a imagem enviada (foto do perfil ou logo da loja) para guardar: endireita pela
 * orientação da câmera, recorta em quadrado pelo centro, reduz para 512 px e converte para WebP.
 * Os metadados (EXIF com a localização da foto, perfil de cor, câmera) não vão junto: o `sharp`
 * só os mantém quando se pede.
 */
/** Formatos aceitos de verdade (lidos do arquivo, não do tipo que o navegador informou). */
const FORMATS = new Set(['jpeg', 'png', 'webp']);
/** Até 25 megapixels (uma foto de celular tem uns 12): impede "bombas" de descompressão. */
const MAX_PIXELS = 25_000_000;

export async function processUploadedImage(input: Buffer): Promise<Buffer> {
  try {
    const { format } = await sharp(input, { limitInputPixels: MAX_PIXELS }).metadata();
    if (!format || !FORMATS.has(format)) throw new Error(`formato ${format ?? '?'}`);
    return await sharp(input, { limitInputPixels: MAX_PIXELS, failOn: 'error' })
      .rotate()
      .resize(IMAGE_SIZE, IMAGE_SIZE, { fit: 'cover', position: 'attention' })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    throw new DomainError('invalid_input', 'Não foi possível ler a imagem');
  }
}
