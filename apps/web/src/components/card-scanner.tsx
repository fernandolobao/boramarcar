'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState } from 'react';
import type { Worker } from 'tesseract.js';
import { readCardText } from '@boramarcar/core';
import { api } from '@/lib/api';
import { Checkbox } from './ds/checkbox';
import { Icon } from './icons';
import { PrintPicker } from './print-picker';
import { useLightDismiss } from './use-light-dismiss';

/** Carta lida e conferida pela pessoa, pronta para entrar na coleção ou no deck. */
export interface ScannedCard {
  key: number;
  scryfallId: string;
  name: string;
  printedName: string | null;
  setCode: string | null;
  collectorNumber: string | null;
  imageUri: string | null;
  foil: boolean;
  /** Edição lida sem conferir o nome: pedir para a pessoa confirmar. */
  unverified: boolean;
}

interface ScanResponse {
  match: {
    how: 'set' | 'name' | 'printed' | 'set-unverified';
    printedName: string | null;
    card: {
      scryfallId: string;
      name: string;
      imageUri: string | null;
      setCode: string | null;
      collectorNumber: string | null;
    };
  } | null;
}

/** Proporção da carta (63 × 88 mm). */
const CARD = 63 / 88;

/** Moldura na caixa da câmera (px da tela): 80% da altura, sem passar de 85% da largura. */
const guideOf = (w: number, h: number) => {
  const gh = Math.min(h * 0.8, (w * 0.85) / CARD);
  return { gw: gh * CARD, gh };
};

/**
 * Etapa da leitura, mostrada na moldura (cor e aviso) e anunciada em texto:
 * `idle` nada legível na moldura (branca), `reading` há texto de carta e a leitura está em
 * andamento (roxa, "segure firme"), `found` a carta da moldura entrou na lista (dourada),
 * `miss` havia carta mas não foi reconhecida (branca, com dica).
 */
type Phase = 'idle' | 'reading' | 'found' | 'miss';

/** Texto suficiente para haver uma carta na moldura (letras, não ruído). */
const hasText = (text: string) => (text.match(/[A-Za-zÀ-ÿ]/g) ?? []).length >= 12;

/** Prepara para o leitor: largura entre 1000 e `maxWidth` px, cinza com contraste esticado. */
function prepare(src: HTMLCanvasElement, maxWidth: number) {
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

/**
 * "Ler pela câmera" (atrás da flag `card-scanner`): lê as cartas uma a uma e junta numa lista para
 * conferir (edição, foil, remover) antes de adicionar. No celular, a câmera ocupa a tela inteira
 * (sem caixa de modal), com os controles numa faixa embaixo; no desktop, uma janela. A leitura do
 * texto roda no aparelho (Tesseract, WebAssembly, arquivos em /public/ocr); só o texto vai para o
 * servidor achar a carta. Fechar desliga a câmera.
 */
export function CardScanButton({
  onAdd,
}: {
  /** Grava as cartas conferidas (coleção ou deck). */
  onAdd: (cards: ScannedCard[]) => Promise<void>;
}) {
  const t = useTranslations('scan');
  const titleId = useId();
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  useLightDismiss(ref);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <>
      <button
        ref={opener}
        type="button"
        className="btn-secondary"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <Icon name="camera" />
        {t('open')}
      </button>
      <dialog
        ref={ref}
        aria-labelledby={titleId}
        className="m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden bg-noite p-0 text-fg backdrop:bg-noite/70 sm:m-auto sm:h-auto sm:max-h-[92dvh] sm:w-[min(94vw,44rem)] sm:overflow-y-auto sm:rounded-2xl sm:bg-surface sm:p-5 sm:shadow-2xl"
        onClose={() => {
          setOpen(false);
          opener.current?.focus();
        }}
      >
        {open && (
          <ScannerPanel titleId={titleId} onAdd={onAdd} close={() => ref.current?.close()} />
        )}
      </dialog>
    </>
  );
}

