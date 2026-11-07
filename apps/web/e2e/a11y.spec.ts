import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { AUTH_STATE } from './support/global-setup';
import { E2E_IDS, E2E_INVITE_CODE } from './support/seed';

/** Regras WCAG 2.0/2.1/2.2 nível A e AA. */
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function expectNoViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  const summary = results.violations.map((v) => ({
    rule: v.id,
    impact: v.impact,
    help: v.help,
    nodes: v.nodes.map((n) => n.target.join(' ')).slice(0, 5),
  }));
  expect(summary, JSON.stringify(summary, null, 2)).toEqual([]);
}

const PUBLIC_PAGES = ['/', `/convite/${E2E_INVITE_CODE}`, '/convite/NAOEXISTE'];
const AUTH_PAGES = [
  '/',
  '/painel',
  '/disponibilidade',
  '/eventos',
  `/eventos/${E2E_IDS.upcomingEvent}`,
  `/eventos/${E2E_IDS.pastEvent}`,
  '/eventos/historico',
  `/mesa/${E2E_IDS.upcomingEvent}`,
  '/ranking',
  '/decks',
  `/decks/${E2E_IDS.deck}`,
  `/decks/${E2E_IDS.deck}/imprimir?which=all`,
  '/decks/importar',
  '/grupo',
  '/perfil',
  '/configuracoes',
  '/jogadores/e2e-bia',
  `/convite/${E2E_INVITE_CODE}`,
];

const hasDb = Boolean(process.env.E2E_DATABASE_URL);

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`acessibilidade (${scheme}) @a11y`, () => {
    test.use({ colorScheme: scheme });

    test.describe('páginas públicas', () => {
      for (const path of PUBLIC_PAGES) {
        test(path, async ({ page }) => {
          test.skip(!hasDb && path.startsWith('/convite'), 'requer banco (E2E_DATABASE_URL)');
          await page.goto(path);
          await expectNoViolations(page);
        });
      }
    });

    test.describe('páginas logadas', () => {
      test.skip(!hasDb, 'requer banco (E2E_DATABASE_URL)');
      test.use({ storageState: AUTH_STATE });
      for (const path of AUTH_PAGES) {
        test(path, async ({ page }) => {
          await page.goto(path);
          await expect(page.locator('main')).toBeVisible();
          await expectNoViolations(page);
        });
      }
    });
  });
}
