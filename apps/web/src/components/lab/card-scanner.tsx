'use client';

/**
 * TESTE DESCARTÁVEL (spike) — leitura de cartas pela câmera no navegador, sem servidor:
 * Tesseract.js (WASM, arquivos em /public/ocr) lê a carta inteira; o nome vem das linhas de cima e
 * a edição/número (cartas novas: "0123 C", "DMU • EN") de qualquer lugar do texto. O Scryfall acha
 * a carta (`/cards/{set}/{número}` conferido com o nome, ou `/cards/named?fuzzy=`).
 */
import { useEffect, useRef, useState } from 'react';
import type { Worker } from 'tesseract.js';

/** Proporção da carta (63 × 88 mm). */
const CARD = 63 / 88;

interface Result {
  id: number;
  ms: number;
  text: string;
  tried: string[];
  match: { name: string; set: string; number: string; image: string | null; how: string } | null;
  crop: string;
  verdict?: 'ok' | 'bad';
}

/** Moldura dentro do vídeo (px do vídeo): 80% da altura, sem passar de 85% da largura. */
function guideOf(w: number, h: number) {
  const gh = Math.min(h * 0.8, (w * 0.85) / CARD);
  return { gw: gh * CARD, gh };
}

/** Prepara para o leitor: largura entre 1000 e `maxWidth` px, cinza com contraste esticado. */
function prepare(src: HTMLCanvasElement, maxWidth = 1600) {
  const scale = Math.min(Math.max(1, 1000 / src.width), maxWidth / src.width);
  const out = document.createElement('canvas');
  out.width = Math.round(src.width * scale);
  out.height = Math.round(src.height * scale);
  const ctx = out.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, out.width, out.height);
  const img = ctx.getImageData(0, 0, out.width, out.height);
  const d = img.data;
  let min = 255;
  let max = 0;
  for (let i = 0; i < d.length; i += 4) {
    const g = 0.299 * d[i]! + 0.587 * d[i + 1]! + 0.114 * d[i + 2]!;
    d[i] = g;
    if (g < min) min = g;
    if (g > max) max = g;
  }
  const range = Math.max(1, max - min);
  for (let i = 0; i < d.length; i += 4) {
    const v = ((d[i]! - min) / range) * 255;
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
  return out;
}

/** Palavra com cara de nome de carta: "Ring", "Sol", "of", "Llanowar", "Praetors'". */
const NAME_WORD =
  /^([A-ZÀ-Ý][a-zà-ÿ'’,-]+[a-zA-Zà-ÿÀ-Ý'’,-]*|of|the|and|to|a|in|from|for|with|on|de|do|da|dos|das|e|o|os|as|no|na|nos|nas|em|por|para|com|sem|ao|aos|à|às|pelo|pela|pelos|pelas|um|uma|sob|sobre|entre|contra)$/;
/** Palavras da linha de tipo: não são nome de carta. */
const TYPE_WORDS = new Set(
  'Artifact Creature Instant Sorcery Enchantment Land Legendary Basic Token Planeswalker Battle Tribal Kindred Snow World Aura Equipment Vehicle'.split(
    ' ',
  ),
);

/** Numa linha lida, a sequência mais longa de palavras com cara de nome. */
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
  // Palavras de ligação soltas nas pontas não fazem parte do nome.
  while (best.length && /^[a-z]/.test(best.at(-1)!)) best.pop();
  while (best.length && /^[a-z]/.test(best[0]!)) best.shift();
  if (best.every((w) => TYPE_WORDS.has(w.replace(/[,]/g, '')))) return '';
  return best.join(' ').replace(/,$/, '');
}

/** Variações para a busca: o nome lido e ele sem palavras do fim (lixo colado), até 2 palavras. */
const variants = (name: string) => {
  const words = name.split(' ');
  const out = [name];
  for (let n = words.length - 1; n >= 2; n--) out.push(words.slice(0, n).join(' '));
  return out;
};

