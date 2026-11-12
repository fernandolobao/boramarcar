/**
 * Gera os ícones a partir do símbolo (`public/brand/simbolo.svg`): ícone do site para iPhone e
 * PWA, imagem de compartilhamento (Open Graph) e os ícones e a abertura do app mobile.
 * Desenha com o Chromium do Playwright (já é dependência dos testes).
 *
 *   node apps/web/scripts/brand-icons.mjs
 *
 * Cores dos tokens: símbolo Dourado sobre Noite (o mesmo par do tema escuro).
 */
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const web = join(dirname(fileURLToPath(import.meta.url)), '..');
const mobile = join(web, '..', 'mobile');
const NOITE = '#0b0716';
const DOURADO = '#f6b944';
const ETER = '#7c3aed';

const svg = readFileSync(join(web, 'public/brand/simbolo.svg'), 'utf8');
const viewBox = svg.match(/viewBox="([^"]+)"/)[1];
const paths = svg.match(/<path [^>]+\/>/g).join('');
const [, , vbW, vbH] = viewBox.split(' ').map(Number);
const ratio = vbW / vbH;

/** Símbolo com altura `h` (px) e cor `color`. */
const symbol = (h, color) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${h * ratio}" height="${h}" fill="${color}">${paths}</svg>`;

/** Quadrado `size` com o símbolo ocupando `scale` da altura, sobre `bg` (ou transparente). */
const square = (size, { scale, color = DOURADO, bg = null, glow = false }) => `
  <div style="width:${size}px;height:${size}px;display:grid;place-items:center;${
    bg ? `background:${bg};` : ''
  }${
    glow
      ? `background:radial-gradient(circle at 50% 42%, color-mix(in srgb, ${ETER} 38%, ${NOITE}) 0%, ${NOITE} 68%);`
      : ''
  }">${symbol(size * scale, color)}</div>`;

const fraunces = readFileSync(join(web, 'src/fonts/fraunces-latin.woff2')).toString('base64');
const wordmark = readFileSync(join(web, 'public/brand/logotipo-claro.svg'), 'utf8');

const og = `
  <style>
    @font-face { font-family: Fraunces; src: url(data:font/woff2;base64,${fraunces}) format('woff2'); font-weight: 100 900; }
  </style>
  <div style="width:1200px;height:630px;display:flex;align-items:center;gap:72px;padding:0 96px;box-sizing:border-box;
    background:radial-gradient(circle at 22% 45%, color-mix(in srgb, ${ETER} 45%, ${NOITE}) 0%, ${NOITE} 60%);color:#f4ebdb;font-family:Fraunces,serif">
    ${symbol(360, DOURADO)}
    <div style="display:flex;flex-direction:column;gap:28px">
      <div style="width:560px">${wordmark.replace(/<\?xml[^>]*>/, '').replace('<svg ', '<svg width="560" ')}</div>
      <p style="margin:0;font-size:44px;line-height:1.2;font-weight:500;max-width:600px">Marque o próximo Commander com a sua mesa.</p>
    </div>
  </div>`;

const outputs = [
  // Site
  {
    file: join(web, 'src/app/apple-icon.png'),
    size: 180,
    html: square(180, { scale: 0.62, glow: true }),
  },
  {
    file: join(web, 'public/icons/icon-192.png'),
    size: 192,
    html: square(192, { scale: 0.62, glow: true }),
  },
  {
    file: join(web, 'public/icons/icon-512.png'),
    size: 512,
    html: square(512, { scale: 0.62, glow: true }),
  },
  // "maskable": o sistema pode cortar em círculo; o símbolo fica na zona segura (80% do centro).
  {
    file: join(web, 'public/icons/icon-maskable-512.png'),
    size: 512,
    html: square(512, { scale: 0.5, glow: true }),
  },
  { file: join(web, 'src/app/opengraph-image.png'), width: 1200, height: 630, html: og },
  // App
  {
    file: join(mobile, 'assets/icon.png'),
    size: 1024,
    html: square(1024, { scale: 0.62, glow: true }),
    opaque: true,
  },
  {
    file: join(mobile, 'assets/favicon.png'),
    size: 48,
    html: square(48, { scale: 0.7, bg: NOITE }),
  },
  // Android adaptativo: 108 dp com 72 dp seguros; o símbolo cabe em ~60% da camada da frente.
  {
    file: join(mobile, 'assets/android-icon-foreground.png'),
    size: 512,
    html: square(512, { scale: 0.48 }),
  },
  {
    file: join(mobile, 'assets/android-icon-background.png'),
    size: 512,
    html: square(512, { scale: 0, glow: true }),
  },
  {
    file: join(mobile, 'assets/android-icon-monochrome.png'),
    size: 432,
    html: square(432, { scale: 0.48, color: '#ffffff' }),
  },
  // Abertura do app: símbolo dourado (fundo Noite em app.json).
  { file: join(mobile, 'assets/splash-icon.png'), size: 1024, html: square(1024, { scale: 0.8 }) },
];

const browser = await chromium.launch();
for (const out of outputs) {
  const width = out.width ?? out.size;
  const height = out.height ?? out.size;
  const page = await browser.newPage({ viewport: { width, height } });
  await page.setContent(`<body style="margin:0;background:transparent">${out.html}</body>`);
  await page.evaluate(() => document.fonts.ready);
  mkdirSync(dirname(out.file), { recursive: true });
  await page.screenshot({ path: out.file, omitBackground: !out.opaque });
  await page.close();
  process.stdout.write(`ok ${out.file.replace(`${web}/`, '')}\n`);
}
await browser.close();
