'use client';

import { checkImageUpload } from '@boramarcar/core/images';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { useId, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { shrinkImage } from '@/lib/shrink-image';
import { initialsOf } from './avatar-image';
import { Icon } from './icons';
import { FormError, useApiAction } from './use-api-action';

/**
 * Foto do perfil ou logo da loja: mostra a atual (ou as iniciais), escolhe um arquivo, reduz no
 * navegador e envia. Remover pede confirmação (dois cliques).
 */
export function ImageUpload({
  kind,
  endpoint,
  name,
  image,
}: {
  kind: 'avatar' | 'logo';
  endpoint: string;
  name: string;
  image: string | null;
}) {
  const t = useTranslations('imageUpload');
  const { run, error, pending } = useApiAction();
  const input = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const [problem, setProblem] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

  const upload = async (file: File) => {
    setDone(null);
    setConfirm(false);
    const blob = await shrinkImage(file);
    const issue = checkImageUpload({ type: blob.type, size: blob.size });
    if (issue) return setProblem(t(`error.${issue}`));
    setProblem(null);
    const form = new FormData();
    form.append('file', blob, file.name);
    await run(
      () => api(endpoint, { method: 'PUT', body: form }),
      () => setDone(t(`${kind}.saved`)),
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-4" role="group" aria-labelledby={titleId}>
      <div
        className={`relative grid size-20 shrink-0 place-items-center overflow-hidden bg-brand-100 text-2xl font-bold text-brand-700 dark:bg-brand-700 dark:text-white ${
          kind === 'avatar' ? 'rounded-full' : 'rounded-xl border border-line'
        }`}
      >
        {image ? (
          <Image src={image} alt="" fill sizes="80px" unoptimized className="object-cover" />
        ) : (
          <span aria-hidden="true">{initialsOf(name)}</span>
        )}
      </div>
      <div className="min-w-0 space-y-2">
        <p id={titleId} className="font-medium">
          {t(`${kind}.title`)}
        </p>
        <p className="muted text-sm">{t('hint')}</p>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-label={t(`${kind}.file`)}
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            const file = e.currentTarget.files?.[0];
            e.currentTarget.value = '';
            if (file) void upload(file);
          }}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-secondary"
            disabled={pending}
            onClick={() => input.current?.click()}
          >
            <Icon name="upload" />
            {t(`${kind}.${image ? 'change' : 'choose'}`)}
          </button>
          {image && (
            <button
              type="button"
              className={
                confirm ? 'btn-danger border border-red-300 dark:border-red-800' : 'btn-danger'
              }
              disabled={pending}
              onClick={() => {
                if (!confirm) return setConfirm(true);
                setConfirm(false);
                setDone(null);
                void run(
                  () => api(endpoint, { method: 'DELETE' }),
                  () => setDone(t(`${kind}.removed`)),
                );
              }}
            >
              <Icon name="delete" />
              {t(`${kind}.${confirm ? 'removeConfirm' : 'remove'}`)}
            </button>
          )}
        </div>
        <FormError message={problem ?? error} />
        <p role="status" className="text-sm">
          {done}
        </p>
      </div>
    </div>
  );
}
