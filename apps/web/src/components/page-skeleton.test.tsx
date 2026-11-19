// @vitest-environment jsdom
import axe from 'axe-core';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PageSkeleton } from './page-skeleton';

afterEach(cleanup);

describe('PageSkeleton (troca de página)', () => {
  it('anuncia "Carregando…" e os blocos cinza ficam fora da leitura', async () => {
    const { container } = render(
      <main>
        <PageSkeleton label="Carregando…" />
      </main>,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Carregando…');
    const busy = container.querySelector('[aria-busy="true"]');
    expect(busy).not.toBeNull();
    for (const block of container.querySelectorAll('[data-skeleton]')) {
      expect(block.closest('[aria-hidden="true"]')).not.toBeNull();
    }
    const result = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(result.violations.map((v) => v.id)).toEqual([]);
  });
});
