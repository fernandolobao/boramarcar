import { expect, test } from '@playwright/test';
import { AUTH_STATE } from './support/global-setup';

/** Foto do perfil em Configurações: o arquivo errado é recusado no navegador, sem envio. */
test.describe('foto do perfil', () => {
  test.skip(!process.env.E2E_DATABASE_URL, 'requer banco (E2E_DATABASE_URL)');
  test.use({ storageState: AUTH_STATE });

  test('mostra a foto atual (ou iniciais) e recusa um GIF antes de enviar', async ({ page }) => {
    await page.goto('/configuracoes');
    const photo = page.getByRole('group', { name: 'Foto do perfil' });
    await expect(photo.getByRole('button', { name: /Escolher foto|Trocar foto/ })).toBeVisible();
    let uploads = 0;
    page.on('request', (r) => {
      if (r.url().includes('/api/v1/me/avatar')) uploads += 1;
    });
    await photo.getByLabel('Arquivo da foto').setInputFiles({
      name: 'animacao.gif',
      mimeType: 'image/gif',
      buffer: Buffer.from('GIF89a'),
    });
    await expect(photo.getByRole('alert')).toHaveText('Use uma imagem JPEG, PNG ou WebP.');
    expect(uploads).toBe(0);
  });
});
