import { useTranslations } from 'next-intl';
import { Icon } from './icons';
import { CopyField, ShareButtons } from './share-buttons';

/** "Omnath, Locus of All" → "omnath-locus-of-all" (nome do arquivo do QR Code). */
const slug = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'deck';

/**
 * Compartilhar um deck **público**: link com "Copiar link", QR Code com "Baixar QR Code",
 * WhatsApp e o menu do celular. Quem recebe vê a prévia com a arte do comandante; sem conta,
 * entra antes e volta para o deck. Decks de grupo ou privados não mostram nada.
 */
export function DeckShare({
  deck,
  url,
  qr,
}: {
  deck: { id: string; name: string; visibility: string };
  url: string;
  qr: { svg: string; png: string };
}) {
  const t = useTranslations('deckShare');
  const tg = useTranslations('group');
  if (deck.visibility !== 'public') return null;
  return (
    <details className="card">
      <summary className="cursor-pointer font-semibold">
        <Icon name="share" className="me-1 inline size-4 align-[-2px]" />
        {t('title')}
      </summary>
      <div className="mt-4 grid gap-6 sm:grid-cols-[auto_1fr] sm:items-start">
        <figure className="mx-auto w-48 space-y-2 sm:mx-0">
          <div
            role="img"
            aria-label={t('qrCode', { deck: deck.name })}
            className="overflow-hidden rounded-2xl border border-ink-200 bg-white p-2 dark:border-ink-700 [&>svg]:h-auto [&>svg]:w-full"
            // SVG gerado no servidor pela biblioteca qrcode a partir do link do deck.
            dangerouslySetInnerHTML={{ __html: qr.svg }}
          />
          <a
            className="btn-secondary w-full"
            href={qr.png}
            download={`deck-${slug(deck.name)}.png`}
          >
            <Icon name="download" />
            {tg('downloadQr')}
          </a>
        </figure>
        <div className="min-w-0 space-y-4">
          <div>
            <CopyField label={t('link')} value={url} />
            <p className="muted mt-2 text-sm">{t('hint')}</p>
          </div>
          <ShareButtons
            text={t('text', { deck: deck.name, url })}
            url={url}
            title={deck.name}
            copy={false}
          />
        </div>
      </div>
    </details>
  );
}
