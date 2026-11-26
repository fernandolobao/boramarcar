import type { Metadata } from 'next';
import { CardScanner } from '@/components/lab/card-scanner';

/** TESTE DESCARTÁVEL (spike): leitura de cartas pela câmera. Não vai para a main. */
export const metadata: Metadata = {
  title: 'Laboratório: ler carta pela câmera',
  robots: { index: false, follow: false },
};

export default function CameraLabPage() {
  return (
    <main
      id="conteudo"
      tabIndex={-1}
      className="mx-auto max-w-2xl space-y-4 px-4 py-6 focus:outline-none"
    >
      <h1 className="page-title">Ler carta pela câmera (teste)</h1>
      <p className="muted text-sm">
        Página de teste para medir o acerto. Enquadre a carta na moldura, com boa luz e sem reflexo,
        e toque em &quot;Ler carta&quot;. Marque se acertou ou errou.
      </p>
      <CardScanner />
    </main>
  );
}
