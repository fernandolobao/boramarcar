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
export async function processUploadedImage(input: Buffer): Promise<Buffer> {
  try {
    return await sharp(input, { limitInputPixels: 50_000_000 })
      .rotate()
      .resize(IMAGE_SIZE, IMAGE_SIZE, { fit: 'cover', position: 'attention' })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    throw new DomainError('invalid_input', 'Não foi possível ler a imagem');
  }
}
