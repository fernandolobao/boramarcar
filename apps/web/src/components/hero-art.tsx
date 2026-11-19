import Image from 'next/image';

/**
 * Arte de fundo dos destaques (painel e encontro): a arte do comandante, tingida na cor da marca
 * por cima. É decorativa, mas é o maior elemento da tela (o LCP), então é pré-carregada com
 * prioridade alta (antes era um `background-image` em prioridade baixa). Vem direto do Scryfall
 * (`unoptimized`): o otimizador do Next busca sem `User-Agent`, e o Scryfall recusa (400).
 * O pai precisa ser `relative isolate overflow-hidden`.
 */
export function HeroArt({ src }: { src: string }) {
  return (
    <Image
      src={src}
      alt=""
      aria-hidden="true"
      fill
      preload
      fetchPriority="high"
      unoptimized
      sizes="(min-width: 1024px) 1024px, 100vw"
      className="-z-20 object-cover object-[50%_30%] mix-blend-luminosity"
    />
  );
}
