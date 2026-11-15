# Onboarding, entrega 1: guia do primeiro acesso (7.1) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Guia de 3 passos (grupo, fuso e idioma, primeira disponibilidade semanal) que abre sozinho no primeiro acesso de contas novas, no site e no app, sempre com "Pular o guia", e retomável pelos primeiros passos.

**Architecture:** O estado do guia é calculado no servidor (`getGuideState` em `packages/db/src/services/onboarding.ts`) a partir das marcas em `onboarding_steps` e da data de criação da conta. Site: página `/boas-vindas` fora do grupo de rotas `(app)` (o layout da área logada redireciona para ela); passos por `?passo=`, reaproveitando `JoinGroupForm`/`CreateGroupForm`, `ProfileForm` e `AvailabilityForm`. App: tela `boas-vindas` na pilha, aberta pelo layout raiz via `GET /api/v1/me/onboarding`, reaproveitando `NoGroup`, os campos de Configurações e `AddAvailability`.

**Tech Stack:** Next.js 16 (Server Components, next-intl), Expo Router, Drizzle, Zod, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-15-onboarding-fase-7-design.md` (seção 7.1)

## Global Constraints

- Nunca obrigatório: "Pular o guia" em todas as telas grava `guide-skipped`; concluir grava `guide-completed`.
- Abre sozinho só se não há `guide-completed` nem `guide-skipped` **e** a conta foi criada a partir de `GUIDE_LAUNCH` (data do deploy, constante no db).
- Quem já está num grupo começa no passo 2. Disponibilidade do guia: regra semanal (dia + horário), com "Pular este passo".
- "Ver o guia de novo" nos primeiros passos (site e app) enquanto houver passo pendente.
- Textos em `messages/*.json` e `apps/mobile/src/lib/i18n.ts`; WCAG 2.2 AA: um `<h1>` por passo, "Passo N de 3" em texto, foco no título ao trocar de passo, `generateMetadata`.
- Ajuda: pergunta "Como vejo o guia de novo?". Capturas da página inicial: conferir que nenhuma mudou.
- `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test` antes do PR.

## Review Focus

- Loop de redirecionamento: `/boas-vindas` nunca redireciona para ela mesma nem exige grupo.
- Conta antiga (antes de `GUIDE_LAUNCH`) nunca é levada ao guia, mas abre pelo "Ver o guia de novo".
- Pular no passo 1 sem grupo: vai para `/grupo` (site) / tela sem grupo (app), sem erro.
- Passo 3 sem grupo (pulou o passo 1 pelo link): explica que precisa de grupo e oferece concluir.
- App sem rede ao abrir: a falha do `GET /me/onboarding` não bloqueia o app (não abre o guia).

---

### Task 1: Estado do guia (db + API + cliente)

**Files:** Modify `packages/db/src/services/onboarding.ts` (+ teste), `apps/web/src/app/api/v1/me/onboarding/route.ts` (GET), `packages/api-client/src/{schemas,client}.ts` (+ teste).

**Interfaces — Produces:**

- `ONBOARDING_FLAGS` ganha `'guide-completed'`.
- `GUIDE_LAUNCH: Date` (constante).
- `getGuideState(db, { userId }): Promise<{ show: boolean; done: boolean; hasGroup: boolean }>` — `done` = tem `guide-completed` ou `guide-skipped`; `show` = `!done && user.createdAt >= GUIDE_LAUNCH`.
- `GET /api/v1/me/onboarding` → `{ guide: { show, done, hasGroup } }`; `api.me.onboarding()` e `api.me.markOnboarding(flag)` (se ainda não existir).

- [ ] Teste (db): conta nova sem marcas → `show: true`; com `guide-skipped` → `show: false, done: true`; conta criada antes de `GUIDE_LAUNCH` → `show: false, done: false`; `hasGroup` reflete a participação.
- [ ] Run → FAIL; implementar; Run → PASS. Teste do cliente (URL e parse). Commit.

### Task 2: Guia no site

**Files:** Create `apps/web/src/app/boas-vindas/page.tsx` (+ layout simples com o `<Logo>` e `<main id="conteudo">`), `apps/web/src/components/guide-steps.tsx` (+ teste); Modify `apps/web/src/app/(app)/layout.tsx` (redireciona se `show`), `ProfileForm` (prop `onSaved?`), `AvailabilityForm` (prop `initialFrequency?`), `first-steps.tsx` ("Ver o guia de novo"), mensagens `guide.*`, `a11y.test.tsx`, `e2e/a11y.spec.ts` (rota nova).

**Interfaces — Consumes:** `getGuideState`, formulários existentes.

- [ ] Teste (jsdom) de `GuideSkip` e `GuideFinish` (client): "Pular o guia" faz POST `guide-skipped` e navega para `/painel` (ou `/grupo` sem grupo); "Ir para o painel" grava `guide-completed`.
- [ ] Página: `?passo=1|2|3|fim`; passo 1 mostra os formulários ou "Você já está em {grupo}" + Continuar; passo 2 `ProfileForm` + Continuar; passo 3 `AvailabilityForm` semanal (ou aviso sem grupo) + "Pular este passo"; fim com o próximo encontro. Cabeçalho com "Passo N de 3" e "Pular o guia".
- [ ] Layout `(app)`: `if (guide.show) redirect('/boas-vindas')`.
- [ ] Run testes + a11y; conferir no navegador (1280/320, claro/escuro, teclado). Commit.

### Task 3: Guia no app

**Files:** Create `apps/mobile/src/app/boas-vindas.tsx`, `apps/mobile/src/components/first-steps.tsx`; Modify `apps/mobile/src/app/_layout.tsx` (abre o guia uma vez por sessão quando `show`), `(tabs)/painel.tsx` (primeiros passos com "Ver o guia de novo"), `i18n.ts`.

- [ ] Passos com estado local (1→2→3→fim), reaproveitando `NoGroup` (com `onDone`), os campos de fuso/idioma de Configurações (extraídos para um componente) e `AddAvailability` semanal. "Pular o guia" e "Ir para o painel" gravam as marcas.
- [ ] `pnpm --filter mobile typecheck`; commit; ajuda; verificação completa; PR.
