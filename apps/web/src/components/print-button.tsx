'use client';

import { useTranslations } from 'next-intl';
import { Icon } from './icons';

/** Abre a janela de impressão do navegador (onde também dá para "Salvar como PDF"). */
export function PrintButton() {
  const t = useTranslations('decks');
  return (
    <button type="button" className="btn-primary" onClick={() => window.print()}>
      <Icon name="print" />
      {t('printNow')}
    </button>
  );
}
