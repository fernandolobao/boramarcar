'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '../icons';

/**
 * Vídeo abstrato do topo (decorativo). Respeita "reduzir movimento" (não toca sozinho) e tem
 * botão para pausar/reproduzir (WCAG 2.2.2: movimento com mais de 5 s precisa de pausa).
 */
export function HeroVideo() {
  const t = useTranslations('home.hero');
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const element = video.current;
    if (!element) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduce.matches) return;
    element
      .play()
      .then(() => setPlaying(true))
      .catch(() => setPlaying(false));
  }, []);

  const toggle = () => {
    const element = video.current;
    if (!element) return;
    if (element.paused) {
      void element.play().then(() => setPlaying(true));
    } else {
      element.pause();
      setPlaying(false);
    }
  };

  return (
    <>
      <video
        ref={video}
        className="absolute inset-0 h-full w-full object-cover"
        muted
        loop
        playsInline
        preload="metadata"
        poster="/home/hero-poster.webp"
        aria-hidden="true"
        tabIndex={-1}
      >
        <source src="/home/hero.webm" type="video/webm" />
        <source src="/home/hero.mp4" type="video/mp4" />
      </video>
      <button
        type="button"
        onClick={toggle}
        className="absolute end-4 bottom-4 z-10 inline-flex size-11 items-center justify-center rounded-full bg-zinc-950/70 text-white ring-1 ring-white/30 backdrop-blur hover:bg-zinc-950/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        aria-label={playing ? t('pause') : t('play')}
        title={playing ? t('pause') : t('play')}
      >
        <Icon name={playing ? 'pause' : 'play'} className="size-5" />
      </button>
    </>
  );
}