function ScannerPanel({
  titleId,
  onAdd,
  close,
}: {
  titleId: string;
  onAdd: (cards: ScannedCard[]) => Promise<void>;
  close: () => void;
}) {
  const t = useTranslations('scan');
  const tc = useTranslations('common');
  const video = useRef<HTMLVideoElement>(null);
  /** Caixa da câmera (o vídeo a preenche, cortando as sobras) e o tamanho dela na tela. */
  const boxRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const [phase, setPhaseState] = useState<Phase>('idle');
  const phaseRef = useRef<Phase>('idle');
  /** Muda a etapa; ao começar a ler, avisa em texto (leitores de tela) para segurar firme. */
  const setPhase = (next: Phase) => {
    if (phaseRef.current === next) return;
    if (next === 'reading') setStatus(t('holdSteady'));
    phaseRef.current = next;
    setPhaseState(next);
  };
  const [showList, setShowList] = useState(false);
  const listId = useId();
  const file = useRef<HTMLInputElement>(null);
  const worker = useRef<Promise<Worker> | null>(null);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const [cameraError, setCameraError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [cards, setCards] = useState<ScannedCard[]>([]);
  const [saving, setSaving] = useState(false);

  const getWorker = () => {
    worker.current ??= import('tesseract.js').then(async ({ createWorker }) => {
      setStatus(t('loading'));
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

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Liga a câmera ao abrir; desliga (e solta o leitor) ao fechar a janela.
  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    void (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });
        if (cancelled) return stream.getTracks().forEach((tr) => tr.stop());
        const v = video.current!;
        v.srcObject = stream;
        await v.play();
        setDims({ w: v.videoWidth, h: v.videoHeight });
        void getWorker();
      } catch {
        setCameraError(true);
      }
    })();
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((tr) => tr.stop());
      void worker.current?.then((w) => w.terminate());
      worker.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só ao abrir/fechar
  }, []);

  /** Em andamento (ref: o laço da leitura contínua não pode depender do estado da renderização). */
  const busyRef = useRef(false);
  /** Leitura contínua: o que estava na moldura na última volta e a última carta adicionada. */
  const lastKey = useRef('');
  const lastAdded = useRef('');

  /**
   * Lê a carta numa imagem (o recorte da moldura, ou a foto inteira). Na leitura contínua
   * (`auto`), o texto é interpretado aqui primeiro: o servidor só é consultado quando aparece uma
   * carta nova na moldura, e a mesma carta não entra de novo enquanto não sair da frente da câmera.
   */
  const read = async (
    image: HTMLCanvasElement,
    nameZone: number,
    maxWidth: number,
    auto = false,
  ) => {
    busyRef.current = true;
    setBusy(true);
    if (!auto) {
      setPhase('reading');
      setStatus(t('reading'));
    }
    try {
      const w = await getWorker();
      const prepared = prepare(image, maxWidth);
      const { data } = await w.recognize(prepared);
      const lines = (data.lines ?? []).slice(0, 120).map((l) => ({
        text: l.text.slice(0, 300),
        top: Math.min(1, Math.max(0, l.bbox.y0 / prepared.height)),
      }));
      if (auto) {
        const reading = readCardText({ text: data.text, lines, nameZone });
        const key =
          reading.set && reading.number
            ? `${reading.set}#${reading.number}`
            : (reading.candidates[0] ?? '');
        // Moldura vazia (ou ilegível): a carta saiu; a próxima, mesmo igual, conta de novo.
        if (!key) {
          lastKey.current = '';
          lastAdded.current = '';
          // Há texto, mas ainda não dá para saber qual carta: lendo, segure firme.
          setPhase(hasText(data.text) ? 'reading' : 'idle');
          return;
        }
        if (key === lastKey.current) return;
        lastKey.current = key;
        setPhase('reading');
      }
      const res = await api<ScanResponse>('/api/v1/cards/scan', {
        method: 'POST',
        body: { text: data.text.slice(0, 4000), lines, nameZone },
      });
      const m = res.match;
      if (!m) {
        setPhase('miss');
        setStatus(t('notFound'));
        return;
      }
      // A mesma carta lida de novo (o texto mudou um pouco) não entra duas vezes seguidas.
      if (auto && m.card.scryfallId === lastAdded.current) {
        setPhase('found');
        return;
      }
      lastAdded.current = m.card.scryfallId;
      setCards((list) => [
        ...list,
        {
          key: Date.now(),
          scryfallId: m.card.scryfallId,
          name: m.card.name,
          printedName: m.printedName,
          setCode: m.card.setCode,
          collectorNumber: m.card.collectorNumber,
          imageUri: m.card.imageUri,
          foil: false,
          unverified: m.how === 'set-unverified',
        },
      ]);
      phaseRef.current = 'found';
      setPhaseState('found');
      setStatus(t('found', { name: m.printedName ?? m.card.name }));
      // Aviso tátil (Android); o iPhone não deixa o site vibrar.
      navigator.vibrate?.(40);
    } catch {
      if (!auto) {
        setPhase('idle');
        setStatus(t('error'));
      }
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  /**
   * Recorte do que aparece dentro da moldura na tela. O vídeo cobre a caixa (`object-cover`):
   * a moldura em px da tela vira px do vídeo pela escala e pelo corte das sobras.
   */
  const frame = () => {
    const v = video.current!;
    const el = boxRef.current!;
    const bw = el.clientWidth;
    const bh = el.clientHeight;
    const scale = Math.max(bw / v.videoWidth, bh / v.videoHeight);
    const { gw, gh } = guideOf(bw, bh);
    const sw = gw / scale;
    const sh = gh / scale;
    const sx = (v.videoWidth - sw) / 2;
    const sy = (v.videoHeight - sh) / 2;
    const card = document.createElement('canvas');
    card.width = Math.round(sw);
    card.height = Math.round(sh);
    card.getContext('2d')!.drawImage(v, sx, sy, sw, sh, 0, 0, card.width, card.height);
    return card;
  };
  const capture = () => void read(frame(), 0.22, 1600);

  /** Leitura contínua: lê a moldura sem parar (pausa com a aba escondida e ao fechar a janela). */
  const [auto, setAuto] = useState(true);
  useEffect(() => {
    if (!auto || !dims) return;
    let stop = false;
    void (async () => {
      while (!stop) {
        if (!busyRef.current && document.visibilityState === 'visible') {
          await read(frame(), 0.22, 1400, true);
        }
        await new Promise((r) => setTimeout(r, 500));
      }
    })();
    return () => {
      stop = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- liga/desliga pelo botão
  }, [auto, dims]);

  /** Foto da câmera do sistema: lê a foto inteira (a carta pode estar em qualquer lugar). */
  const fromFile = async (f: File) => {
    const bitmap = await createImageBitmap(f);
    const photo = document.createElement('canvas');
    photo.width = bitmap.width;
    photo.height = bitmap.height;
    photo.getContext('2d')!.drawImage(bitmap, 0, 0);
    void read(photo, 1, 2600);
  };

  const update = (key: number, change: Partial<ScannedCard>) =>
    setCards((list) => list.map((c) => (c.key === key ? { ...c, ...change } : c)));
  const guide = box ? guideOf(box.w, box.h) : null;
  const ratio = dims ? dims.w / dims.h : 3 / 4;
  const label =
    phase === 'reading'
      ? t('holdSteady')
      : phase === 'found'
        ? t('nextCard')
        : phase === 'miss'
          ? t('tryAgain')
          : t('aim');

  return (
    <div className="flex h-full flex-col sm:block sm:space-y-4">
      {/* Celular: título e "Fechar" por cima da câmera, que ocupa a tela toda. */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-3 bg-gradient-to-b from-noite/90 to-transparent px-4 pt-3 pb-6 text-white sm:static sm:bg-none sm:p-0 sm:text-fg">
        <h2 id={titleId} className="font-display text-xl font-semibold sm:text-2xl">
          {t('title')}
        </h2>
        <button
          type="button"
          className="btn-secondary px-3 text-fg"
          title={tc('close')}
          onClick={close}
        >
          <Icon name="close" />
          <span className="sr-only">{tc('close')}</span>
        </button>
      </div>
      {/* No desktop, a caixa tem a proporção da câmera; no celular, preenche a tela. */}
      <div
        ref={boxRef}
        className="relative min-h-0 flex-1 overflow-hidden bg-noite sm:mx-auto sm:flex-none sm:rounded-2xl sm:[aspect-ratio:var(--cam-ratio)] sm:[width:min(100%,calc(55dvh*var(--cam-r)))]"
        style={{ '--cam-ratio': String(ratio), '--cam-r': String(ratio) } as React.CSSProperties}
      >
        <video
          ref={video}
          playsInline
          muted
          aria-label={t('preview')}
          className="absolute inset-0 block size-full object-cover"
        />
        {guide && box && dims && (
          <>
            <div
              aria-hidden="true"
              data-phase={phase}
              className={`pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-xl border-4 shadow-[0_0_0_9999px_rgba(11,7,22,0.5)] transition-colors duration-200 motion-reduce:transition-none ${
                phase === 'reading'
                  ? 'border-brand-400'
                  : phase === 'found'
                    ? 'border-accent'
                    : 'border-white/90'
              }`}
              style={{ width: guide.gw, height: guide.gh }}
            >
              {/* Brilho roxo pulsando enquanto lê (parado com "reduzir movimento"). */}
              {phase === 'reading' && (
                <span className="absolute -inset-2 rounded-2xl shadow-[0_0_28px_6px_var(--color-brand-500)] motion-safe:animate-pulse" />
              )}
            </div>
            {/* Aviso visual da etapa; o mesmo texto vai para a região de status. */}
            <p
              aria-hidden="true"
              className={`pointer-events-none absolute left-1/2 flex max-w-[90%] -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap shadow-lg ${
                phase === 'reading'
                  ? 'bg-primary text-on-primary'
                  : phase === 'found'
                    ? 'bg-accent text-on-accent'
                    : 'bg-noite/85 text-white'
              }`}
              style={{ bottom: `calc(50% - ${guide.gh / 2}px + 0.75rem)` }}
            >
              <Icon
                name={phase === 'found' ? 'done' : phase === 'reading' ? 'camera' : 'info'}
                className="size-4 shrink-0"
              />
              <span className="truncate">{label}</span>
            </p>
          </>
        )}
      </div>

      {/* Controles: faixa compacta embaixo no celular (a lista abre por cima). */}
      <div className="max-h-[55dvh] shrink-0 space-y-3 overflow-y-auto rounded-t-2xl bg-surface p-4 sm:max-h-none sm:overflow-visible sm:rounded-none sm:bg-transparent sm:p-0">
        {cameraError && (
          <p role="alert" className="text-sm text-danger">
            {t('cameraError')}
          </p>
        )}
        <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap [&>button]:px-2 [&>button]:leading-tight sm:[&>button]:px-4">
          <button
            type="button"
            className={auto ? 'btn-primary' : 'btn-secondary'}
            aria-pressed={auto}
            disabled={!dims}
            onClick={() => setAuto((a) => !a)}
          >
            <Icon name="refresh" />
            {t('continuous')}
          </button>
          <button
            type="button"
            className={auto ? 'btn-secondary' : 'btn-primary'}
            disabled={busy || !dims}
            onClick={capture}
          >
            <Icon name="camera" />
            {t('read')}
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={busy}
            onClick={() => file.current?.click()}
          >
            {t('photo')}
          </button>
          <input
            ref={file}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void fromFile(f);
              e.target.value = '';
            }}
          />
        </div>
        <p role="status" className="min-h-5 text-sm">
          {status}
        </p>

        <section aria-labelledby="scan-list" className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3 id="scan-list" className="font-semibold">
              {t('listTitle', { count: cards.length })}
            </h3>
            <button
              type="button"
              className="btn-secondary min-h-9 px-3 text-xs sm:hidden"
              aria-expanded={showList}
              aria-controls={listId}
              onClick={() => setShowList((v) => !v)}
            >
              {showList ? t('hideList') : t('showList')}
            </button>
          </div>
          <div id={listId} className={`space-y-2 ${showList ? '' : 'hidden'} sm:block`}>
            <p className="muted text-sm">{t('hint')}</p>
            {cards.length === 0 ? (
              <p className="muted text-sm">{t('empty')}</p>
            ) : (
              <ul className="space-y-2">
                {cards.map((c) => (
                  <li key={c.key} className="flex gap-3 rounded-xl border border-line p-2">
                    {c.imageUri && (
                      // eslint-disable-next-line @next/next/no-img-element -- imagem do Scryfall
                      <img src={c.imageUri} alt="" className="w-16 shrink-0 rounded-md" />
                    )}
                    <div className="min-w-0 flex-1 space-y-1 text-sm">
                      <p className="font-medium">
                        {c.printedName ?? c.name}
                        {c.printedName && <span className="muted font-normal"> ({c.name})</span>}
                      </p>
                      <p className="muted">
                        {c.setCode
                          ? t('print', {
                              set: c.setCode.toUpperCase(),
                              number: c.collectorNumber ?? '?',
                            })
                          : ''}
                      </p>
                      {c.unverified && (
                        <p className="flex items-center gap-1 text-danger">
                          <Icon name="warning" className="size-3.5 shrink-0" />
                          {t('unverified')}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-2">
                        <Checkbox
                          label={t('foil')}
                          aria-label={t('foilLabel', { name: c.name })}
                          checked={c.foil}
                          onChange={(foil) => update(c.key, { foil })}
                        />
                        <PrintPicker
                          line={{
                            name: c.name,
                            board: 'collection',
                            quantity: 1,
                            scryfallId: c.scryfallId,
                            card: { setCode: c.setCode, collectorNumber: c.collectorNumber },
                          }}
                          selected={c.scryfallId}
                          openLabel={t('changePrint')}
                          saveLabel={t('usePrint')}
                          onSelect={(p) =>
                            update(c.key, {
                              scryfallId: p.scryfallId,
                              setCode: p.setCode,
                              collectorNumber: p.collectorNumber,
                              imageUri: p.imageUri ?? c.imageUri,
                              unverified: false,
                            })
                          }
                        />
                        <button
                          type="button"
                          className="btn-secondary min-h-9 px-3 text-xs"
                          aria-label={t('removeLabel', { name: c.name })}
                          onClick={() => setCards((list) => list.filter((x) => x.key !== c.key))}
                        >
                          <Icon name="delete" />
                          {t('remove')}
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
        <button
          type="button"
          className="btn-primary w-full sm:w-auto"
          disabled={cards.length === 0 || saving}
          onClick={() => {
            setSaving(true);
            void onAdd(cards)
              .then(() => close())
              .catch(() => setStatus(t('saveError')))
              .finally(() => setSaving(false));
          }}
        >
          <Icon name="add" />
          {t('add', { count: cards.length })}
        </button>
      </div>
    </div>
  );
}
