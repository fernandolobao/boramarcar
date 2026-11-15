# Integração do grupo, entrega 1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Misturar a mesa e trazer de volta quem sumiu: sugestão de mesas no encontro, "com quem você ainda não jogou" no painel e "quem anda sumido" com "Chamar para o próximo" na tela do grupo, no site e no app.

**Architecture:** Regras puras em `packages/core/src/integration` (testadas); consultas em `packages/db/src/services/integration.ts` (que chamam o core); rotas finas na API; site lê o banco direto nas páginas de servidor e o app usa o `@boramarcar/api-client`. Três PRs independentes a partir da `main`, um por funcionalidade (partes A, B e C).

**Tech Stack:** TypeScript, Drizzle/Postgres, Next.js 16 (next-intl), Expo Router, Zod, Vitest, React Aria.

**Spec:** `docs/superpowers/specs/2026-11-15-integracao-grupo-design.md` (entrega 1)

## Global Constraints

- Mínimos: 6 confirmados para sugerir mesas; 30 dias para "sumido" e "novo no grupo"; janela de 8 encontros realizados para frequência; "não confirmou nos últimos 4"; peso maior para partidas dos últimos 90 dias.
- "Quem anda sumido" e a frequência só para dono e admins (membro comum: 403 na API e nada na tela).
- "Chamar para o próximo": no máximo um aviso por pessoa por encontro (409 se repetido); push e e-mail conforme a preferência de cada um.
- Sugestão de mesas não altera presenças nem partidas.
- Textos em `messages/pt-BR.json` e `en.json` e em `apps/mobile/src/lib/i18n.ts`; cores só por tokens; ícones só do mapa `Icons`.
- Rotas novas com ID entram em `autorizacao.test.ts` (quem não é do grupo; para presença e chamado, também o membro comum).
- WCAG 2.2 AA: componentes novos do site em `a11y.test.tsx`; registro em `docs/ACCESSIBILITY.md`.
- Antes de cada PR: `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test`.

## Review Focus

- Grupo com formato padrão de duelo (1x1) ou de times: a sugestão de mesas não aparece (só `free_for_all`), em vez de mesas de 3 num duelo.
- Confirmado que nunca jogou com ninguém do grupo (ou grupo sem partidas): todas as mesas mostram todos os pares como novos, sem erro de divisão por zero.
- Ex-membro que ainda aparece em partidas antigas: não entra em pares, dicas nem presença.
- "Chamar" alguém para um encontro cancelado, passado ou de outro grupo: 404/409 sem aviso enviado.
- Admin rebaixado a membro depois de abrir a tela: o próximo "Chamar" responde 403.

---

## Parte A — Sugestão de mesas (PR `feat/sugestao-mesas`)

### Task 1: Divisão das mesas (core)

**Files:**

- Create: `packages/core/src/integration/tables.ts`, `packages/core/src/integration/index.ts`
- Test: `packages/core/src/integration/tables.test.ts`
- Modify: `packages/core/src/index.ts` (exportar `integration`)

**Interfaces:**

- Produces:
  - `interface PairCount { a: string; b: string; recent: number; older: number }` (partidas juntos nos últimos 90 dias e antes)
  - `tableSizes(n: number, opts?: { min?: number; max?: number; preferred?: number }): number[]` — padrão 3/5/4; `k = Math.round(n / preferred)` ajustado para que todas as mesas fiquem entre min e max; tamanhos o mais iguais possível, maiores primeiro. `[]` se n < 2·min.
  - `suggestTables(playerIds: string[], pairs: PairCount[], opts: { seed: number; min?: number; max?: number; preferred?: number }): { tables: { playerIds: string[]; newPairs: number }[]; cost: number } | null` — custo de um par = `3·recent + older`; embaralha com semente (mulberry32), distribui por `tableSizes` e melhora por trocas entre mesas até não haver troca que reduza o custo. `null` com menos de 6 jogadores.
  - `MIN_PLAYERS_FOR_TABLES = 6`

