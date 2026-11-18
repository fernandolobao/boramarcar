// @vitest-environment jsdom
import axe from 'axe-core';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Checkbox } from './checkbox';
import { Stat } from './stat';
import { Switch } from './switch';

afterEach(cleanup);

const noViolations = async (container: HTMLElement) => {
  const result = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
  return result.violations.map((v) => v.id);
};

function Box({ onChange }: { onChange?: (v: boolean) => void }) {
  const [checked, setChecked] = useState(false);
  return (
    <Checkbox
      label="Foil"
      checked={checked}
      description="Cartas brilhantes"
      onChange={(v) => {
        setChecked(v);
        onChange?.(v);
      }}
    >
      <span aria-hidden="true">✦</span>
    </Checkbox>
  );
}

describe('Checkbox (site)', () => {
  it('é uma caixa de marcar com nome e dica; clicar marca', () => {
    const onChange = vi.fn();
    render(<Box onChange={onChange} />);
    const box = screen.getByRole('checkbox', { name: 'Foil' });
    expect(box).not.toBeChecked();
    expect(box).toHaveAccessibleDescription('Cartas brilhantes');
    fireEvent.click(box);
    expect(onChange).toHaveBeenLastCalledWith(true);
    expect(box).toBeChecked();
  });

  it('desabilitada não muda', () => {
    const onChange = vi.fn();
    render(<Checkbox label="Ana" checked={false} disabled onChange={onChange} />);
    expect(screen.getByRole('checkbox', { name: 'Ana' })).toBeDisabled();
  });

  it('sem violações de acessibilidade', async () => {
    const { container } = render(<Box />);
    expect(await noViolations(container)).toEqual([]);
  });
});

describe('Switch (site)', () => {
  it('é um interruptor com nome; alternar avisa', async () => {
    const onChange = vi.fn();
    const { container } = render(<Switch label="Avisos por e-mail" checked onChange={onChange} />);
    const sw = screen.getByRole('switch', { name: 'Avisos por e-mail' });
    expect(sw).toBeChecked();
    fireEvent.click(sw);
    expect(onChange).toHaveBeenLastCalledWith(false);
    expect(await noViolations(container)).toEqual([]);
  });
});

describe('Stat (site)', () => {
  it('rótulo e valor num par de lista de definição, com a dica', async () => {
    const { container } = render(
      <dl>
        <Stat label="Vitórias" value="3" hint="no mês" />
      </dl>,
    );
    expect(screen.getByRole('term')).toHaveTextContent('Vitórias');
    expect(screen.getByRole('definition')).toHaveTextContent('3');
    expect(screen.getByText('no mês')).toBeInTheDocument();
    expect(await noViolations(container)).toEqual([]);
  });
});
