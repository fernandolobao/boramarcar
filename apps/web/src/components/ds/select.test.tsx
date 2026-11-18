// @vitest-environment jsdom
import axe from 'axe-core';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Select } from './select';

afterEach(cleanup);

type V = '' | 'commander' | 'modern' | 'pauper';
const options = [
  { value: '', label: 'Todos os tipos' },
  { value: 'commander', label: 'Commander' },
  { value: 'modern', label: 'Modern' },
  { value: 'pauper', label: 'Pauper', disabled: true },
] as const;

function Controlled({ onChange }: { onChange?: (v: V) => void }) {
  const [value, setValue] = useState<V | null>('commander');
  return (
    <Select<V>
      label="Tipo de jogo"
      value={value}
      options={options}
      description="Só partidas deste tipo"
      onChange={(v) => {
        setValue(v);
        onChange?.(v);
      }}
    />
  );
}

describe('Select (site)', () => {
  it('botão com o rótulo e a opção escolhida; abrir mostra a lista e escolher avisa', () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    const trigger = screen.getByRole('button', { name: /Tipo de jogo/ });
    expect(trigger).toHaveTextContent('Commander');
    fireEvent.click(trigger);
    const list = screen.getByRole('listbox');
    expect(within(list).getAllByRole('option')).toHaveLength(4);
    expect(within(list).getByRole('option', { name: 'Pauper' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    fireEvent.click(within(list).getByRole('option', { name: 'Modern' }));
    expect(onChange).toHaveBeenLastCalledWith('modern');
    expect(screen.getByRole('button', { name: /Tipo de jogo/ })).toHaveTextContent('Modern');
  });

  it('em formulário (GET), sem estado: `name` e `defaultValue` vão no envio', () => {
    render(
      <form aria-label="Filtros">
        <Select<V> label="Tipo de jogo" name="tipo" defaultValue="" options={options} />
      </form>,
    );
    const form = screen.getByRole('form', { name: 'Filtros' }) as HTMLFormElement;
    expect(new FormData(form).get('tipo')).toBe('');
    expect(screen.getByRole('button', { name: /Tipo de jogo/ })).toHaveTextContent(
      'Todos os tipos',
    );
    fireEvent.click(screen.getByRole('button', { name: /Tipo de jogo/ }));
    fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: 'Modern' }));
    expect(new FormData(form).get('tipo')).toBe('modern');
  });

  it('sem escolha, mostra o texto de espera', () => {
    render(
      <Select<V>
        label="Tipo de jogo"
        value={null}
        onChange={() => {}}
        options={options}
        placeholder="Escolha"
      />,
    );
    expect(screen.getByRole('button', { name: /Tipo de jogo/ })).toHaveTextContent('Escolha');
  });

  it('sem violações de acessibilidade', async () => {
    const { container } = render(<Controlled />);
    const result = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(result.violations.map((v) => v.id)).toEqual([]);
  });
});