/** Quantas letras (o candidato "com mais nome" vem primeiro). */
const letters = (s: string) => s.replace(/[^A-Za-zÀ-ÿ]/g, '').length;

/** Semelhança entre dois nomes (0–1), pela distância de edição sem acentos nem maiúsculas. */
function similarity(a: string, b: string) {
  const norm = (s: string) =>
    s
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .replace(/[^a-z ]/g, '');
  const x = norm(a);
  const y = norm(b);
  const d: number[] = Array.from({ length: y.length + 1 }, (_, j) => j);
  for (let i = 1; i <= x.length; i++) {
    let prev = d[0]!;
    d[0] = i;
    for (let j = 1; j <= y.length; j++) {
      const tmp = d[j]!;
      d[j] = Math.min(d[j]! + 1, d[j - 1]! + 1, prev + (x[i - 1] === y[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return 1 - d[y.length]! / Math.max(x.length, y.length, 1);
}

/** Carta pelo nome impresso em português (o fuzzy do Scryfall só conhece os nomes em inglês). */
async function byPrintedName(candidate: string) {
  const q = `lang:pt ${candidate.replace(/[^\p{L}\s'-]/gu, ' ')}`;
  const res = await politeFetch(
    `https://api.scryfall.com/cards/search?q=${encodeURIComponent(q)}&include_multilingual=true&unique=prints&order=released`,
  );
  if (!res?.ok) return null;
  const body = (await res.json()) as {
    data: {
      name: string;
      printed_name?: string;
      set: string;
      collector_number: string;
      image_uris?: { small?: string };
    }[];
  };
  const c = body.data.find((x) => x.printed_name && similarity(x.printed_name, candidate) >= 0.7);
  return c
    ? {
        name: `${c.name} (${c.printed_name})`,
        set: c.set.toUpperCase(),
        number: c.collector_number,
        image: c.image_uris?.small ?? null,
      }
    : null;
}

/** Espera entre consultas: o Scryfall pede no máximo 10 por segundo. */
let lastCall = 0;
async function politeFetch(url: string) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const wait = Math.max(0, lastCall + 150 - Date.now()) + attempt * 600;
    if (wait) await new Promise((r) => setTimeout(r, wait));
    lastCall = Date.now();
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (res.status !== 429) return res;
    } catch {
      // Limite do Scryfall (a resposta 429 vem sem CORS e vira erro de rede): tenta de novo.
    }
  }
  return null;
}

/** Carta por endereço, com o nome impresso (cartas em outra língua). */
async function scryfallPrinted(url: string) {
  const res = await politeFetch(url);
  if (!res?.ok) return null;
  const c = (await res.json()) as {
    name: string;
    printed_name?: string;
    set: string;
    collector_number: string;
    image_uris?: { small?: string };
    card_faces?: { image_uris?: { small?: string } }[];
  };
  return {
    name: c.name,
    printed: c.printed_name ?? null,
    set: c.set.toUpperCase(),
    number: c.collector_number,
    image: c.image_uris?.small ?? c.card_faces?.[0]?.image_uris?.small ?? null,
  };
}

async function scryfall(url: string) {
  const res = await politeFetch(url);
  if (!res?.ok) return null;
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
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
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
      const v = video.current!;
      v.srcObject = stream;
      await v.play();
      setDims({ w: v.videoWidth, h: v.videoHeight });
      setCamera('on');
      void getWorker();
    } catch (e) {
      setCamera('error');
      setStatus(`Não deu para abrir a câmera: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  /** Lê a carta numa imagem (o recorte da moldura, ou a foto inteira). */
  const read = async (image: HTMLCanvasElement, nameZone: number, maxWidth = 1600) => {
    setBusy(true);
    setStatus('Lendo…');
    const t0 = performance.now();
    try {
      const w = await getWorker();
      const prepared = prepare(image, maxWidth);
      const { data } = await w.recognize(prepared);
      const text = data.text.trim();
      // Nome: linhas na parte de cima (na moldura) ou em qualquer lugar (na foto), de cima para baixo.
      const lines = [...(data.lines ?? [])]
        .filter((l) => l.bbox.y0 < prepared.height * nameZone)
        // Linha de copyright e do ilustrador não são nome de carta.
        .filter((l) => !/wizards|coast|©|™|illus/i.test(l.text))
        // Linha de tipo ("Legendary Creature — Angel") também não.
        .filter((l) => !TYPE_WORDS.has(nameCandidate(l.text).split(' ')[0] ?? ''))
        .sort((a, b) => a.bbox.y0 - b.bbox.y0);
      // Os nomes lidos, os mais longos primeiro (lixo costuma ser curto), com as variações.
      const names = [
        ...new Set(lines.map((l) => nameCandidate(l.text)).filter((n) => letters(n) >= 4)),
      ]
        .sort((a, b) => letters(b) - letters(a))
        .slice(0, 3);
      const candidates = [...new Set(names.flatMap(variants))].slice(0, 4);
      // Edição e número (cartas novas): "0123 C … DMU • EN" ou "190/332 M … 2XM • EN".
      // Código da edição: 3 a 5 caracteres com ao menos uma letra ("038" é o número, não a edição).
      const setMatch =
        /\b((?=[A-Za-z0-9]{0,4}[A-Za-z])[A-Za-z0-9]{3,5})\W{0,3}(EN|PT|ES|JP|DE|FR|IT)\b/.exec(
          text,
        );
      const set = setMatch?.[1]?.toUpperCase();
      const lang = setMatch?.[2]?.toLowerCase() ?? 'en';
      const before = setMatch ? text.slice(Math.max(0, setMatch.index - 40), setMatch.index) : '';
      // Número de colecionador: "190/332", "0499" (zero à esquerda) ou seguido da raridade;
      // anos ("© 2026") não contam.
      const numbers = [...before.matchAll(/\b(\d{1,4})\b(\s*[CURMSLT]\b)?/g)].filter(
        (m) => !/^(19|20)\d\d$/.test(m[1]!),
      );
      const slash = /\b(\d{1,4})\s*\/\s*\d{1,4}\b/.exec(before)?.[1];
      const marked = numbers.find((m) => m[1]!.startsWith('0') || m[2])?.[1];
      const number = slash ?? marked ?? numbers.at(-1)?.[1];
      /** Número no formato da linha de colecionador ("0499", "190/332"): sinal forte. */
      const strongNumber = Boolean(slash ?? marked);
      const tried: string[] = [];
      let match: Result['match'] = null;
      /** Edição + número que não bateram com o nome lido: último recurso. */
      let unverified: Awaited<ReturnType<typeof scryfallPrinted>> = null;
      if (number && set) {
        tried.push(`${set} #${Number(number)}`);
        // Na língua impressa (o nome lido é o dessa língua), com a de inglês de reserva.
        const base = `https://api.scryfall.com/cards/${set.toLowerCase()}/${Number(number)}`;
        const exact =
          (lang !== 'en' ? await scryfallPrinted(`${base}/${lang}`) : null) ??
          (await scryfallPrinted(base));
        // Confere com algum nome lido: se não bate, a edição/número foi mal lida.
        const agrees =
          !names.length ||
          names.some(
            (c) =>
              similarity(c, exact?.printed ?? '') >= 0.6 || similarity(c, exact?.name ?? '') >= 0.6,
          );
        if (exact && !agrees && strongNumber) unverified = exact;
        if (exact && agrees) {
          match = {
            name:
              exact.printed && exact.printed !== exact.name
                ? `${exact.name} (${exact.printed})`
                : exact.name,
            set: exact.set,
            number: exact.number,
            image: exact.image,
            how: 'edição + número',
          };
        }
      }
      for (const candidate of candidates) {
        if (match) break;
        tried.push(candidate);
        const fuzzy = await scryfall(
          `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(candidate)}`,
        );
        // Só vale se o nome achado for parecido com o lido ("Giant" não vale por "Doomwake Gian").
        if (fuzzy && similarity(candidate, fuzzy.name) >= 0.6) {
          match = { ...fuzzy, how: 'nome (aproximado)' };
        }
      }
      // Cartas em português: pelo nome impresso (também sem o lixo do fim).
      for (const candidate of candidates.slice(0, 4)) {
        if (match) break;
        tried.push(`pt: ${candidate}`);
        const pt = await byPrintedName(candidate);
        if (pt) match = { ...pt, how: 'nome em português' };
      }
      // Nada pelo nome: a edição + número lidos no formato da linha de colecionador.
      if (!match && unverified) {
        match = {
          name:
            unverified.printed && unverified.printed !== unverified.name
              ? `${unverified.name} (${unverified.printed})`
              : unverified.name,
          set: unverified.set,
          number: unverified.number,
          image: unverified.image,
          how: 'edição + número (sem conferir o nome)',
        };
      }
      setResults((r) => [
        {
          id: Date.now(),
          ms: Math.round(performance.now() - t0),
          text,
          tried,
          match,
          crop: image.toDataURL('image/jpeg', 0.6),
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

  /** Recorta do vídeo exatamente a área da moldura mostrada na tela. */
  const capture = () => {
    const v = video.current!;
    const { gw, gh } = guideOf(v.videoWidth, v.videoHeight);
    const card = document.createElement('canvas');
    card.width = Math.round(gw);
    card.height = Math.round(gh);
    card
      .getContext('2d')!
      .drawImage(v, (v.videoWidth - gw) / 2, (v.videoHeight - gh) / 2, gw, gh, 0, 0, gw, gh);
    void read(card, 0.22);
  };

  /** Foto da câmera do sistema: lê a foto inteira (a carta pode estar em qualquer lugar). */
  const fromFile = async (file: File) => {
    const bitmap = await createImageBitmap(file);
    const photo = document.createElement('canvas');
    photo.width = bitmap.width;
    photo.height = bitmap.height;
    photo.getContext('2d')!.drawImage(bitmap, 0, 0);
    void read(photo, 1, 2600);
  };

  const ok = results.filter((r) => r.verdict === 'ok').length;
  const bad = results.filter((r) => r.verdict === 'bad').length;
  const guide = dims ? guideOf(dims.w, dims.h) : null;

  return (
    <div className="space-y-4">
      {/* A caixa tem a proporção real da câmera: a moldura na tela é o que será recortado. */}
      <div
        className="relative mx-auto overflow-hidden rounded-2xl bg-black"
        style={
          dims
            ? {
                aspectRatio: `${dims.w} / ${dims.h}`,
                width: `min(100%, calc(70vh * ${dims.w / dims.h}))`,
              }
            : { aspectRatio: '16 / 9', width: '100%' }
        }
      >
        <video ref={video} playsInline muted className="block size-full object-fill" />
        {camera === 'on' && guide && dims && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-xl border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
            style={{
              width: `${(guide.gw / dims.w) * 100}%`,
              height: `${(guide.gh / dims.h) * 100}%`,
            }}
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
              {/* eslint-disable-next-line @next/next/no-img-element -- teste */}
              <img src={r.crop} alt="" className="w-24 rounded-md border border-line" />
              <div className="min-w-0 space-y-1">
                <p className="font-semibold">
                  {r.match ? `${r.match.name} · ${r.match.set} #${r.match.number}` : 'Não achou'}
                </p>
                <p className="muted">
                  {r.match ? `por ${r.match.how} · ` : ''}
                  {r.ms} ms
                </p>
                <p className="muted break-words">Tentou: {r.tried.join(' · ') || '—'}</p>
              </div>
            </div>
            <details>
              <summary className="cursor-pointer">Texto lido</summary>
              <pre className="muted text-xs break-words whitespace-pre-wrap">{r.text}</pre>
            </details>
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
