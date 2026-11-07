# Instruções para agentes de código (Claude Code e similares)

Este arquivo é lido automaticamente por agentes de IA que trabalham neste repositório.
Leia também o [README](README.md), a [arquitetura](docs/ARCHITECTURE.md) e o [roadmap](docs/ROADMAP.md).

## Convenções do projeto

- TypeScript strict. Regras de negócio em `packages/core` (puras e testadas); acesso a dados em `packages/db/src/services`; rotas da API finas (auth + Zod + serviço).
- Mudou o schema? `pnpm db:generate` e commit da migration.
- Todo texto de interface vai em `apps/web/messages/pt-BR.json` **e** `en.json` (há teste de paridade). No app mobile, em `apps/mobile/src/lib/i18n.ts` (português e inglês; o TypeScript exige as mesmas chaves).
- App mobile (`apps/mobile`): Expo + Expo Router; dependências com `npx expo install` (versões do SDK); fala com o servidor só pelo `@boramarcar/api-client`. Leia `apps/mobile/AGENTS.md`.
- Marca **ArcanaKin**: cores só pelos design tokens (`packages/tokens`). No site, prefira as classes por função (`bg-canvas`, `bg-surface`, `text-fg`, `text-fg-muted`, `border-line`, `border-line-strong`, `bg-primary`, `text-link`, `bg-accent`/`text-on-accent`) às escalas (`ink-*`, `brand-*`, `gold-*`, `teal-*`); nada de cores fixas (`#…`, `zinc-*`). Mudou os tokens? `pnpm --filter @boramarcar/tokens build:css`. Logotipo: `<Logo>` (site e app).
- Horários digitados pelo usuário são convertidos com `zonedLocalToUtc` no fuso do usuário (`useTimeZone()`), nunca com `new Date(valorDoInput)`.
- Antes de abrir PR: `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test` e, quando mexer em UI, os testes E2E (ver abaixo).

## Acessibilidade e usabilidade (obrigatório)

A plataforma segue **WCAG 2.2 nível AA**. Toda tela ou componente novo — ou alterado — precisa passar por auditoria de acessibilidade **antes** do PR. Isso não é opcional.

### Checklist para cada componente/tela novo ou alterado

1. **Semântica primeiro**: `<button type="button">` para ações, `<a href>` para navegação, `<label>` associado a cada campo, `<fieldset>/<legend>` para grupos, `<table>` com `<th scope="col">` para dados tabulares. ARIA só quando não houver elemento nativo.
2. **Nome acessível**: todo controle tem nome; botões repetidos (ex.: vários "Remover") recebem um nome com contexto (`label`/`aria-label` contendo o texto visível — WCAG 2.5.3). Links que abrem nova aba avisam com `<span className="sr-only">` (`common.newTab`).
3. **Estado exposto**: `aria-pressed` em toggles, `aria-current="page"` na navegação, `aria-expanded` em disclosures, `role="status"`/`role="alert"` (ou `FormError`) para mensagens.
4. **Teclado**: tudo operável por teclado, ordem de foco lógica, foco visível (use as classes `btn*`, `input`, `select`, que já têm anel de foco). Nada de `outline: none` sem substituto. Ações destrutivas usam confirmação em dois cliques (padrão do projeto), não `window.confirm`.
5. **Estrutura**: um `<h1>` por página, títulos sem pular níveis, `generateMetadata` com título descritivo em páginas novas (WCAG 2.4.2), conteúdo dentro de `<main id="conteudo">` (alvo do link "Pular para o conteúdo").
6. **Contraste**: texto ≥ 4,5:1, bordas de campos e ícones ≥ 3:1, nos temas claro **e** escuro. Texto secundário usa a classe `muted` (`text-fg-muted`). Não use `text-ink-500` ou mais claro para texto.
7. **Cor não é a única pista**: informações em cor também aparecem em texto ou ícone; gráficos decorativos com `aria-hidden="true"` quando o dado já está em texto.
8. **Toque e reflow**: alvos ≥ 24×24px (checkbox/radio já são 20px + rótulo clicável), layout sem rolagem horizontal em 320px.
9. **Movimento**: animações com `motion-reduce:`.
10. **Selects** usam a classe `select` (seta própria com espaçamento), não `input`.
11. **Cursor**: tudo que é clicável mostra `cursor: pointer` (botões, rótulos de checkbox/radio, selects); desabilitado mostra `not-allowed`. Já está no CSS global e nas classes `btn*`/`select` — não sobrescreva.
12. **Ícones**: use só o mapa `Icons`/`<Icon name>` de `apps/web/src/components/icons.tsx` (Lucide), para a mesma ação ter sempre o mesmo ícone. Ícone acompanha texto visível e é decorativo (`aria-hidden`). Botão só com ícone exige `aria-label` (ou texto `sr-only`) e, se possível, dica visível no foco/hover. Precisa de um ícone novo? Adicione-o ao mapa com um nome semântico (ex.: `delete`, não `trash`).

### Como auditar (automatizado + manual)

- **Lint**: `eslint-plugin-jsx-a11y` (regras _strict_) roda como erro em `pnpm lint`.
- **Componentes**: adicione o componente novo em `apps/web/src/components/a11y.test.tsx` (axe-core em jsdom).
- **Páginas**: adicione a rota nova em `apps/web/e2e/a11y.spec.ts`. O teste roda axe (WCAG 2.0–2.2 A/AA) em tema claro e escuro, desktop e mobile, com dados reais semeados em `e2e/support/seed.ts`. Para rodar localmente:
  ```bash
  # Postgres local + migrations; depois:
  export DATABASE_URL=postgres://... E2E_DATABASE_URL=$DATABASE_URL BETTER_AUTH_SECRET=<32+ chars> BETTER_AUTH_URL=http://localhost:3000 GOOGLE_CLIENT_ID=x GOOGLE_CLIENT_SECRET=y
  pnpm build && pnpm test:e2e
  ```
- **Manual** (o automático pega ~40–70%): navegue só com teclado (Tab, Shift+Tab, Enter, Espaço, Esc), confira o foco visível e a ordem; teste em 320px e com zoom de 200%; quando possível, passe com VoiceOver (macOS) ou NVDA.
- Registre problemas encontrados e decisões em [docs/ACCESSIBILITY.md](docs/ACCESSIBILITY.md).