- [ ] **Step 1: Write the failing tests** — `tableSizes`: 6→[3,3], 7→[4,3], 8→[4,4], 9→[5,4], 10→[4,3,3], 12→[4,4,4], 5→[]. `suggestTables`: 5 jogadores → null; 8 jogadores em que A–B jogaram 5 vezes e C–D 4 vezes → A e B em mesas diferentes, C e D também; mesma semente → mesmo resultado (`toEqual`); todas as pessoas aparecem uma vez; `newPairs` conta pares da mesa sem nenhuma partida (grupo sem histórico: mesa de 4 → 6); par recente pesa mais que antigo (A–B 1 recente vs. C–D 2 antigas, só uma separação possível → separa A–B).
- [ ] **Step 2: Run** `pnpm vitest run packages/core/src/integration` — Expected: FAIL (módulo não existe)
- [ ] **Step 3: Implement** `tables.ts`.
- [ ] **Step 4: Run** o mesmo — Expected: PASS
- [ ] **Step 5: Commit** `feat(core): sugestão de mesas que junta quem menos jogou junto`

### Task 2: Pares do encontro (db + API + cliente)

**Files:**

- Create: `packages/db/src/services/integration.ts`, `packages/db/src/services/integration.test.ts`, `apps/web/src/app/api/v1/events/[eventId]/pairings/route.ts`
- Modify: `packages/db/src/index.ts`, `packages/api-client/src/{schemas,client}.ts` (+ `client.test.ts`), `apps/web/src/app/api/v1/__tests__/autorizacao.test.ts`

**Interfaces:**

- Consumes: `PairCount` (Task 1)
- Produces:
  - `getEventPairings(db, { eventId, userId, now? }): Promise<{ format: string; players: { userId: string; name: string }[]; pairs: PairCount[] }>` — membro do grupo do encontro (senão `not_found`); `players` = rsvp `yes` que ainda são membros, por nome; `pairs` só entre esses jogadores, contando partidas do grupo em que os dois jogaram (recent = `playedAt` ≥ now − 90 dias); `format` = formato padrão do grupo.
  - `GET /api/v1/events/:eventId/pairings` → o objeto acima.
  - `api.events.pairings(eventId)`.

- [ ] **Step 1: Write the failing tests** (db, banco de teste como os outros services): dois confirmados que jogaram 2 vezes (uma há 10 dias, uma há 200) → `{ recent: 1, older: 1 }`; quem recusou não entra; quem saiu do grupo não entra; não membro → `DomainError('not_found')`. Autorização: rota em `autorizacao.test.ts` para quem não é do grupo (404 sem nomes no corpo).
- [ ] **Step 2: Run** `pnpm vitest run packages/db/src/services/integration.test.ts apps/web/src/app/api/v1/__tests__/autorizacao.test.ts` — Expected: FAIL
- [ ] **Step 3: Implement** serviço, rota (`authed`), schema Zod e método do cliente (teste do cliente: URL e parse).
- [ ] **Step 4: Run** o mesmo + `pnpm vitest run packages/api-client` — Expected: PASS
- [ ] **Step 5: Commit** `feat(api): pares de quem confirmou o encontro`

### Task 3: "Sugestão de mesas" no site e no app

**Files:**

- Create: `apps/web/src/components/table-suggestions.tsx` (+ `.test.tsx`), `apps/mobile/src/components/table-suggestions.tsx`
- Modify: `apps/web/src/app/(app)/eventos/[id]/page.tsx`, `apps/mobile/src/app/encontros/[id].tsx`, `apps/web/messages/{pt-BR,en}.json` (`event.tables.*`), `apps/mobile/src/lib/i18n.ts`, `apps/web/src/components/a11y.test.tsx`, `docs/ACCESSIBILITY.md`

**Interfaces:**

- Consumes: `suggestTables`, `MIN_PLAYERS_FOR_TABLES`, `formatRules` (core); `getEventPairings` (site, servidor) e `api.events.pairings` (app).
- Produces: `<TableSuggestions players pairs />` (site, `'use client'`; semente no estado, começa em 1).

- [ ] **Step 1: Write the failing test** (jsdom): com 8 jogadores mostra "Mesa 1" e "Mesa 2" (listas com os nomes) e "N duplas que nunca jogaram juntas"; "Sortear de novo" troca a semente e anuncia em `role="status"`; com 5 jogadores não renderiza nada.
- [ ] **Step 2: Run** `cd apps/web && npx vitest run src/components/table-suggestions.test.tsx` — Expected: FAIL
- [ ] **Step 3: Implement** o componente do site; na página do encontro, só com encontro `scheduled`, `formatRules(format).structure === 'free_for_all'` e ≥ 6 confirmados (limites de mesa: `max(3, min)` a `min(5, max)` do formato). App: mesmo cartão no encontro, com o mesmo cálculo do core.
- [ ] **Step 4: Run** o teste, `a11y.test.tsx` e `pnpm --filter mobile typecheck` — Expected: PASS
- [ ] **Step 5: Commit**; verificação completa; PR "Sugestão de mesas no encontro".

