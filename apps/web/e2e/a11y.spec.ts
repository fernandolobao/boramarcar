import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { AUTH_STATE } from './support/global-setup';
import { monthlyKey } from './support/monthly-key';
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

/** Mês do encontro passado do seed (7 dias atrás), no fuso de São Paulo. */
const PAST_MONTH = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
})
  .format(new Date(Date.now() - 7 * 86_400_000))
  .slice(0, 7);

const PUBLIC_PAGES = [
  '/',
  '/privacidade',
  '/ajuda',
  '/aprender',
  '/aprender/combate',
  '/aprender/identidade-de-cor',
  '/aprender/glossario',
  '/aprender/desafios/desafio-pilha',
  `/convite/${E2E_INVITE_CODE}`,
  '/convite/NAOEXISTE',
  `/resumo/${E2E_IDS.pastEvent}`,
  `/torneio/${E2E_IDS.tournament}`,
  '/lojas',
  '/lojas/em/rs/porto-alegre',
  `/lojas/${E2E_IDS.store}`,
  `/lojas/${E2E_IDS.store}/eventos/${E2E_IDS.storeEvent}`,
  `/lojas/${E2E_IDS.store}/eventos/${E2E_IDS.storeTournamentEvent}`,
  `/loja/convite/${E2E_IDS.storeInvite}`,
  `/retrospectiva/${E2E_IDS.group}/${PAST_MONTH}?k=${monthlyKey(E2E_IDS.group, PAST_MONTH)}`,
  '/entrar',
  '/cadastro',
  '/esqueci-senha',
  '/redefinir-senha?token=x',
];
const AUTH_PAGES = [
  '/',
  '/aprender',
  '/aprender/mana-e-terrenos',
  '/painel',
  '/boas-vindas?passo=1',
  '/boas-vindas?passo=2',
  '/boas-vindas?passo=3',
  '/boas-vindas?passo=fim',
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
  '/decks/novo',
  '/colecao',
  '/grupo',
  '/torneios',
  '/torneios/novo',
  `/torneios/${E2E_IDS.tournament}`,
  `/lojas/${E2E_IDS.store}/gerenciar`,
  `/lojas/${E2E_IDS.store}/eventos/${E2E_IDS.storeEvent}/gerenciar`,
  '/codigo',
  '/perfil',
  '/configuracoes',
  '/feedback?de=/painel',
  '/notificacoes',
  '/admin',
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
          // A página chega em etapas (esqueleto do `loading.tsx` e animação de entrada): mede o
          // contraste só com o conteúdo final, sem nada no meio de um esmaecimento.
          await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
          await page.waitForFunction(() =>
            document
              .getAnimations()
              .every(
                (a) =>
                  a.playState !== 'running' ||
                  a.effect?.getComputedTiming().iterations === Infinity,
              ),
          );
          await expectNoViolations(page);
        });
      }
    });
  });
}
