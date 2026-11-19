# Descoberta de lojas e eventos por cidade (10.3) — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** quem procura onde jogar ou comprar cartas acha lojas e eventos perto da sua cidade (ou da sua localização), numa página pública e indexável, no site e no app.

**Architecture:** municípios do IBGE numa tabela (`municipalities`); loja e pessoa apontam para um município; a busca calcula distância (haversine) no Postgres a partir do centro da cidade ou da posição do aparelho (arredondada, nunca guardada). Páginas públicas `/lojas` e `/lojas/em/<uf>/<cidade>`; API pública com limite por IP para o app.

**Tech Stack:** pnpm/Turborepo, Next.js 16 + next-intl, Drizzle/Postgres (PGlite nos testes), Expo + `@boramarcar/api-client`, `expo-location`.

**Spec:** `docs/superpowers/specs/2026-11-19-descoberta-lojas-design.md`

## Global Constraints

- Raio padrão **50 km**; janela de eventos **30 dias**; posição do aparelho arredondada a **2 casas decimais** e nunca gravada (banco, log, Sentry).
- "O que a loja oferece": exatamente `singles`, `sealed`, `play_space`, `tournaments`.
- `/lojas/em/<uf>/<cidade>` só existe para municípios **com loja própria**; o caminho `em` fica reservado para lojas.
- Eventos e encontros de grupo nunca aparecem; eventos mostram vagas em números, nunca nomes.
- Regras do repositório (CLAUDE.md): textos em `messages/pt-BR.json` **e** `en.json` (e `apps/mobile/src/lib/i18n.ts`); rota com ID na URL entra em `autorizacao.test.ts`; página nova em `e2e/a11y.spec.ts`; ajuda, novidade (`packages/core/src/changelog`), `docs/ACCESSIBILITY.md`; `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test` (e E2E quando há UI) antes de cada PR; mudou o schema → `pnpm db:generate`.
- Três PRs, nesta ordem: **PR 1** = Tasks 1–3; **PR 2** = Tasks 4–6; **PR 3** = Tasks 7–8.

## Review Focus

1. Loja sem município confirmado (ou sem coordenadas e sem município) → fica fora da busca, sem erro. (Task 4)
2. Loja de outra cidade dentro do raio aparece (Osasco → loja em São Paulo); loja a 51 km não aparece. (Task 4)
3. Evento cancelado, já começado ou depois de 30 dias não aparece; evento de grupo nunca. (Task 4)
4. Busca de cidade com acento e caixa diferentes ("sao jose" acha "São José") e homônimos em UFs diferentes aparecem separados. (Task 2)
5. Coordenadas inválidas (NaN, fora de −90..90/−180..180) → 400, não 500. (Task 5)

---

## PR 1 — Municípios e dados da loja

### Task 1: Regras puras (distância, ofertas, slug)

**Files:**

- Create: `packages/core/src/discovery/index.ts`, `packages/core/src/discovery/discovery.test.ts`
- Modify: `packages/core/package.json` (export `./discovery`), `packages/core/src/stores/index.ts` (`RESERVED_STORE_SLUGS`)

**Interfaces — Produces:**

- `DISCOVERY_RADIUS_KM = 50`, `DISCOVERY_DAYS = 30`
- `STORE_OFFERS = ['singles','sealed','play_space','tournaments'] as const`; `type StoreOffer`; `isStoreOffer(v: string): v is StoreOffer`
- `distanceKm(a: {lat:number;lng:number}, b: {lat:number;lng:number}): number` (haversine, raio da Terra 6371 km)
- `boundingBox(center, radiusKm): { minLat; maxLat; minLng; maxLng }`
- `roundCoord(value: number): number` (2 casas)
- `validCoords(lat: unknown, lng: unknown): {lat:number;lng:number} | null`
- `municipalitySlug(name: string): string` ("São José dos Pinhais" → `sao-jose-dos-pinhais`)
- `RESERVED_STORE_SLUGS = ['em']`

- [ ] **Step 1: testes** — `distanceKm` Curitiba (−25.4284, −49.2733) ↔ São José dos Pinhais (−25.5302, −49.2064) entre 12 e 14 km; mesmo ponto = 0. `boundingBox` contém um ponto a 49 km e não um a 60 km na mesma latitude. `roundCoord(-25.42841)` = −25.43. `validCoords(91, 0)`, `validCoords(NaN, 0)`, `validCoords('x', 0)` = null. `municipalitySlug("Santa Bárbara d'Oeste")` = `santa-barbara-d-oeste`. `isStoreOffer('sealed')` true, `'cafe'` false.
- [ ] **Step 2:** `cd packages/core && npx vitest run src/discovery` → FAIL (módulo não existe).
- [ ] **Step 3:** implementar.
- [ ] **Step 4:** mesmo comando → PASS.
- [ ] **Step 5:** commit `feat(core): regras de distância e ofertas da descoberta (10.3)`.

