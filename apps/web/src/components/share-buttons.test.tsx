// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import messages from '../../messages/pt-BR.json';
import { EventStatusBadge } from './event-manage';
import { CopyField, ShareButtons } from './share-buttons';

afterEach(cleanup);

const wrap = (node: ReactNode) =>
  render(
    <NextIntlClientProvider locale="pt-BR" messages={messages} timeZone="America/Sao_Paulo">
      {node}
    </NextIntlClientProvider>,
  );

describe('ShareButtons', () => {
  it('monta o link do WhatsApp, o .ics e copia o link', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    wrap(
      <ShareButtons
        text="Bora? https://x.app/e/1"
        url="https://x.app/e/1"
        title="Commander"
        icsHref="/api/v1/events/1/ics"
      />,
    );

    expect(screen.getByRole('link', { name: /^Compartilhar no WhatsApp/ })).toHaveAttribute(
      'href',
      'https://wa.me/?text=Bora%3F%20https%3A%2F%2Fx.app%2Fe%2F1',
    );
    expect(screen.getByRole('link', { name: 'Adicionar à agenda (.ics)' })).toHaveAttribute(
      'href',
      '/api/v1/events/1/ics',
    );
    // jsdom não tem navigator.share: botão nativo some
    expect(screen.queryByRole('button', { name: 'Compartilhar…' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Copiar link' }));
    expect(writeText).toHaveBeenCalledWith('https://x.app/e/1');
    expect(await screen.findByText('Copiado!')).toBeInTheDocument();
  });

  it('mostra o compartilhamento nativo quando disponível', () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    wrap(<ShareButtons text="t" url="https://x.app" title="Grupo" />);
    fireEvent.click(screen.getByRole('button', { name: 'Compartilhar…' }));
    expect(share).toHaveBeenCalledWith({ title: 'Grupo', text: 't', url: 'https://x.app' });
    expect(screen.queryByRole('link', { name: /agenda/ })).toBeNull();
    Reflect.deleteProperty(navigator, 'share');
  });
});

describe('CopyField', () => {
  it('mostra o link num campo de leitura com o botão de copiar ao lado', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    wrap(<CopyField label="Link de convite" value="https://x.app/c/ABC" />);
    const field = screen.getByRole('textbox', { name: 'Link de convite' });
    expect(field).toHaveValue('https://x.app/c/ABC');
    expect(field).toHaveAttribute('readonly');
    fireEvent.click(screen.getByRole('button', { name: 'Copiar link' }));
    expect(writeText).toHaveBeenCalledWith('https://x.app/c/ABC');
    expect(await screen.findByText('Copiado!')).toBeInTheDocument();
  });

  it('sem `copy`, os botões de compartilhar não repetem o "Copiar link"', () => {
    wrap(<ShareButtons text="t" url="https://x.app" title="Grupo" copy={false} />);
    expect(screen.queryByRole('button', { name: 'Copiar link' })).toBeNull();
  });
});

describe('EventStatusBadge', () => {
  it('traduz o status', () => {
    wrap(<EventStatusBadge status="cancelled" />);
    expect(screen.getByText('Cancelado')).toBeInTheDocument();
  });
});
