'use client';

import { whatsappShareUrl } from '@boramarcar/core/calendar';
import { useTranslations } from 'next-intl';
import { useState, useSyncExternalStore } from 'react';
import { Icon } from './icons';

const noopSubscribe = () => () => {};
/** Valor que só existe no navegador (no servidor usa `serverValue`), sem setState em efeito. */
const useClientValue = <T,>(getValue: () => T, serverValue: T) =>
  useSyncExternalStore(noopSubscribe, getValue, () => serverValue);

/** Botões de compartilhamento: WhatsApp, menu nativo do celular, copiar e (opcional) agenda. */
export function ShareButtons({
  text,
  url,
  title,
  icsHref,
}: {
  text: string;
  url: string;
  title: string;
  icsHref?: string;
}) {
  const t = useTranslations('share');
  const tc = useTranslations('common');
  const canShare = useClientValue(() => typeof navigator.share === 'function', false);
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex flex-wrap gap-2">
      <a
        className="btn-primary bg-[#25D366] text-zinc-950 hover:bg-[#1ebe5b]"
        href={whatsappShareUrl(text)}
        target="_blank"
        rel="noreferrer"
      >
        <Icon name="whatsapp" />
        {t('whatsapp')}
        <span className="sr-only"> {tc('newTab')}</span>
      </a>
      {canShare && (
        <button
          type="button"
          className="btn-secondary"
          onClick={() => navigator.share({ title, text, url }).catch(() => {})}
        >
          <Icon name="share" />
          {t('native')}
        </button>
      )}
      <button
        type="button"
        className="btn-secondary"
        onClick={async () => {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        <Icon name={copied ? 'copied' : 'copy'} />
        <span aria-live="polite">{copied ? t('copied') : t('copyLink')}</span>
      </button>
      {icsHref && (
        <a className="btn-secondary" href={icsHref} download>
          <Icon name="addToCalendar" />
          {t('addToCalendar')}
        </a>
      )}
    </div>
  );
}
