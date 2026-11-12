import localFont from 'next/font/local';

/**
 * Fonte de display dos títulos: Fraunces (variável, eixos de peso e tamanho óptico), serifada
 * como o logotipo. Arquivo local (subconjunto latino, cobre o português), licença SIL OFL 1.1
 * (`Fraunces-OFL.txt`); nada é baixado de fora em tempo de build ou de uso.
 */
export const display = localFont({
  src: './fraunces-latin.woff2',
  variable: '--font-fraunces',
  weight: '100 900',
  display: 'swap',
  fallback: ['Georgia', 'Times New Roman', 'serif'],
});
