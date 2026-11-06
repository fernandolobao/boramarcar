// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';
import messages from '../../messages/pt-BR.json';
import { ThemePicker } from './theme-picker';

afterEach(() => {
  cleanup();
  delete document.documentElement.dataset.theme;
  localStorage.clear();
});

const renderPicker = () =>
  render(
    <NextIntlClientProvider locale="pt-BR" messages={messages} timeZone="America/Sao_Paulo">
      <ThemePicker />
    </NextIntlClientProvider>,
  );

describe('ThemePicker', () => {
  it('aplica e guarda o tema; Automático volta a seguir o sistema', () => {
    renderPicker();
    expect(screen.getByRole('radio', { name: 'Automático' })).toBeChecked();
    fireEvent.click(screen.getByRole('radio', { name: 'Escuro' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('bm-theme')).toBe('dark');
    fireEvent.click(screen.getByRole('radio', { name: 'Automático' }));
    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(localStorage.getItem('bm-theme')).toBeNull();
  });

  it('mostra o tema já aplicado', () => {
    document.documentElement.dataset.theme = 'light';
    renderPicker();
    expect(screen.getByRole('radio', { name: 'Claro' })).toBeChecked();
    expect(screen.getByRole('group', { name: 'Tema' })).toBeInTheDocument();
  });
});