### Task 2: Tabela de municípios e busca de cidade

**Files:**

- Create: `packages/db/src/schema/municipalities.ts`, `packages/db/data/municipios.csv`, `packages/db/scripts/municipios-sql.ts`, migration custom (`pnpm --filter @boramarcar/db exec drizzle-kit generate --custom --name municipios`), `packages/db/src/services/municipalities.ts`, `packages/db/src/services/municipalities.test.ts`
- Modify: `packages/db/src/schema/index.ts`, `packages/db/src/index.ts`

**Interfaces — Produces:**

- tabela `municipalities`: `code text pk` (IBGE, 7 dígitos), `name`, `uf` (2 letras), `slug`, `lat double`, `lng double`; índice único (`uf`,`slug`).
- `searchMunicipalities(db, { query: string; limit?: number = 10 }): Promise<{ code; name; uf; slug }[]>` — compara pelo `municipalitySlug(query)` como prefixo do `slug` (sem acento, sem caixa); capitais e cidades com loja primeiro, depois ordem alfabética.
- `getMunicipality(db, { uf: string; slug: string })` e `getMunicipalityByCode(db, code)` → linha ou `null`.

- [ ] **Step 1: licença dos dados.** Conferir o `LICENSE` de `kelvins/municipios-brasileiros` (arquivo `csv/municipios.csv`: `codigo_ibge,nome,latitude,longitude,capital,codigo_uf,…`). Se for permissiva (MIT/CC0/CC BY), usar e anotar a atribuição em `docs/ARCHITECTURE.md`; se não, parar e avisar o dono (alternativa do spec: centro calculado das malhas do IBGE, CC BY 4.0). Gravar `packages/db/data/municipios.csv` com `code,name,uf,lat,lng` (UF pela tabela `codigo_uf` → sigla do IBGE). Conferir 5.570 linhas.
- [ ] **Step 2:** script `municipios-sql.ts` gera os `INSERT` (em lotes de 500) na migration custom; slug por `municipalitySlug`. Rodar e conferir que a migration aplica no PGlite.
- [ ] **Step 3: testes** — `searchMunicipalities({query:'sao jose'})` traz "São José" (SC) e "São José dos Pinhais" (PR), e homônimos de UFs diferentes aparecem como itens separados; `query:'CURIT'` traz Curitiba/PR primeiro; `getMunicipality({uf:'pr',slug:'curitiba'})` acha (uf sem caixa); `getMunicipality({uf:'xx',slug:'curitiba'})` = null.
- [ ] **Step 4:** `cd packages/db && npx vitest run src/services/municipalities.test.ts` → FAIL; implementar; → PASS. Conferir que o tempo do `createTestDb` não passou de ~1 s a mais.
- [ ] **Step 5:** commit `feat(db): municípios do IBGE e busca de cidade (10.3)`.

### Task 3: Loja com município e "o que oferece"

**Files:**

- Modify: `packages/db/src/schema/stores.ts` (`municipalityCode text references municipalities.code`, `offers jsonb string[] default []`), migration gerada + passo SQL de migração das lojas atuais (casar `city` por `municipalitySlug(city)` quando o slug é único no país; senão `null`), `packages/db/src/services/stores.ts`, `packages/db/src/services/stores.test.ts`, `packages/core/src/stores/index.ts` (slug reservado), rota `apps/web/src/app/api/v1/municipalities/route.ts` (pública, `consumeRateLimit(db, \`municipalities:${await clientKey(req)}\`, RATE_LIMITS.search)`), `apps/web/src/components/places/city-picker.tsx` (combobox), admin (`apps/web/src/components/stores/*`criação),`StoreProfileForm` (cidade + quatro Checkbox de ofertas), mensagens pt/en, ajuda (eventos/lojas), changelog, ACCESSIBILITY, a11y.test.

**Interfaces:**

