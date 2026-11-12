/**
 * Animação de virar uma carta de duas faces: ela vem um pouco para a frente (escala 1,08), gira
 * até ficar de lado, troca de face (`apply`) e termina o giro voltando ao tamanho normal. Rápida
 * (~300 ms). Com "reduzir movimento" ou sem Web Animations, só troca a face.
 */
const LIFT = 'perspective(900px) translateZ(0)';
const HALF_IN = 130;
const HALF_OUT = 170;

/** Cartas no meio do giro: um segundo clique espera o primeiro terminar (é ignorado). */
const busy = new WeakSet<HTMLElement>();

const prefersReduced = () =>
  typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Espera a imagem da outra face carregar (no máximo um instante), para não piscar vazio. */
function preloaded(src: string | null | undefined, timeout = 250): Promise<void> {
  if (!src || typeof Image === 'undefined') return Promise.resolve();
  const img = new Image();
  img.src = src;
  return Promise.race([
    img.decode().catch(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, timeout)),
  ]);
}

export function flipCard(
  el: HTMLElement | null | undefined,
  apply: () => void,
  { toBack, preload }: { toBack: boolean; preload?: string | null },
) {
  if (!el || typeof el.animate !== 'function' || prefersReduced()) {
    apply();
    return;
  }
  if (busy.has(el)) return;
  busy.add(el);
  let applied = false;
  const once = () => {
    if (applied) return;
    applied = true;
    apply();
  };
  const turn = toBack ? 1 : -1;
  const first = el.animate(
    [
      { transform: `${LIFT} scale(1) rotateY(0deg)` },
      { transform: `${LIFT} scale(1.08) rotateY(${90 * turn}deg)` },
    ],
    { duration: HALF_IN, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' },
  );
  void Promise.all([first.finished, preloaded(preload)])
    .then(() => {
      once();
      // A nova face entra do outro lado do giro e volta ao tamanho original.
      const second = el.animate(
        [
          { transform: `${LIFT} scale(1.08) rotateY(${-90 * turn}deg)` },
          { transform: `${LIFT} scale(1) rotateY(0deg)` },
        ],
        { duration: HALF_OUT, easing: 'cubic-bezier(0, 0, 0.2, 1)' },
      );
      first.cancel();
      return second.finished;
    })
    .catch(() => {
      // Animação interrompida (ex.: o diálogo fechou): garante a face certa.
      once();
    })
    .finally(() => busy.delete(el));
}
