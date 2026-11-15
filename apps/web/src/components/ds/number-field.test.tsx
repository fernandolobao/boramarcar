// @vitest-environment jsdom
import axe from 'axe-core';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import messages from '../../../messages/pt-BR.json';
import { NumberField } from './number-field';

afterEach(cleanup);

function Wrapper(props: {
  initial: number | null;
  onChange?: (v: number | null) => void;
  min?: number;
  max?: number;
  error?: string;
}) {
  const [value, setValue] = useState(props.initial);
  return (
    <NextIntlClientProvider locale="pt-BR" messages={messages} timeZone="America/Sao_Paulo">
      <NumberField
        label="Cópias"
        value={value}
        min={props.min}
        max={props.max}
        error={props.error}
        description="Quantas cópias"
        onChange={(v) => {
          setValue(v);
          props.onChange?.(v);
        }}
      />
    </NextIntlClientProvider>
  );
}

const field = () => screen.getByRole('textbox', { name: 'Cópias' });

describe('NumberField (site)', () => {
  it('mostra o valor e os botões dizem rótulo e valor atual', () => {
    const onChange = vi.fn();
    render(<Wrapper initial={3} min={1} max={4} onChange={onChange} />);
    expect(field()).toHaveValue('3');
    fireEvent.click(screen.getByRole('button', { name: 'Cópias: aumentar (agora 3)' }));
    expect(onChange).toHaveBeenLastCalledWith(4);
    expect(screen.getByRole('button', { name: 'Cópias: aumentar (agora 4)' })).toBeDisabled();
  });

  it('vazio vira null e valor digitado fora do limite é limitado ao sair', () => {
    const onChange = vi.fn();
    render(<Wrapper initial={3} min={1} max={4} onChange={onChange} />);
    fireEvent.change(field(), { target: { value: '' } });
    fireEvent.blur(field());
    expect(onChange).toHaveBeenLastCalledWith(null);
    fireEvent.change(field(), { target: { value: '9' } });
    fireEvent.blur(field());
    expect(onChange).toHaveBeenLastCalledWith(4);
  });

  it('erro marca o campo como inválido e liga a mensagem; sem violações de acessibilidade', async () => {
    const { container } = render(<Wrapper initial={2} error="Valor inválido" />);
    expect(field()).toHaveAttribute('aria-invalid', 'true');
    expect(field()).toHaveAccessibleDescription(/Valor inválido/);
    expect(field()).toHaveAccessibleDescription(/Quantas cópias/);
    const result = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(result.violations.map((v) => v.id)).toEqual([]);
  });
});
