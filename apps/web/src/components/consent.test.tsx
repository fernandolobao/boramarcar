// @vitest-environment jsdom
import axe from 'axe-core';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import messages from '../../messages/pt-BR.json';
import { CONSENT_COOKIE, consentFromCookies, saveConsent } from '@/lib/consent';
import { ConsentBanner } from './consent-banner';
import { ConsentSettings } from './consent-settings';
import { DataRights } from './data-rights';
import { SessionInsights } from './session-insights';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/configuracoes',
}));
vi.mock('next/script', () => ({
  default: ({ src }: { src: string }) => <script data-testid="tag" data-src={src} />,
}));

const wrap = (ui: React.ReactNode) =>
  render(
    <NextIntlClientProvider locale="pt-BR" messages={messages} timeZone="America/Sao_Paulo">
      <main>{ui}</main>
    </NextIntlClientProvider>,
  );
const audit = async (el: HTMLElement) =>
  (
    await axe.run(el, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag22aa'] } })
  ).violations.map((v) => v.id);

function clearCookies() {
  for (const pair of document.cookie.split(';')) {
    const name = pair.split('=')[0]!.trim();
    if (name) document.cookie = `${name}=; Path=/; Max-Age=0`;
  }
}

beforeEach(clearCookies);
afterEach(cleanup);

describe('consentimento (LGPD)', () => {
  it('lê e salva a escolha; recusar apaga os cookies de gravação', () => {
    expect(consentFromCookies('a=1; ak_consent=accepted')).toBe('accepted');
    expect(consentFromCookies('ak_consent=talvez')).toBeNull();
    document.cookie = '_cs_id=abc; Path=/';
    saveConsent('rejected');
    expect(document.cookie).toContain(`${CONSENT_COOKIE}=rejected`);
    expect(document.cookie).not.toContain('_cs_id');
  });

  it('aviso: aceitar e recusar com o mesmo peso, link para a política, some depois de escolher', async () => {
    const { container } = wrap(<ConsentBanner initial={null} />);
    const region = screen.getByRole('region', { name: 'Cookies e gravação de sessão' });
    expect(region).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Política de Privacidade' }).getAttribute('href')).toBe(
      '/privacidade',
    );
    const accept = screen.getByRole('button', { name: 'Aceitar' });
    const reject = screen.getByRole('button', { name: 'Recusar' });
    expect(accept.className).toBe(reject.className);
    expect(await audit(container)).toEqual([]);
    fireEvent.click(accept);
    expect(screen.queryByRole('region')).toBeNull();
    expect(consentFromCookies(document.cookie)).toBe('accepted');
  });

  it('aviso não aparece quando a pessoa já escolheu', () => {
    wrap(<ConsentBanner initial="rejected" />);
    expect(screen.queryByRole('region')).toBeNull();
  });

  it('tag do Hotjar só com consentimento (e só quando habilitada)', () => {
    const { rerender } = wrap(<SessionInsights enabled consent={null} />);
    expect(screen.queryByTestId('tag')).toBeNull();
    act(() => saveConsent('accepted'));
    expect(screen.getByTestId('tag').getAttribute('data-src')).toBe(
      'https://t.contentsquare.net/uxa/15a7daef5cfb7.js',
    );
    rerender(
      <NextIntlClientProvider locale="pt-BR" messages={messages}>
        <SessionInsights enabled={false} consent="accepted" />
      </NextIntlClientProvider>,
    );
    expect(screen.queryByTestId('tag')).toBeNull();
  });

  it('Configurações: muda a escolha a qualquer momento', async () => {
    document.cookie = `${CONSENT_COOKIE}=accepted; Path=/`;
    const { container } = wrap(<ConsentSettings />);
    expect((screen.getByRole('radio', { name: 'Permitir' }) as HTMLInputElement).checked).toBe(
      true,
    );
    fireEvent.click(screen.getByRole('radio', { name: 'Não permitir' }));
    expect(consentFromCookies(document.cookie)).toBe('rejected');
    expect(screen.getByRole('status').textContent).toBe('Escolha salva.');
    expect(await audit(container)).toEqual([]);
  });
});

describe('DataRights', () => {
  it('baixar dados e excluir conta em dois cliques, avisando dos grupos', async () => {
    const fetchMock = vi.fn(async () => Response.json({ deleted: true }));
    vi.stubGlobal('fetch', fetchMock);
    const assign = vi.fn();
    vi.stubGlobal('location', { ...window.location, assign });
    const { container } = wrap(<DataRights transfers={['Mesa de Quinta']} deletions={['Só eu']} />);
    expect(screen.getByRole('link', { name: 'Baixar meus dados' }).getAttribute('href')).toBe(
      '/api/v1/me/export',
    );
    expect(screen.getByText(/Mesa de Quinta/)).toBeTruthy();
    expect(screen.getByText(/serão apagados: Só eu/)).toBeTruthy();
    expect(await audit(container)).toEqual([]);

    const button = screen.getByRole('button', { name: 'Excluir minha conta' });
    fireEvent.click(button);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toMatch(/não pode ser desfeito/);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Confirmar exclusão definitiva' }));
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/me',
      expect.objectContaining({ method: 'DELETE', body: JSON.stringify({ confirm: true }) }),
    );
    expect(assign).toHaveBeenCalledWith('/?conta=excluida');
    vi.unstubAllGlobals();
  });
});
