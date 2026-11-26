'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import type { Worker } from 'tesseract.js';
import { readCardText } from '@boramarcar/core';
import { api } from '@/lib/api';
import { Checkbox } from './ds/checkbox';
import { Icon } from './icons';
import { ModalButton } from './modal-button';
import { PrintPicker } from './print-picker';

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

/** Moldura dentro do vídeo (px do vídeo): 80% da altura, sem passar de 85% da largura. */
const guideOf = (w: number, h: number) => {
  const gh = Math.min(h * 0.8, (w * 0.85) / CARD);
  return { gw: gh * CARD, gh };
};

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
 * "Ler pela câmera" (atrás da flag `card-scanner`): abre a câmera numa janela, lê as cartas uma
 * a uma e junta numa lista para conferir (edição, foil, remover) antes de adicionar. A leitura do
 * texto roda no aparelho (Tesseract, WebAssembly, arquivos em /public/ocr); só o texto vai para o
 * servidor achar a carta. Fechar a janela desliga a câmera.
 */
export function CardScanButton({
  onAdd,
}: {
  /** Grava as cartas conferidas (coleção ou deck). */
  onAdd: (cards: ScannedCard[]) => Promise<void>;
}) {
  const t = useTranslations('scan');
  return (
    <ModalButton label={t('open')} title={t('title')} icon="camera">
      {(close) => <ScannerPanel onAdd={onAdd} close={close} />}
    </ModalButton>
  );
}

function ScannerPanel({
  onAdd,
  close,
}: {
  onAdd: (cards: ScannedCard[]) => Promise<void>;
  close: () => void;
}) {
  const t = useTranslations('scan');
  const video = useRef<HTMLVideoElement>(null);
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
    if (!auto) setStatus(t('reading'));
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
          return;
        }
        if (key === lastKey.current) return;
        lastKey.current = key;
      }
      const res = await api<ScanResponse>('/api/v1/cards/scan', {
        method: 'POST',
        body: { text: data.text.slice(0, 4000), lines, nameZone },
      });
      const m = res.match;
      if (!m) {
        if (!auto) setStatus(t('notFound'));
        return;
      }
      // A mesma carta lida de novo (o texto mudou um pouco) não entra duas vezes seguidas.
      if (auto && m.card.scryfallId === lastAdded.current) return;
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
      setStatus(t('found', { name: m.printedName ?? m.card.name }));
      // Aviso tátil (Android); o iPhone não deixa o site vibrar.
      navigator.vibrate?.(40);
    } catch {
      if (!auto) setStatus(t('error'));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  /** Recorte da área da moldura mostrada na tela. */
  const frame = () => {
    const v = video.current!;
    const { gw, gh } = guideOf(v.videoWidth, v.videoHeight);
    const card = document.createElement('canvas');
    card.width = Math.round(gw);
    card.height = Math.round(gh);
    card
      .getContext('2d')!
      .drawImage(v, (v.videoWidth - gw) / 2, (v.videoHeight - gh) / 2, gw, gh, 0, 0, gw, gh);
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
  const guide = dims ? guideOf(dims.w, dims.h) : null;

  return (
    <div className="space-y-4">
      <p className="muted text-sm">{t('hint')}</p>
      {/* A caixa tem a proporção real da câmera: a moldura na tela é o que será lido. */}
      <div
        className="relative mx-auto overflow-hidden rounded-2xl bg-noite"
        style={
          dims
            ? {
                aspectRatio: `${dims.w} / ${dims.h}`,
                width: `min(100%, calc(55dvh * ${dims.w / dims.h}))`,
              }
            : { aspectRatio: '3 / 4', width: 'min(100%, 20rem)' }
        }
      >
        <video
          ref={video}
          playsInline
          muted
          aria-label={t('preview')}
          className="block size-full object-fill"
        />
        {guide && dims && (
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
      {cameraError && (
        <p role="alert" className="text-sm text-danger">
          {t('cameraError')}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
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
        <h3 id="scan-list" className="font-semibold">
          {t('listTitle', { count: cards.length })}
        </h3>
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
      </section>
      <button
        type="button"
        className="btn-primary"
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
  );
}
