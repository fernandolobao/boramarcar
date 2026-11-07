import { logo } from '@boramarcar/tokens';
import type { SVGProps } from 'react';

/**
 * Logotipo ArcanaKin (uma cor: herda a cor do texto, então serve no claro e no escuro). Com
 * `title`, é uma imagem com nome (ex.: sozinho num link); sem `title`, é decorativo (use quando
 * o nome já está em texto ao lado ou num rótulo).
 */
export function Logo({ title, ...props }: SVGProps<SVGSVGElement> & { title?: string }) {
  return (
    <svg
      viewBox={logo.viewBox}
      fill="currentColor"
      {...(title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true })}
      focusable="false"
      {...props}
    >
      <path d={logo.path} />
    </svg>
  );
}
