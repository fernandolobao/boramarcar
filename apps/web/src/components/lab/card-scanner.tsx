'use client';

/**
 * TESTE DESCARTÁVEL (spike) — leitura de cartas pela câmera no navegador, sem servidor:
 * Tesseract.js (WASM, arquivos em /public/ocr) lê a faixa do nome e a linha de baixo (código da
 * edição e número de colecionador); o Scryfall acha a carta (`/cards/named?fuzzy=` ou
 * `/cards/{set}/{número}`). Serve só para medir o acerto em aparelhos reais.
 */
import { useEffect, useRef, useState } from 'react';
import type { Worker } from 'tesseract.js';

/** Proporção da carta (63 × 88 mm). */
const CARD = 63 / 88;
/** Altura da moldura em relação à altura do vídeo. */
const GUIDE = 0.8;

interface Result {
  id: number;
  ms: number;
  nameText: string;
  bottomText: string;
  match: { name: string; set: string; number: string; image: string | null; how: string } | null;
  nameCrop: string;
  bottomCrop: string;
  verdict?: 'ok' | 'bad';
}

/** Recorta uma faixa (frações da carta), amplia e passa para tons de cinza com contraste. */
function band(card: HTMLCanvasElement, x0: number, y0: number, x1: number, y1: number) {
  const w = card.width * (x1 - x0);
  const h = card.height * (y1 - y0);
  const scale = Math.max(1, 1200 / w);
  const out = document.createElement('canvas');
  out.width = Math.round(w * scale);
  out.height = Math.round(h * scale);
  const ctx = out.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(card, card.width * x0, card.height * y0, w, h, 0, 0, out.width, out.height);
  const img = ctx.getImageData(0, 0, out.width, out.height);
  const d = img.data;
  let min = 255;
  let max = 0;
  const gray = new Uint8ClampedArray(d.length / 4);
  for (let i = 0; i < gray.length; i++) {
    const g = 0.299 * d[i * 4]! + 0.587 * d[i * 4 + 1]! + 0.114 * d[i * 4 + 2]!;
    gray[i] = g;
    if (g < min) min = g;
    if (g > max) max = g;
  }
  const range = Math.max(1, max - min);
  for (let i = 0; i < gray.length; i++) {
    const v = ((gray[i]! - min) / range) * 255;
    d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
  return out;
}

/** Palavra com cara de nome de carta: "Ring", "Sol", "of", "Llanowar", "Praetors'". */
const NAME_WORD = /^([A-Z][a-zA-Z'’,-]+|[A-Z]|of|the|and|to|a|in|from|for|with|on)$/;

/**
 * Do que o leitor achou na faixa do nome, a sequência mais longa de palavras com cara de nome
 * (a moldura e o custo de mana viram "lixo" em volta).
 */
function nameCandidate(text: string) {
  const tokens = text
    .replace(/[^A-Za-zÀ-ÿ'’, -]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  let best: string[] = [];
  let run: string[] = [];
  for (const t of tokens) {
    if (NAME_WORD.test(t) && (t.length > 1 || run.length > 0)) run.push(t);
    else run = [];
    const longer = run.join('').length > best.join('').length;
    if (run.length > best.length || (run.length === best.length && longer)) best = [...run];
  }
  return best.join(' ').replace(/,$/, '');
}

async function scryfall(url: string) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) return null;
  const c = (await res.json()) as {
    name: string;
    set: string;
    collector_number: string;
    image_uris?: { small?: string };
    card_faces?: { image_uris?: { small?: string } }[];
  };
  return {
    name: c.name,
    set: c.set.toUpperCase(),
    number: c.collector_number,
    image: c.image_uris?.small ?? c.card_faces?.[0]?.image_uris?.small ?? null,
  };
}

export function CardScanner() {
  const video = useRef<HTMLVideoElement>(null);
  const worker = useRef<Promise<Worker> | null>(null);
  const [camera, setCamera] = useState<'off' | 'on' | 'error'>('off');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [results, setResults] = useState<Result[]>([]);

  const getWorker = () => {
    worker.current ??= import('tesseract.js').then(async ({ createWorker }) => {
      setStatus('Carregando o leitor de texto (só na primeira vez)…');
      const w = await createWorker('eng', 1, {
        workerPath: '/ocr/worker.min.js',
        corePath: '/ocr/core',
        langPath: '/ocr',
        workerBlobURL: false,
      });
      setStatus('');
      return w;
    });
    return worker.current;
  };

  useEffect(
    () => () => {
      const stream = video.current?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
      void worker.current?.then((w) => w.terminate());
    },
    [],
  );

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      video.current!.srcObject = stream;
      await video.current!.play();
      setCamera('on');
      void getWorker();
    } catch (e) {
      setCamera('error');
      setStatus(`Não deu para abrir a câmera: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  /** Lê a carta de uma imagem já recortada na moldura. */
  const read = async (card: HTMLCanvasElement) => {
    setBusy(true);
    setStatus('Lendo…');
    const t0 = performance.now();
    try {
      const w = await getWorker();
      // Faixa do nome (sem o custo de mana à direita) e linha de baixo à esquerda.
      const nameCanvas = band(card, 0.05, 0.035, 0.78, 0.095);
      const bottomCanvas = band(card, 0.03, 0.915, 0.55, 0.975);
      const name = (await w.recognize(nameCanvas)).data.text.trim();
      const bottom = (await w.recognize(bottomCanvas)).data.text.trim();
      const cleanName = nameCandidate(name);
      // Linha de baixo das cartas novas: "0123 C" e "DMU • EN" (o "•" às vezes vira "+").
      const setMatch = /\b([A-Z0-9]{3,5})\W{0,3}(EN|PT|ES|JP|DE|FR|IT)\b/.exec(bottom);
      const set = setMatch?.[1];
      // O número de colecionador vem antes do código da edição.
      const before = setMatch ? bottom.slice(0, setMatch.index) : bottom;
      // "190/332" (cartas mais antigas): o número é o da esquerda; senão, o último antes da edição.
      const number =
        /\b(\d{1,4})\s*\/\s*\d{1,4}\b/.exec(before)?.[1] ??
        [...before.matchAll(/\b(\d{1,4})\b/g)].at(-1)?.[1];
      let match: Result['match'] = null;
      if (number && set) {
        const exact = await scryfall(
          `https://api.scryfall.com/cards/${set.toLowerCase()}/${Number(number)}`,
        );
        // Confere com o nome lido: se não bate, a edição/número foi mal lida.
        const first = cleanName.split(' ')[0]?.toLowerCase() ?? '';
        const agrees = !first || first.length < 3 || exact?.name.toLowerCase().includes(first);
        if (exact && agrees) match = { ...exact, how: 'edição + número' };
      }
      if (!match && cleanName.length >= 3) {
        const fuzzy = await scryfall(
          `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(cleanName)}`,
        );
        if (fuzzy) match = { ...fuzzy, how: 'nome (aproximado)' };
      }
      setResults((r) => [
        {
          id: Date.now(),
          ms: Math.round(performance.now() - t0),
          nameText: name,
          bottomText: bottom,
          match,
          nameCrop: nameCanvas.toDataURL('image/jpeg', 0.7),
          bottomCrop: bottomCanvas.toDataURL('image/jpeg', 0.7),
        },
        ...r,
      ]);
      setStatus(match ? `Achei: ${match.name}` : 'Não achei a carta.');
    } catch (e) {
      setStatus(`Erro: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  /** Recorta do vídeo a área da moldura (centralizada, 80% da altura). */
  const capture = () => {
    const v = video.current!;
    const h = v.videoHeight * GUIDE;
    const w = h * CARD;
    const card = document.createElement('canvas');
    card.width = Math.round(w);
    card.height = Math.round(h);
    card
      .getContext('2d')!
      .drawImage(v, (v.videoWidth - w) / 2, (v.videoHeight - h) / 2, w, h, 0, 0, w, h);
    void read(card);
  };

  /** Foto da câmera do sistema: usa a imagem inteira como a carta (enquadre bem justo). */
  const fromFile = async (file: File) => {
    const bitmap = await createImageBitmap(file);
    // Se a foto for mais larga que a carta, corta o centro na proporção da carta.
    let w = bitmap.width;
    let h = bitmap.height;
    if (w / h > CARD) w = h * CARD;
    else h = w / CARD;
    const card = document.createElement('canvas');
    card.width = Math.round(w);
    card.height = Math.round(h);
    card
      .getContext('2d')!
      .drawImage(bitmap, (bitmap.width - w) / 2, (bitmap.height - h) / 2, w, h, 0, 0, w, h);
    void read(card);
  };

  const ok = results.filter((r) => r.verdict === 'ok').length;
  const bad = results.filter((r) => r.verdict === 'bad').length;

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl bg-black">
        <video ref={video} playsInline muted className="block aspect-video w-full object-contain" />
        {camera === 'on' && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-xl border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
            style={{ height: `${GUIDE * 100}%`, aspectRatio: '63 / 88' }}
          />
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {camera !== 'on' ? (
          <button type="button" className="btn-primary" onClick={() => void start()}>
            Abrir câmera
          </button>
        ) : (
          <button type="button" className="btn-primary" disabled={busy} onClick={capture}>
            Ler carta
          </button>
        )}
        <label className="btn-secondary">
          Tirar foto
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void fromFile(f);
              e.target.value = '';
            }}
          />
        </label>
      </div>
      <p role="status" className="text-sm">
        {status}
      </p>
      {results.length > 0 && (
        <p className="text-sm font-medium">
          Acertos: {ok} · Erros: {bad} · Leituras: {results.length}
        </p>
      )}
      <ul className="space-y-3">
        {results.map((r) => (
          <li key={r.id} className="card space-y-2 text-sm">
            <div className="flex gap-3">
              {r.match?.image && (
                // eslint-disable-next-line @next/next/no-img-element -- teste
                <img src={r.match.image} alt="" className="w-24 rounded-md" />
              )}
              <div className="min-w-0 space-y-1">
                <p className="font-semibold">
                  {r.match ? `${r.match.name} · ${r.match.set} #${r.match.number}` : 'Não achou'}
                </p>
                <p className="muted">
                  {r.match ? `por ${r.match.how} · ` : ''}
                  {r.ms} ms
                </p>
                <p className="muted break-words">Nome lido: “{r.nameText}”</p>
                <p className="muted break-words">Linha de baixo: “{r.bottomText}”</p>
              </div>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element -- teste */}
            <img src={r.nameCrop} alt="" className="w-full rounded border border-line" />
            {/* eslint-disable-next-line @next/next/no-img-element -- teste */}
            <img src={r.bottomCrop} alt="" className="w-1/2 rounded border border-line" />
            <div className="flex gap-2">
              {(['ok', 'bad'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  className={r.verdict === v ? 'btn-primary' : 'btn-secondary'}
                  aria-pressed={r.verdict === v}
                  onClick={() =>
                    setResults((list) =>
                      list.map((x) => (x.id === r.id ? { ...x, verdict: v } : x)),
                    )
                  }
                >
                  {v === 'ok' ? 'Acertou' : 'Errou'}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
