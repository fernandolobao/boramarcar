import { palette } from '@boramarcar/tokens';
import { ImageResponse } from 'next/og';
import { FRAUNCES_600, SYMBOL_GOLD, WORDMARK_LIGHT } from './assets';

export const OG_SIZE = { width: 1200, height: 630 } as const;

/** Cache das imagens: mudam pouco; a CDN guarda por um dia e serve a antiga enquanto atualiza. */
const CACHE = 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800';

export interface OgContent {
  /** Linha pequena acima do título (ex.: "Deck de Commander"). */
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Arte de fundo (ex.: arte do comandante), escurecida para o texto ter contraste. */
  background?: string | null;
}

/** Corta textos longos para caber no cartão. */
const clip = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;

/**
 * Cartão de compartilhamento (1200×630) na identidade do ArcanaKin: fundo arcano (ou arte
 * escurecida), símbolo dourado, logotipo e o título da página em Fraunces.
 */
export function renderOg({ eyebrow, title, subtitle, background }: OgContent) {
  const titleSize = title.length > 40 ? 60 : title.length > 24 ? 72 : 84;
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        position: 'relative',
        backgroundColor: palette.noite,
        backgroundImage: `radial-gradient(circle at 25% 35%, #3a1670 0%, ${palette.noite} 70%)`,
        color: palette.pergaminho,
        fontFamily: 'Fraunces',
      }}
    >
      {background && (
        // eslint-disable-next-line @next/next/no-img-element -- ImageResponse (satori) usa <img>
        <img
          src={background}
          alt=""
          width={1200}
          height={630}
          style={{ position: 'absolute', top: 0, left: 0, objectFit: 'cover' }}
        />
      )}
      {background && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            backgroundImage:
              'linear-gradient(to right, rgba(11,7,22,0.94), rgba(11,7,22,0.74) 50%, rgba(11,7,22,0.3))',
          }}
        />
      )}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 72px',
          width: '100%',
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse (satori) usa <img> */}
          <img src={SYMBOL_GOLD} alt="" width={88} height={96} />
          {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse (satori) usa <img> */}
          <img src={WORDMARK_LIGHT} alt="" width={337} height={60} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 960 }}>
          {eyebrow && (
            <div
              style={{
                fontSize: 30,
                color: palette.dourado,
                letterSpacing: 2,
                textTransform: 'uppercase',
              }}
            >
              {clip(eyebrow, 60)}
            </div>
          )}
          <div style={{ fontSize: titleSize, lineHeight: 1.08 }}>{clip(title, 70)}</div>
          {subtitle && (
            <div style={{ fontSize: 34, lineHeight: 1.3, opacity: 0.88 }}>
              {clip(subtitle, 120)}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', fontSize: 26, color: palette.dourado }}>
          arcanakin.com.br
        </div>
      </div>
    </div>,
    {
      ...OG_SIZE,
      fonts: [{ name: 'Fraunces', data: FRAUNCES_600, weight: 600, style: 'normal' }],
      headers: { 'Cache-Control': CACHE },
    },
  );
}
