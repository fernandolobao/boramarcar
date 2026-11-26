import Image from 'next/image';

/**
 * Tela real do app (capturas de `public/showcase`, nos temas claro e escuro) numa moldura de
 * janela. Só uma das duas aparece; a outra fica `display: none` e fora da árvore de acessibilidade.
 * Por padrão as duas carregam sob demanda (`lazy`): o navegador só baixa a visível, mesmo no topo.
 */
export function Screenshot({
  name,
  alt,
  url,
  sizes,
  eager = false,
}: {
  name: string;
  alt: string;
  /** Endereço mostrado na barra da janela (decorativo). */
  url?: string;
  sizes: string;
  /** Na primeira tela: carrega já, com prioridade. */
  eager?: boolean;
}) {
  const loading = eager ? ('eager' as const) : ('lazy' as const);
  const fetchPriority = eager ? ('high' as const) : undefined;
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-xl">
      {url && (
        <div className="flex items-center gap-2 border-b border-line px-3 py-2" aria-hidden="true">
          <span className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-line-strong" />
            <span className="size-2.5 rounded-full bg-line-strong" />
            <span className="size-2.5 rounded-full bg-line-strong" />
          </span>
          <span className="mx-auto truncate rounded-md bg-canvas px-3 py-0.5 text-xs text-fg-muted">
            {url}
          </span>
        </div>
      )}
      <Image
        src={`/showcase/${name}-light.webp`}
        alt={alt}
        width={1280}
        height={800}
        sizes={sizes}
        loading={loading}
        fetchPriority={fetchPriority}
        className="block h-auto w-full dark:hidden"
      />
      <Image
        src={`/showcase/${name}-dark.webp`}
        alt={alt}
        width={1280}
        height={800}
        sizes={sizes}
        loading={loading}
        fetchPriority={fetchPriority}
        className="hidden h-auto w-full dark:block"
      />
    </div>
  );
}
