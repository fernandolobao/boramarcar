import type { MetadataRoute } from 'next';
import { palette } from '@boramarcar/tokens';

/**
 * Manifesto do app instalável (PWA): "Adicionar à tela inicial" abre o painel em tela cheia, com
 * o símbolo como ícone. Ícones gerados por `scripts/brand-icons.mjs`.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ArcanaKin',
    short_name: 'ArcanaKin',
    description: 'Marque o próximo Commander com a sua mesa.',
    lang: 'pt-BR',
    start_url: '/painel',
    scope: '/',
    display: 'standalone',
    background_color: palette.noite,
    theme_color: palette.noite,
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
