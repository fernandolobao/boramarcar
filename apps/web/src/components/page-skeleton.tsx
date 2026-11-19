/**
 * Esqueleto mostrado na hora em que se troca de página na área logada (`loading.tsx`), enquanto o
 * servidor monta a página nova: título e cartões cinza no lugar do conteúdo. Para leitores de
 * tela, só "Carregando…" numa região de status; os blocos são decorativos.
 */
export function PageSkeleton({ label }: { label: string }) {
  const block = 'rounded-xl bg-surface-muted motion-safe:animate-pulse';
  return (
    <div aria-busy="true" className="space-y-6">
      <p role="status" className="sr-only">
        {label}
      </p>
      <div aria-hidden="true" className="space-y-6">
        <div className="space-y-2">
          <div data-skeleton className={`${block} h-9 w-56 max-w-full`} />
          <div data-skeleton className={`${block} h-4 w-80 max-w-full`} />
        </div>
        {[0, 1].map((i) => (
          <div key={i} className="card space-y-3">
            <div data-skeleton className={`${block} h-6 w-40`} />
            <div data-skeleton className={`${block} h-4 w-full`} />
            <div data-skeleton className={`${block} h-4 w-5/6`} />
            <div data-skeleton className={`${block} h-4 w-2/3`} />
          </div>
        ))}
      </div>
    </div>
  );
}