## Parte B — Com quem você ainda não jogou (PR `feat/com-quem-jogar`)

### Task 4: Dicas de parceiros (core + db + API + cliente)

**Files:**

- Create: `packages/core/src/integration/partners.ts` (+ `.test.ts`), `apps/web/src/app/api/v1/groups/[groupId]/partners/route.ts`
- Modify: `packages/core/src/integration/index.ts`, `packages/db/src/services/integration.ts` (+ teste), api-client, `autorizacao.test.ts`

**Interfaces:**

- Produces:
  - `partnerHints(input: { viewerId: string; members: { userId: string; name: string }[]; lastPlayed: Record<string, Date | null>; confirmedNext: string[]; now: Date }): { userId: string; name: string; lastPlayedAt: Date | null }[]` — candidatos: nunca jogou (`null`) ou última partida juntos há 30+ dias; ordem: confirmados no próximo encontro primeiro, depois nunca jogou, depois a última partida mais antiga, depois nome; no máximo 3; nunca o próprio viewer.
  - `listPartnerHints(db, { groupId, userId, now? })` → `{ hints }` (membro; senão `not_found`).
  - `GET /api/v1/groups/:groupId/partners`; `api.groups.partners(groupId)`.

- [ ] **Step 1: Write the failing tests** — core: ordem acima; quem jogou há 10 dias fica de fora; máximo 3. Db: `lastPlayed` vem só de partidas do grupo com os dois; confirmados do próximo encontro `scheduled`. Autorização: não membro → 404.
- [ ] **Step 2: Run** `pnpm vitest run packages/core/src/integration packages/db/src/services/integration.test.ts` — Expected: FAIL
- [ ] **Step 3: Implement**.
- [ ] **Step 4: Run** o mesmo + autorização + api-client — Expected: PASS
- [ ] **Step 5: Commit** `feat: com quem você ainda não jogou`

### Task 5: Cartão no painel (site e app)

**Files:**

- Modify: `apps/web/src/app/(app)/painel/page.tsx`, `apps/mobile/src/app/(tabs)/painel.tsx`, mensagens (`dashboard.partners.*`: "Você ainda não jogou com {name}", "Faz {time} que você não joga com {name}" com tempo relativo do `format.relativeTime`), `i18n.ts`, `docs/ACCESSIBILITY.md`

- [ ] **Step 1:** Cartão "Com quem jogar" (lista `<ul>`, nome com `PlayerLink`, selo "vai no próximo" em texto quando confirmado); some sem dicas.
- [ ] **Step 2: Run** testes da página do painel existentes e `pnpm --filter mobile typecheck` — Expected: PASS
- [ ] **Step 3: Commit**; verificação completa; PR "Com quem você ainda não jogou".

## Parte C — Quem anda sumido e "Chamar para o próximo" (PR `feat/quem-anda-sumido`)

### Task 6: Presença e chamado (schema + core + db)

**Files:**

- Modify: `packages/db/src/schema/app.ts` (tabela `event_nudges`), migration (`pnpm db:generate`)
- Create: `packages/core/src/integration/attendance.ts` (+ `.test.ts`)
- Modify: `packages/db/src/services/integration.ts` (+ teste)

**Interfaces:**

- Produces:
  - Tabela `event_nudges(event_id → events cascade, user_id → user cascade, sent_by → user, created_at)`, PK `(event_id, user_id)`.
  - `attendanceSummary(input: { members: { userId: string; name: string; joinedAt: Date }[]; events: { startsAt: Date; confirmed: string[] }[] /* últimos 8 realizados, mais recente primeiro */; lastGame: Record<string, Date | null>; now: Date }): { userId: string; name: string; attended: number; of: number; lastGameAt: Date | null; awaySince: Date | null }[]` — `of` = encontros da janela depois da entrada da pessoa; `awaySince` ≠ null quando entrou há 30+ dias, não confirmou nenhum dos 4 mais recentes da janela (com pelo menos 1 encontro) e não joga há 30+ dias; vale a data mais recente entre última partida, último encontro confirmado e entrada. Ordem: sumidos primeiro (mais antigo primeiro), depois menor frequência, depois nome.
  - `getGroupAttendance(db, { groupId, userId, now? })` → `{ members, nextEvent: { id; title; startsAt } | null, nudged: string[] }` — só dono/admin (`forbidden`; não membro `not_found`).
  - `nudgeMember(db, { groupId, actorId, targetUserId, eventId })` — dono/admin; alvo membro; encontro do grupo, `scheduled` e futuro (senão `not_found`); repetido → `DomainError('conflict')`.

