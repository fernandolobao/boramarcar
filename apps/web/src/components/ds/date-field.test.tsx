// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import messages from '../../../messages/pt-BR.json';
import { DateField } from './date-field';
import { TimeField } from './time-field';

const wrap = (ui: React.ReactNode) =>
  render(
    <NextIntlClientProvider locale="pt-BR" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );

afterEach(cleanup);

describe('DateField', () => {
  it('mostra a data em segmentos com o rótulo e escolhe um dia pelo calendário', () => {
    const onChange = vi.fn();
    wrap(<DateField label="Primeiro dia" value="2026-11-15" onChange={onChange} />);
    const group = screen.getByRole('group', { name: 'Primeiro dia' });
    expect(
      within(group)
        .getAllByRole('spinbutton')
        .map((s) => s.textContent),
    ).toEqual(['15', '11', '2026']);
    fireEvent.click(screen.getByRole('button', { name: /escolher data/ }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /\b20 de novembro de 2026/ }));
    expect(onChange).toHaveBeenLastCalledWith('2026-11-20');
  });

  it('dias fora do limite ficam desabilitados', () => {
    wrap(<DateField label="Dia" value="2026-11-15" min="2026-11-10" onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /escolher data/ }));
    const dialog = screen.getByRole('dialog');
    const ninth = within(dialog).getAllByRole('button', { name: /\b9 de novembro de 2026/ });
    expect(ninth.length).toBeGreaterThan(0);
    for (const cell of ninth) expect(cell).toHaveAttribute('aria-disabled', 'true');
    expect(
      within(dialog).getAllByRole('button', { name: /\b20 de novembro de 2026/ })[0],
    ).not.toHaveAttribute('aria-disabled', 'true');
  });
});

describe('TimeField', () => {
  it('mostra hora e minuto e anda de 30 em 30 pelo −/+', () => {
    const onChange = vi.fn();
    wrap(<TimeField label="Das" value="19:00" onChange={onChange} />);
    const group = screen.getByRole('group', { name: 'Das' });
    expect(
      within(group)
        .getAllByRole('spinbutton')
        .map((s) => s.textContent),
    ).toEqual(['19', '00']);
    fireEvent.click(screen.getByRole('button', { name: 'Das: mais 30 minutos (agora 19:00)' }));
    expect(onChange).toHaveBeenLastCalledWith('19:30');
    fireEvent.click(screen.getByRole('button', { name: 'Das: menos 30 minutos (agora 19:00)' }));
    expect(onChange).toHaveBeenLastCalledWith('18:30');
  });

  it('a seta para cima no minuto muda o horário', () => {
    const onChange = vi.fn();
    wrap(<TimeField label="Até" value="23:00" onChange={onChange} />);
    const [, minute] = within(screen.getByRole('group', { name: 'Até' })).getAllByRole(
      'spinbutton',
    );
    act(() => minute!.focus());
    fireEvent.keyDown(minute!, { key: 'ArrowUp' });
    expect(onChange).toHaveBeenLastCalledWith('23:01');
  });
});