- Consumes: `searchMunicipalities`, `getMunicipalityByCode` (Task 2); `STORE_OFFERS`, `RESERVED_STORE_SLUGS` (Task 1).
- Produces: `createStore(db, { name; municipalityCode; email; createdBy })` (grava `city` = nome do município, para exibição); `updateStore(..., { municipalityCode?: string; offers?: string[] })` (valida município existente e ofertas por `isStoreOffer`); `getStorePublic` passa a trazer `municipality: { code; name; uf; slug } | null` e `offers`; `listStoresForAdmin` traz `municipality` (nulo = "cidade a confirmar"). `GET /api/v1/municipalities?q=` → `{ municipalities: [...] }`.

- [ ] **Step 1: testes (db)** — criar loja com `municipalityCode` de Curitiba grava `city: 'Curitiba'`; município inexistente → `invalid_input`; `updateStore` com `offers: ['singles','cafe']` → `invalid_input`; com `['singles','play_space']` grava; loja chamada "Em" ganha slug diferente de `em`; migração: loja com `city: 'curitiba'` casa com 4106902, com `city: 'São José'` (homônimo) fica `null`.
- [ ] **Step 2:** FAIL; implementar; `pnpm db:generate`; PASS.
- [ ] **Step 3: UI** — `CityPicker` (rótulo visível, lista de sugestões com nome e UF, teclado), usado no criar loja do admin e no "Gerenciar a loja"; ofertas como quatro `Checkbox` num `fieldset` com `legend`. Teste de componente do `CityPicker` (digitar → sugestões → escolher) e entrada no `a11y.test.tsx`. Caso novo de rota pública sem ID: não entra no `autorizacao.test.ts`.
- [ ] **Step 4:** `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test`, build e E2E completo (`e2e/lojas.spec.ts`: ajustar a criação da loja para escolher a cidade). Seed do E2E: lojas com `municipalityCode`.
- [ ] **Step 5:** commit, PR 1 (descrição: municípios, licença e atribuição, migração das lojas e o que fica "a confirmar" no admin).

## PR 2 — Busca e páginas públicas

### Task 4: Busca no banco

**Files:** Create `packages/db/src/services/discovery.ts`, `packages/db/src/services/discovery.test.ts`; Modify `packages/db/src/index.ts`.

**Interfaces — Produces:**

- `findNearby(db, { lat: number; lng: number; radiusKm?: number; days?: number; now?: Date; formats?: string[]; kinds?: ('tournament'|'casual')[]; offers?: StoreOffer[] }): Promise<{ events: NearbyEvent[]; stores: NearbyStore[] }>`
  - `NearbyEvent = { id; title; startsAt; format; kind; capacity: number|null; registered: number; waitlist: number; distanceKm: number; store: { name; slug; municipality: { name; uf } } }` — agendados, `startsAt` entre `now` e `now + days`, de lojas no raio; ordem: data, depois distância.
  - `NearbyStore = { id; slug; name; logoUrl; verified; offers; formats; distanceKm; municipality: { name; uf; slug }; nextEvent: { id; title; startsAt } | null }` — ordem: distância.
  - Posição da loja: `lat/lng` da loja ou, sem elas, o centro do município; loja sem município e sem coordenadas fica de fora. Filtro prévio por `boundingBox`, depois haversine em SQL; `distanceKm` com 1 casa.
- `citiesWithStores(db): Promise<{ name; uf; slug; stores: number }[]>` (para o sitemap e a lista de cidades)
- `nearestCitiesWithStores(db, { lat; lng; limit = 5 })`

- [ ] **Step 1: testes** — (Review Focus 1–3) loja em São Paulo aparece a partir do centro de Osasco; loja a ~51 km não; loja sem município e sem coordenadas não aparece (sem erro); loja sem coordenadas usa o centro do município; evento cancelado, evento que já começou, evento a 31 dias e evento de grupo não aparecem; filtros `formats`, `kinds`, `offers`; `registered`/`waitlist` sem nomes; `citiesWithStores` só com municípios de loja própria.
- [ ] **Step 2:** FAIL; implementar; PASS.
- [ ] **Step 3:** commit `feat(db): busca de lojas e eventos por perto (10.3)`.

### Task 5: API pública e "Adicionar à agenda"

**Files:** Create `apps/web/src/app/api/v1/discovery/route.ts`, `apps/web/src/app/api/v1/store-events/[eventId]/ics/route.ts`, testes de rota em `apps/web/src/app/api/v1/__tests__/descoberta.test.ts`; Modify `apps/web/src/server/limits.ts` (`discovery: { limit: 60, windowMs: MINUTE }`), `packages/core/src/calendar` (reuso de `buildIcs`).

**Interfaces:**

