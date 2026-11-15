# Capturas do produto na página inicial — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gerar 6 capturas reais (claro e escuro) de um grupo fictício e mostrá-las numa seção "Veja por dentro" com abas na página inicial.

**Architecture:** Um script semeia um banco descartável (dados fictícios), sobe o build de produção, completa os dados pela API com sessões dos usuários fictícios (decks importados por lista, coleção) e captura as telas com Playwright; o `sharp` converte para WebP em `apps/web/public/showcase/`. A página inicial ganha um componente cliente de abas que mostra a imagem do tema ativo.

**Tech Stack:** Postgres 16 local (Homebrew), Drizzle (`@boramarcar/db`), Playwright (Chrome), sharp, Next.js 16, next-intl, Tailwind v4.

**Spec:** `docs/superpowers/specs/2026-11-15-capturas-landing-design.md`

## Global Constraints

- Nenhum dado real: nomes, e-mails (`@showcase.test`) e grupo inventados; o script recusa `DATABASE_URL` que não seja `localhost`/`127.0.0.1`.
- Telas: painel, disponibilidade, deck (análise), coleção, modo mesa (iPad 1180×820 deitado, 4 jogadores em cruz), ranking. Computador 1280×800. Temas claro e escuro.
- Saída: `apps/web/public/showcase/<tela>-<light|dark>.webp`, total < 1,5 MB.
- Textos em `messages/pt-BR.json` e `en.json`; abas no padrão ARIA (setas, Home/End); imagem com texto alternativo descritivo; a seção entra no E2E de acessibilidade da home (já coberta).
- `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test` antes do PR.

## Review Focus

- Script apontado para um banco que não é local: tem de parar antes de truncar qualquer tabela.
- Scryfall indisponível durante a captura: o script falha com mensagem clara em vez de gerar capturas com cartas sem imagem.
- Tema: quem escolheu "Escuro" no site com o sistema claro vê a captura escura (segue `data-theme`, não só `prefers-color-scheme`).
- Teclado nas abas: setas e Home/End trocam a aba e o painel ligado; Tab sai das abas para o painel.
- Celular estreito (320 px): abas rolam na horizontal, sem rolagem horizontal da página.

---

### Task 1: Guarda do banco descartável e dados fictícios

**Files:**

- Create: `apps/web/scripts/showcase/guard.ts`, `apps/web/scripts/showcase/data.ts`, `apps/web/scripts/showcase/seed.ts`
- Test: `apps/web/scripts/showcase/guard.test.ts`
- Modify: `apps/web/vitest.config.ts` (incluir `scripts/**/*.test.ts`)

**Interfaces:**

- Produces: `assertDisposableDatabase(url: string): void` (lança se o host não for `localhost`/`127.0.0.1` ou se o nome do banco não começar com `showcase`); `SHOWCASE_USERS`, `SHOWCASE_DECKS` (listas em texto), `SHOWCASE_COLLECTION` (nomes); `seedShowcase(databaseUrl: string): Promise<{ sessions: Record<string, string> }>` (tokens de sessão por usuário).

- [ ] **Step 1: Write the failing test** — `assertDisposableDatabase('postgres://u@localhost:5433/showcase')` não lança; `'postgres://u@ep-x.neon.tech/neondb'` lança; `'postgres://u@localhost:5433/boramarcar'` lança.
- [ ] **Step 2: Run** `cd apps/web && npx vitest run scripts/showcase/guard.test.ts` — Expected: FAIL (módulo não existe)
- [ ] **Step 3: Implement** a guarda, os dados (6 pessoas, grupo "Mesa de Quinta", 2 locais, regras semanais que fecham a mesa às quintas 19h–23h, encontro na próxima quinta com 5 "vou", 12 quintas passadas com 2 partidas cada usando decks, vencedores e turnos variados) e o seed, que trunca como o seed do E2E e grava pelos serviços de `@boramarcar/db`.
- [ ] **Step 4: Run** o teste — Expected: PASS
- [ ] **Step 5: Commit** `feat(site): dados fictícios e guarda para as capturas`

### Task 2: Banco local e captura

**Files:**

- Create: `apps/web/scripts/showcase/capture.ts`
- Modify: `apps/web/package.json` (script `showcase`), `.gitignore` se precisar

**Interfaces:**

- Consumes: `assertDisposableDatabase`, `seedShowcase`, `SHOWCASE_DECKS`, `SHOWCASE_COLLECTION` (Task 1); `signedSessionCookie` de `e2e/support/seed.ts`
- Produces: `apps/web/public/showcase/{painel,disponibilidade,deck,colecao,mesa,ranking}-{light,dark}.webp`

- [ ] **Step 1:** Instalar `postgresql@16` pelo Homebrew, `initdb` num diretório do scratchpad, subir na porta 5433, `createdb showcase`, rodar as migrations.
- [ ] **Step 2:** Implementar: guarda → seed → `next start` (porta 3100, env do seed) → pela API, com o cookie de cada pessoa, importar os 3 decks (lista colada) e adicionar a coleção da Ana; esperar a análise; gravar o estado do modo mesa no `localStorage` (4 jogadores, disposição `4-cross`, vidas e dano variados); capturar as 6 telas em claro e escuro (tema por `localStorage` antes de carregar); converter para WebP (qualidade 80) com `sharp`; derrubar o servidor.
- [ ] **Step 3: Run** `pnpm --filter @boramarcar/web build && pnpm --filter @boramarcar/web showcase` — Expected: 12 arquivos em `public/showcase`, total < 1,5 MB; conferir cada imagem (sem dado real, cartas com imagem, telas carregadas).
- [ ] **Step 4: Commit** `feat(site): script de capturas e imagens do produto`

### Task 3: Seção "Veja por dentro" na página inicial

**Files:**

- Create: `apps/web/src/components/home/product-tour.tsx`
- Test: `apps/web/src/components/home/product-tour.test.tsx`; incluir em `a11y.test.tsx`
- Modify: `apps/web/src/app/page.tsx` (depois da seção de recursos), `messages/pt-BR.json` e `en.json` (`home.tour.*`)

**Interfaces:**

- Produces: `ProductTour()` (`'use client'`), 6 abas com `role="tab"`/`tabpanel`, `aria-selected`, `aria-controls`; imagem clara com `dark:hidden` e escura com `hidden dark:block` (o `dark:` do projeto segue `data-theme`).

- [ ] **Step 1: Write the failing test** (jsdom): 6 abas com os nomes das telas; a primeira selecionada; seta → seleciona a segunda e mostra o painel dela; End vai para a última; cada painel tem duas imagens com o mesmo texto alternativo descritivo e a legenda; axe sem violações.
- [ ] **Step 2: Run** — Expected: FAIL
- [ ] **Step 3: Implement** o componente e a seção (título, subtítulo, abas roláveis no celular, `next/image` com `width`/`height` fixos e `loading="lazy"`).
- [ ] **Step 4: Run** o teste e `a11y.test.tsx` — Expected: PASS
- [ ] **Step 5: Commit** `feat(site): seção Veja por dentro com capturas do produto`; verificação completa; `docs/ACCESSIBILITY.md` e README (como regenerar); PR.