- [ ] **Step 1: Write the failing tests** — core: entrou há 10 dias nunca é sumido; faltou os 4 últimos mas jogou há 5 dias não é sumido; `of` conta só encontros depois da entrada. Db: membro comum → `forbidden`; segundo chamado → `conflict`; encontro cancelado ou de outro grupo → `not_found`.
- [ ] **Step 2: Run** `pnpm vitest run packages/core/src/integration packages/db/src/services/integration.test.ts` — Expected: FAIL
- [ ] **Step 3: Implement** schema, `pnpm db:generate`, core e serviços.
- [ ] **Step 4: Run** o mesmo — Expected: PASS
- [ ] **Step 5: Commit** `feat: presença do grupo e chamado para o próximo encontro`

### Task 7: Aviso "chamado" e rotas

**Files:**

- Modify: `apps/web/src/server/{email,push,notify}.ts` (tipo `'invite'`; público só da pessoa chamada), `packages/db/src/services/notifications.ts` (`audience: 'users'` com `userIds`), mensagens `email.invite.*` e `push.invite.*`
- Create: `apps/web/src/app/api/v1/groups/[groupId]/attendance/route.ts`, `apps/web/src/app/api/v1/groups/[groupId]/members/[userId]/nudge/route.ts`
- Modify: api-client (`groups.attendance`, `groups.nudge`), `autorizacao.test.ts`, `notify.test.ts`

**Interfaces:**

- Produces: `GET /groups/:groupId/attendance`; `POST /groups/:groupId/members/:userId/nudge` com `{ eventId }` → 204, e então `notifyEvent(db, { eventId, kind: 'invite', userIds: [userId] })` em segundo plano (`runAfterResponse`).

- [ ] **Step 1: Write the failing tests** — `notify.test.ts`: `invite` só para a pessoa chamada (push e e-mail, respeitando `emailNotifications`); autorização: não membro → 404, membro comum → 403 nas duas rotas, sem dados no corpo; segundo POST → 409.
- [ ] **Step 2: Run** `cd apps/web && npx vitest run src/server/notify.test.ts src/app/api/v1/__tests__/autorizacao.test.ts` — Expected: FAIL
- [ ] **Step 3: Implement**.
- [ ] **Step 4: Run** o mesmo — Expected: PASS
- [ ] **Step 5: Commit** `feat(api): presença e chamado para o próximo encontro`

### Task 8: Cartão "Quem anda sumido" (site e app)

**Files:**

- Create: `apps/web/src/components/attendance-card.tsx` (+ `.test.tsx`)
- Modify: `apps/web/src/app/(app)/grupo/page.tsx`, `apps/mobile/src/app/grupo.tsx`, mensagens (`group.attendance.*`), `i18n.ts`, `a11y.test.tsx`, `docs/ACCESSIBILITY.md`

- [ ] **Step 1: Write the failing test** (jsdom): tabela com `<caption>` e `th scope="col"` (Pessoa, Presença "5 de 8", Última partida); sumidos com o texto "sem aparecer há N semanas" (não só cor); botão "Chamar {nome} para o próximo" (nome no rótulo, WCAG 2.5.3) vira "Chamado" desabilitado após o envio e anuncia em `role="status"`; sem próximo encontro, sem botões e com a dica "Marque um encontro para poder chamar".
- [ ] **Step 2: Run** `cd apps/web && npx vitest run src/components/attendance-card.test.tsx` — Expected: FAIL
- [ ] **Step 3: Implement**: site só renderiza para dono/admin (a página já sabe o papel); 320 px sem rolagem horizontal (tabela vira lista no celular). App: mesmo cartão na tela do grupo para dono/admin.
- [ ] **Step 4: Run** o teste, `a11y.test.tsx`, `pnpm --filter mobile typecheck` — Expected: PASS
- [ ] **Step 5: Commit**; verificação completa; PR "Quem anda sumido e chamar para o próximo".
