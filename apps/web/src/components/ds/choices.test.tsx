// @vitest-environment jsdom
import axe from 'axe-core';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Choices } from './choices';

afterEach(cleanup);

type V = 'a' | 'b' | 'c';
const options = [
  { value: 'a', label: 'Commander' },
  { value: 'b', label: 'Brawl', disabled: true },
  { value: 'c', label: 'Modern', description: '60 cartas' },
] as const;

function Wrapper({ initial, onChange }: { initial: V | null; onChange?: (v: V) => void }) {
  const [value, setValue] = useState<V | null>(initial);
  return (
    <Choices<V>
      label="Tipo de jogo"
      value={value}
      options={options}
      description="Escolha um"
      onChange={(v) => {
        setValue(v);
        onChange?.(v);
      }}
    />
  );
}

describe('Choices (site)', () => {
  it('é um grupo de rádio com nome; a opção marcada aparece marcada', () => {
    render(<Wrapper initial="a" />);
    expect(screen.getByRole('radiogroup', { name: 'Tipo de jogo' })).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(screen.getByRole('radio', { name: 'Commander' })).toBeChecked();
    expect(screen.getByRole('radio', { name: /Brawl/ })).toBeDisabled();
  });

  it('sem valor, nenhuma marcada; clicar escolhe', () => {
    const onChange = vi.fn();
    render(<Wrapper initial={null} onChange={onChange} />);
    for (const r of screen.getAllByRole('radio')) expect(r).not.toBeChecked();
    fireEvent.click(screen.getByRole('radio', { name: /Modern/ }));
    expect(onChange).toHaveBeenCalledWith('c');
    expect(screen.getByRole('radio', { name: /Modern/ })).toBeChecked();
  });

  it('sem violações de acessibilidade', async () => {
    const { container } = render(<Wrapper initial="c" />);
    const result = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(result.violations.map((v) => v.id)).toEqual([]);
  });

  it('cartões: 3 opções curtas ficam numa linha só (a partir de telas médias)', () => {
    const three = [
      { value: 'a', label: 'Automático' },
      { value: 'b', label: 'Claro' },
      { value: 'c', label: 'Escuro' },
    ] as const;
    const { container } = render(
      <Choices<V> label="Tema" variant="cards" value="a" options={three} onChange={() => {}} />,
    );
    expect(container.querySelector('.sm\\:grid-cols-3')).not.toBeNull();
    cleanup();
    // Com descrição em cada opção (ex.: vencedor na mesa), continuam em duas colunas.
    const { container: c2 } = render(
      <Choices<V> label="Tipo" variant="cards" value="a" options={options} onChange={() => {}} />,
    );
    expect(c2.querySelector('.sm\\:grid-cols-3')).toBeNull();
  });
});

