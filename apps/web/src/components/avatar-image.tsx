'use client';

import Image from 'next/image';
import { useState } from 'react';

/** Iniciais do nome (até duas). */
export const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

/**
 * Foto do perfil (ex.: a do Google) com as iniciais como reserva: sem foto, ou se a URL falhar
 * (expirou, mudou, foi bloqueada), mostra as iniciais. Decorativa: o nome está em texto ao lado.
 * `no-referrer` evita recusas do servidor de fotos do Google a pedidos vindos de outros sites.
 */
export function AvatarImage({
  name,
  image,
  sizes,
}: {
  name: string;
  image: string | null | undefined;
  sizes: string;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  if (!image || failed === image) return <span aria-hidden="true">{initialsOf(name)}</span>;
  return (
    <Image
      src={image}
      alt=""
      fill
      sizes={sizes}
      unoptimized
      referrerPolicy="no-referrer"
      className="object-cover"
      onError={() => setFailed(image)}
    />
  );
}
