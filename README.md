# Bora Marcar

> Organize os encontros de **Magic: The Gathering — Commander** do seu grupo: quem pode jogar, quando, onde, quem ganhou e com qual deck.

[![CI](https://github.com/fernandolobao/boramarcar/actions/workflows/ci.yml/badge.svg)](https://github.com/fernandolobao/boramarcar/actions/workflows/ci.yml)

O Bora Marcar nasceu para acabar com a enquete no grupo do WhatsApp. Cada jogador marca os dias, horários e locais em que pode jogar; o app encontra as janelas em que uma mesa de 4 fecha, transforma a janela em um encontro, registra as partidas e mantém um ranking. Os jogadores também cadastram seus decks (importando do Archidekt, do Moxfield ou colando a lista), marcam quais cartas são proxies e recebem uma análise do deck.

Hoje é uma aplicação web (Next.js na Vercel). Os apps Android e iOS estão planejados e vão reaproveitar a mesma API e as mesmas regras de domínio — veja o [roadmap](docs/ROADMAP.md).

## Funcionalidades

| Funcionalidade                                                                                                                             | Status                        |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------- |
| Login com Google                                                                                                                           | ✅                            |
| Grupos com **link e QR Code de convite** e locais de jogo                                                                                  | ✅                            |
| Disponibilidade por dia/horário/local e **sugestão automática de horários** para a mesa                                                    | ✅                            |
| Encontros com confirmação de presença, edição, cancelamento e finalização                                                                  | ✅                            |
| Compartilhar encontro no **WhatsApp** e adicionar à agenda (`.ics`)                                                                        | ✅                            |
| Fuso horário por usuário (detectado no navegador) e escolha de idioma                                                                      | ✅                            |
| Registro de partidas (vencedor, empate, deck usado)                                                                                        | ✅                            |
| Ranking de vitórias, derrotas, empates e pontos                                                                                            | ✅                            |
| Importação de decks: Archidekt, Moxfield (experimental) e lista em texto                                                                   | ✅                            |
| Dados de cartas via Scryfall com cache local                                                                                               | ✅                            |
| Marcação de **proxies** por carta                                                                                                          | ✅                            |
| Análise do deck: nota, curva de mana, cores, funções (ramp/compra/remoção/wipes), validação de Commander e sugestões com busca no Scryfall | ✅ (heurística inicial)       |
| Interface em pt-BR com i18n pronto (en incluído)                                                                                           | ✅                            |
| Mostrar o deck de cada jogador nas partidas do evento                                                                                      | ✅ (registro opcional)        |
| Disponibilidade recorrente, notificações, temporadas, substituições de cartas, apps mobile…                                                | 🗺️ [roadmap](docs/ROADMAP.md) |

## Stack

| Camada    | Escolha                                                           | Por quê                                                                           |
| --------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Linguagem | TypeScript (strict) em tudo                                       | Tipos de ponta a ponta, do banco à UI                                             |
| Monorepo  | pnpm workspaces + Turborepo                                       | `packages/core` será compartilhado com o app mobile                               |
| Web       | Next.js 16 (App Router, React 19, Server Components)              | Deploy nativo na Vercel; API REST em route handlers                               |
| Banco     | **Neon Postgres** (serverless)                                    | Plano gratuito, integração nativa no Vercel Marketplace, branches de banco por PR |
| ORM       | Drizzle ORM + drizzle-kit                                         | Leve, tipado, migrations em SQL versionadas                                       |
| Auth      | Better Auth (Google OAuth)                                        | Sessões no próprio banco; tem plugin para Expo (mobile)                           |
| i18n      | next-intl                                                         | pt-BR padrão, inglês incluído                                                     |
| Estilo    | Tailwind CSS v4                                                   |                                                                                   |
| Validação | Zod 4                                                             | Entrada da API e respostas de APIs externas                                       |
| Testes    | Vitest, PGlite (Postgres em memória), Testing Library, Playwright | Testes de integração com Postgres real sem Docker                                 |
| CI        | GitHub Actions                                                    | Lint, formatação, tipos, testes, cobertura, migrations, build e E2E em cada PR    |

## Estrutura

```
boramarcar/
├── apps/
│   └── web/                  # Next.js: páginas, API REST (/api/v1), auth, i18n
│       ├── messages/         # traduções (pt-BR.json, en.json)
│       ├── e2e/              # testes Playwright
│       └── src/
│           ├── app/          # rotas (App Router) e route handlers da API
│           ├── components/   # componentes React
│           ├── i18n/         # configuração do next-intl
│           ├── lib/          # código de cliente (fetch da API, auth client)
│           └── server/       # auth, db, sessão, helpers HTTP (somente servidor)
├── packages/
│   ├── core/                 # regras de domínio puras (sem banco): disponibilidade,
│   │                         # ranking, importadores de deck, Scryfall, análise de deck
│   └── db/                   # schema Drizzle, migrations e serviços de dados
│       └── drizzle/          # migrations SQL geradas
├── docs/                     # ROADMAP.md, ARCHITECTURE.md
└── .github/                  # workflows de CI, dependabot, templates
```

Detalhes em [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Rodando localmente

Pré-requisitos: **Node 22+**, **pnpm 10** (`corepack enable`) e um Postgres (Docker ou um branch de desenvolvimento no Neon).

```bash
git clone https://github.com/fernandolobao/boramarcar.git
cd boramarcar
pnpm install

# 1. Banco local (ou use a URL de um branch "dev" do Neon)
docker compose up -d

# 2. Variáveis de ambiente
cp apps/web/.env.example apps/web/.env.local
#   preencha GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET e gere o segredo:
#   openssl rand -base64 32

# 3. Migrations
DATABASE_URL=postgres://boramarcar:boramarcar@localhost:5432/boramarcar pnpm db:migrate

# 4. App em http://localhost:3000
pnpm dev
```

### Variáveis de ambiente

| Variável                                    | Descrição                                                                                |
| ------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `DATABASE_URL`                              | URL do Postgres. Na Vercel, use a URL **pooled** do Neon (`...-pooler...`).              |
| `BETTER_AUTH_SECRET`                        | Segredo aleatório com 32+ caracteres (`openssl rand -base64 32`).                        |
| `BETTER_AUTH_URL`                           | URL pública do app (ex.: `https://boramarcar.vercel.app`). Se ausente, usa `VERCEL_URL`. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Credenciais OAuth do Google Cloud.                                                       |
| `SKIP_ENV_VALIDATION`                       | `1` para build/testes sem segredos reais (usado na CI).                                  |

### Scripts

| Comando                                        | O que faz                                                   |
| ---------------------------------------------- | ----------------------------------------------------------- |
| `pnpm dev`                                     | Sobe o app em modo desenvolvimento                          |
| `pnpm build`                                   | Build de produção                                           |
| `pnpm test`                                    | Testes unitários e de integração (Vitest)                   |
| `pnpm test:coverage`                           | Testes com relatório de cobertura (com limites mínimos)     |
| `pnpm test:e2e`                                | Testes ponta a ponta (Playwright) — rode `pnpm build` antes |
| `pnpm lint` / `pnpm format` / `pnpm typecheck` | Qualidade de código                                         |
| `pnpm db:generate`                             | Gera migration SQL a partir do schema                       |
| `pnpm db:migrate`                              | Aplica migrations no `DATABASE_URL`                         |
| `pnpm db:studio`                               | Abre o Drizzle Studio                                       |

## Testes

- **Unitários** (`packages/core`): algoritmo de janelas de disponibilidade, ranking e validação de partidas, parser de listas, importadores Archidekt/Moxfield, cliente Scryfall (com `fetch` simulado) e análise de deck.
- **Integração** (`packages/db`): serviços rodando contra um **Postgres em memória (PGlite)** com as migrations reais aplicadas — grupos, disponibilidade, eventos, partidas, ranking, decks e proxies, incluindo regras de permissão.
- **Integração da API** (`apps/web`): os route handlers são chamados como o Next faria, com sessão simulada e PGlite, cobrindo o fluxo completo (criar grupo → disponibilidade → sugestão → evento → partida → ranking) e a importação de decks com Archidekt/Scryfall simulados.
- **Componentes**: Testing Library (jsdom) para a análise de deck.
- **E2E** (`apps/web/e2e`): Playwright contra o build de produção — página inicial, redirecionamentos de rotas protegidas, API sem sessão e idioma.

## Integração contínua

Em cada pull request (`.github/workflows/ci.yml`):

1. **Qualidade** — Prettier, ESLint e TypeScript.
2. **Testes** — Vitest com cobertura (falha abaixo dos limites) e resumo no PR.
3. **Migrations** — verifica se a migration foi gerada para o schema atual e aplica tudo em um Postgres 17 real.
4. **Build e E2E** — `next build` e Playwright.

Recomendado: em _Settings → Branches_, proteger a `main` exigindo esses checks antes do merge.

O workflow `migrate.yml` aplica as migrations no banco de produção quando elas mudam na `main` (requer o secret `DATABASE_URL` no environment `production`).

## Deploy na Vercel

1. **Importe o repositório** na Vercel e defina **Root Directory = `apps/web`** (a Vercel detecta o pnpm workspace).
2. **Banco**: em _Storage → Marketplace_, adicione **Neon** (plano free) e conecte ao projeto — `DATABASE_URL` é criada automaticamente. Escolha a região `sa-east-1` (São Paulo), a mesma das funções (`gru1`, ver `apps/web/vercel.json`).
3. **Google OAuth**: no [Google Cloud Console](https://console.cloud.google.com/apis/credentials), crie um _OAuth Client ID_ (Web) com:
   - Origem autorizada: `https://SEU-DOMINIO`
   - URI de redirecionamento: `https://SEU-DOMINIO/api/auth/callback/google` (e `http://localhost:3000/api/auth/callback/google` para desenvolvimento)
4. **Variáveis** na Vercel: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.
5. **Migrations**: rodam automaticamente no build de produção (`apps/web/scripts/vercel-build.sh`), usando `DATABASE_URL_UNPOOLED` (criada pela integração do Neon) ou `DATABASE_URL`. Se a migration falhar, o deploy falha e a versão anterior continua no ar. Em previews, só migram com `MIGRATE_ON_BUILD=1` (use apenas com um branch do Neon por preview).

> Deploys de preview usam URLs diferentes a cada PR; o login do Google só funciona nas URLs cadastradas. Veja o item correspondente no roadmap.

## API

Todas as rotas exigem sessão (cookie do Better Auth; no mobile, bearer token — planejado) e respondem JSON. Erros seguem o formato `{ "error": { "code": "invalid_input" | "unauthorized" | "forbidden" | "not_found" | "conflict" | "upstream_error", "message": "..." } }`.

| Método       | Rota                                           | Descrição                                                                |
| ------------ | ---------------------------------------------- | ------------------------------------------------------------------------ |
| `GET/POST`   | `/api/v1/groups`                               | Listar / criar grupos                                                    |
| `POST`       | `/api/v1/groups/join`                          | Entrar com código de convite                                             |
| `POST`       | `/api/v1/groups/:groupId/invite`               | Gerar novo código de convite (dono/admin)                                |
| `GET`        | `/api/v1/groups/:groupId/members`              | Membros                                                                  |
| `GET/POST`   | `/api/v1/groups/:groupId/locations`            | Locais de jogo                                                           |
| `GET/POST`   | `/api/v1/groups/:groupId/availability`         | Disponibilidade (`?from&to`)                                             |
| `GET`        | `/api/v1/groups/:groupId/availability/windows` | Janelas sugeridas (`?minPlayers=4&minDurationMinutes=120`)               |
| `DELETE`     | `/api/v1/availability/:slotId`                 | Remover disponibilidade própria                                          |
| `GET/POST`   | `/api/v1/groups/:groupId/events`               | Encontros (`?when=upcoming\|past`)                                       |
| `GET`        | `/api/v1/events/:eventId`                      | Encontro com participantes e partidas                                    |
| `PATCH`      | `/api/v1/events/:eventId`                      | Editar encontro ou mudar status (`scheduled`, `cancelled`, `finished`)   |
| `GET`        | `/api/v1/events/:eventId/ics`                  | Arquivo iCalendar do encontro                                            |
| `PUT`        | `/api/v1/events/:eventId/rsvp`                 | Confirmar presença                                                       |
| `POST`       | `/api/v1/events/:eventId/games`                | Registrar partida                                                        |
| `DELETE`     | `/api/v1/games/:gameId`                        | Remover partida                                                          |
| `GET`        | `/api/v1/groups/:groupId/ranking`              | Ranking (`?from&to`)                                                     |
| `GET/POST`   | `/api/v1/decks`                                | Listar / importar deck (`{kind:"url",url}` ou `{kind:"text",name,text}`) |
| `GET/DELETE` | `/api/v1/decks/:deckId`                        | Deck com análise / remover                                               |
| `PATCH`      | `/api/v1/decks/:deckId/cards/:cardId`          | Marcar proxy (`{isProxy}`)                                               |
| `PUT`        | `/api/v1/me/active-group`                      | Trocar grupo ativo                                                       |
| `GET/PUT`    | `/api/v1/me/preferences`                       | Fuso horário e idioma (`{timeZone, locale}`)                             |
| `GET`        | `/api/health`                                  | Health check                                                             |

## Contribuindo

1. Crie uma branch a partir da `main` (`feat/...`, `fix/...`).
2. Mantenha as regras de negócio em `packages/core` (puras e testadas) e o acesso a dados em `packages/db/src/services`.
3. Mudou o schema? `pnpm db:generate` e faça commit da migration.
4. Textos novos vão em `apps/web/messages/pt-BR.json` **e** `en.json` (há teste que garante as mesmas chaves).
5. Abra o PR — a CI precisa passar.

## Créditos e avisos

Dados de cartas fornecidos pela [Scryfall](https://scryfall.com/docs/api). Importação de decks do [Archidekt](https://archidekt.com/) e [Moxfield](https://moxfield.com/). A análise de deck se inspira em ferramentas como o [mythic.tools](https://mythic.tools/).

Bora Marcar é um projeto de fãs e não é afiliado à Wizards of the Coast. Magic: The Gathering é marca registrada da Wizards of the Coast LLC.
