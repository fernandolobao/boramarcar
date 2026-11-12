import { themes } from '@boramarcar/tokens';
import { ImageResponse } from 'next/og';
import { FRAUNCES_600, SYMBOL_GOLD, WORDMARK_DARK } from './assets';

export const OG_SIZE = { width: 1200, height: 630 } as const;

/** Cache das imagens: mudam pouco; a CDN guarda por um dia e serve a antiga enquanto atualiza. */
const CACHE = 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800';

/** Cores do tema claro da plataforma (os mesmos tokens das telas). */
const c = themes.light;

export interface OgContent {
  /** Etiqueta acima do título (ex.: "Deck de Commander", "Convite para um grupo"). */
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Imagem ao lado do texto (ex.: arte do comandante), como na página do deck. */
  art?: string | null;
}

/** Corta textos longos para caber no cartão. */
const clip = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;

/**
 * Cartão de compartilhamento (1200×630) com a cara da plataforma: fundo pergaminho, cabeçalho com
 * o símbolo e o logotipo, e um cartão claro com borda (como os `card` das telas) com o título em
 * Fraunces, a descrição e, quando houver, a arte ao lado.
 */
export function renderOg({ eyebrow, title, subtitle, art }: OgContent) {
  const long = art ? 30 : 40;
  const titleSize = title.length > long ? 56 : title.length > 22 ? 66 : 78;
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: c.canvas,
        color: c.fg,
        fontFamily: 'Fraunces',
        padding: '44px 56px 52px',
        gap: 32,
      }}
    >
      {/* Cabeçalho, como o do app. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse (satori) usa <img> */}
        <img src={SYMBOL_GOLD} alt="" width={60} height={60} />
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse (satori) usa <img> */}
        <img src={WORDMARK_DARK} alt="" width={236} height={42} />
      </div>

      {/* Cartão principal. */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          backgroundColor: c.surface,
          border: `2px solid ${c.line}`,
          borderRadius: 32,
          boxShadow: '0 12px 32px rgba(11,7,22,0.08)',
          overflow: 'hidden',
        }}
      >
        {/* Faixa na cor da marca, à esquerda. */}
        <div style={{ display: 'flex', width: 14, backgroundColor: c.primary }} />
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '40px 48px',
            gap: 16,
          }}
        >
          {eyebrow && (
            <div
              style={{
                display: 'flex',
                alignSelf: 'flex-start',
                fontSize: 24,
                color: c.onAccent,
                backgroundColor: c.accent,
                borderRadius: 999,
                padding: '6px 18px',
              }}
            >
              {clip(eyebrow, 40)}
            </div>
          )}
          <div style={{ fontSize: titleSize, lineHeight: 1.08, color: c.fg }}>
            {clip(title, 70)}
          </div>
          {subtitle && (
            <div style={{ fontSize: 30, lineHeight: 1.35, color: c.fgMuted }}>
              {clip(subtitle, art ? 90 : 120)}
            </div>
          )}
          <div style={{ display: 'flex', marginTop: 8, fontSize: 24, color: c.link }}>
            arcanakin.com.br
          </div>
        </div>
        {art && (
          // eslint-disable-next-line @next/next/no-img-element -- ImageResponse (satori) usa <img>
          <img
            src={art}
            alt=""
            width={430}
            height={430}
            style={{ objectFit: 'cover', height: '100%', borderLeft: `2px solid ${c.line}` }}
          />
        )}
      </div>
    </div>,
    {
      ...OG_SIZE,
      fonts: [{ name: 'Fraunces', data: FRAUNCES_600, weight: 600, style: 'normal' }],
      headers: { 'Cache-Control': CACHE },
    },
  );
}
