import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { processUploadedImage } from './images';

describe('tratamento da imagem enviada', () => {
  it('recorta em quadrado de 512, converte para WebP e tira os metadados (GPS inclusive)', async () => {
    const photo = await sharp({
      create: { width: 1200, height: 800, channels: 3, background: { r: 120, g: 40, b: 200 } },
    })
      .jpeg()
      .withExif({ IFD0: { Make: 'Celular', Copyright: 'Ana' }, IFD3: { GPSLatitudeRef: 'S' } })
      .toBuffer();
    expect((await sharp(photo).metadata()).exif).toBeDefined();

    const out = await processUploadedImage(photo);
    const meta = await sharp(out).metadata();
    expect(meta.format).toBe('webp');
    expect([meta.width, meta.height]).toEqual([512, 512]);
    expect(meta.exif).toBeUndefined();
    expect(meta.icc).toBeUndefined();
  });

  it('arquivo que não é imagem de verdade é recusado', async () => {
    await expect(processUploadedImage(Buffer.from('não sou uma imagem'))).rejects.toMatchObject({
      code: 'invalid_input',
    });
  });

  it('só JPEG, PNG ou WebP de verdade (o tipo informado pelo navegador não basta)', async () => {
    const gif = await sharp({
      create: { width: 10, height: 10, channels: 3, background: { r: 0, g: 0, b: 0 } },
    })
      .gif()
      .toBuffer();
    await expect(processUploadedImage(gif)).rejects.toMatchObject({ code: 'invalid_input' });
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>');
    await expect(processUploadedImage(svg)).rejects.toMatchObject({ code: 'invalid_input' });
  });
});
