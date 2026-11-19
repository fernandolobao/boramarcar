// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import messages from '../../messages/pt-BR.json';
import { ImageUpload } from './image-upload';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

const renderIt = (props: Partial<Parameters<typeof ImageUpload>[0]> = {}) =>
  render(
    <NextIntlClientProvider locale="pt-BR" messages={messages} timeZone="America/Sao_Paulo">
      <ImageUpload
        kind="avatar"
        endpoint="/api/v1/me/avatar"
        name="Ana Teste"
        image={null}
        {...props}
      />
    </NextIntlClientProvider>,
  );

const pick = (file: File) =>
  fireEvent.change(screen.getByLabelText('Arquivo da foto'), { target: { files: [file] } });

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('envio de foto e logo', () => {
  it('sem foto: iniciais e o botão de escolher; tipo errado é recusado antes de enviar', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    renderIt();
    expect(screen.getByText('AT')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Escolher foto' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Remover/ })).not.toBeInTheDocument();
    pick(new File(['x'], 'a.gif', { type: 'image/gif' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('JPEG, PNG ou WebP');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('envia a foto escolhida (PUT, multipart) e avisa que deu certo', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ image: 'https://x.public.blob.vercel-storage.com/a.webp' }), {
        status: 200,
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    renderIt();
    pick(new File(['x'], 'a.png', { type: 'image/png' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('/api/v1/me/avatar');
    expect(init.method).toBe('PUT');
    expect((init.body as FormData).get('file')).toBeInstanceOf(File);
    expect(await screen.findByRole('status')).toHaveTextContent('Foto atualizada');
  });

  it('armazenamento indisponível: mensagem própria da foto', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: { code: 'upstream_error', message: 'x', details: { reason: 'storage' } },
          }),
          { status: 502 },
        ),
      ),
    );
    renderIt();
    pick(new File(['x'], 'a.png', { type: 'image/png' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível guardar a imagem agora. Tente de novo em alguns minutos.',
    );
  });

  it('com foto: trocar e remover (remover pede confirmação)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ image: null })));
    vi.stubGlobal('fetch', fetchMock);
    renderIt({ image: 'https://x.public.blob.vercel-storage.com/a.webp' });
    expect(screen.getByRole('button', { name: 'Trocar foto' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remover foto' }));
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar: remover foto' }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/me/avatar',
        expect.objectContaining({ method: 'DELETE' }),
      ),
    );
  });

  it('logo da loja usa os textos de logo', () => {
    renderIt({ kind: 'logo', endpoint: '/api/v1/stores/s1/logo', name: 'Loja do Mago' });
    expect(screen.getByRole('button', { name: 'Escolher logo' })).toBeInTheDocument();
    expect(screen.getByLabelText('Arquivo do logo')).toBeInTheDocument();
  });
});
