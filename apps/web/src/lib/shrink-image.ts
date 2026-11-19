/** Lado máximo da foto reduzida no navegador antes do envio. */
const MAX_SIDE = 1600;
/** Abaixo disto o arquivo vai como está (o servidor reduz de qualquer jeito). */
const SMALL_ENOUGH = 1_500_000;

/**
 * Reduz a foto no navegador antes de enviar: fotos de celular passam fácil dos 4 MB que o servidor
 * aceita. `createImageBitmap` já endireita pela orientação da câmera. Sem suporte (ou se falhar),
 * devolve o arquivo original e o servidor decide.
 */
export async function shrinkImage(file: File): Promise<Blob> {
  if (file.size <= SMALL_ENOUGH || typeof createImageBitmap !== 'function') return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.9),
    );
    return blob ?? file;
  } catch {
    return file;
  }
}