- `GET /api/v1/discovery?city=<uf>/<slug>` ou `?lat=&lng=` (+ `formats`, `kinds`, `offers` separados por vírgula) → `{ origin: { kind: 'city'|'device'; city?: {name;uf;slug} }, events, stores }`. Sem login; limite por IP (`clientKey`); `lat/lng` passam por `validCoords` e `roundCoord`; nada de log da posição; `Cache-Control: public, s-maxage=300` só para `?city=`.
- `GET /api/v1/store-events/:id/ics` → `text/calendar`, sem login, só evento agendado (senão 404); `uid` estável por evento, `url` para a página do evento.

- [ ] **Step 1: testes** — (Review Focus 5) `lat=NaN`, `lat=91`, `lng=200` → 400; cidade inexistente → 404; sem `city` nem `lat/lng` → 400; resposta com `events`/`stores`; `.ics` de evento cancelado → 404; `.ics` válido contém `BEGIN:VCALENDAR` e o título.
- [ ] **Step 2:** FAIL; implementar; PASS. Commit.

### Task 6: Páginas `/lojas` e `/lojas/em/<uf>/<cidade>`

**Files:** Create `apps/web/src/app/lojas/page.tsx`, `apps/web/src/app/lojas/em/[uf]/[cidade]/page.tsx`, `apps/web/src/components/discovery/*` (lista de eventos, lista de lojas, filtros com `aria-pressed`, botão "Usar minha localização" com região de status), `apps/web/src/server/discovery-city.ts` (cookie `ak_cidade` = `<uf>/<slug>`, `SameSite=Lax`, 1 ano, só a cidade); Modify `apps/web/src/app/sitemap.ts` (`/lojas` e cada cidade de `citiesWithStores`), `apps/web/src/server/seo.ts` (seção `discovery`, `index: true` nessas páginas), página do evento de loja (botões ".ics" e Google Agenda), mensagens pt/en, política de privacidade (cookie da cidade; localização só no momento), ajuda, changelog, ACCESSIBILITY, `e2e/a11y.spec.ts`, `e2e/descoberta.spec.ts`, seed do E2E (2 lojas em municípios vizinhos com eventos).

**Interfaces — Consumes:** `findNearby`, `citiesWithStores`, `nearestCitiesWithStores` (Task 4); `CityPicker` (Task 3).

- [ ] **Step 1: E2E (falha antes)** — sem login: `/lojas/em/pr/curitiba` mostra os eventos e as lojas do seed com distância, filtro de formato reduz a lista, "Adicionar à agenda" baixa um `.ics`; `/lojas/em/pr/<município sem loja>` → 404; `/lojas` sem cookie pede a cidade e, depois de escolher, guarda o cookie (recarregar mantém); `sitemap.xml` contém `/lojas/em/pr/curitiba`; meta `robots` sem `noindex`; JSON-LD `Store`/`Event` presente.
- [ ] **Step 2:** implementar. "Usar minha localização": `navigator.geolocation` só no clique, coordenadas arredondadas no cliente antes de chamar a API; erro de permissão em texto na região de status.
- [ ] **Step 3:** checagens completas + build + E2E completo. Commit; PR 2.

## PR 3 — Perfil e app

### Task 7: Cidade no perfil (site) e LGPD

**Files:** Modify `packages/db/src/schema/auth.ts` (`user.municipalityCode`), migration, `packages/db/src/services/users.ts` (`getUserPreferences`/`updateUserPreferences` com `municipalityCode`), `packages/db/src/services/privacy.ts` (exportação traz a cidade; exclusão a limpa), `ProfileForm` (CityPicker), `/lojas` usa a cidade do perfil (com "salvar no perfil?" ao trocar), política, testes de db (preferências, exportação, exclusão) e de componente.

- [ ] Testes → FAIL → implementar → PASS → checagens → commit.

### Task 8: App

**Files:** `npx expo install expo-location` (plugin no `app.json` com `locationWhenInUsePermission` em pt explicando que a posição não é guardada); `packages/api-client` (`discovery.near({ city } | { lat, lng }, filters)`, `municipalities.search(q)`, `me.setCity(code|null)`, schemas e testes); `apps/mobile/src/app/lojas/index.tsx` (tela "Lojas e eventos"), atalho em Conta e no painel, cidade em Conta; i18n pt/en; regenerar rotas tipadas do Expo.

- [ ] Testes do cliente → FAIL → implementar → PASS → `pnpm typecheck && pnpm lint` → commit; PR 3 (avisar que a tela não foi vista num aparelho; entra no roteiro do ensaio, `docs/ENSAIO-BETA.md`).
