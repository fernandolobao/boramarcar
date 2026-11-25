# Segurança e estabilidade

Auditoria de 20/11/2026: leitura do código inteiro (site, API, app, banco, infraestrutura e CI), sem
testes contra produção. Os achados graves foram conferidos no código, inclusive no do `better-auth`
instalado. Esta é a lista de tarefas: cada PR de correção marca o item com ✅ e traz o teste que
reproduz o problema.

**Resumo:** não há acesso indevido a dados de outros grupos pelas rotas com ID (todas passam por
serviço que confere grupo, loja, torneio ou dono), o SQL é sempre parametrizado, os e-mails escapam
HTML e não há segredos no repositório. Os problemas estão numa rota embutida do Better Auth que
ninguém tinha desligado, nas origens confiáveis do login, em limites de abuso e em gravações de várias
etapas sem transação.

## Ordem das correções

1. Conta e imagens (A1) ✅
2. Origens do login (A2, A3) ✅
3. Dados expostos (M1, M2, M3 e as baixas de dados) ✅
4. Abuso e negação de serviço (M4, M5 e as baixas de limite) ✅
5. Concorrência e atomicidade (M6, M7, M8) ✅
6. Estabilidade operacional (M9, M10, M11, M12) ✅
7. Endurecimento (o resto das baixas).

### ALTA

✅ **A1. Qualquer pessoa logada apaga a foto de outra pessoa ou o logo de uma loja.**

- O Better Auth expõe `POST /api/auth/update-user` (ativo; aceita `image` e `name` livres). A rota
  `DELETE /api/v1/me/avatar` apaga a imagem anterior com `deleteUploadedImage`, que só confere o domínio
  do Blob (`apps/web/src/server/uploads.ts:53`, `packages/core/src/images/index.ts:25`).
- Exploit: copiar a URL da foto da vítima (página do grupo) ou do logo (página da loja) →
  `update-user {"image": "<url>"}` → `DELETE /api/v1/me/avatar` → o servidor apaga o arquivo da vítima.
  Repetível para todos. A exclusão de conta faz o mesmo (`apps/web/src/app/api/v1/me/route.ts:28`).
- Efeitos extras: `image` vira qualquer URL externa → "pixel de rastreamento" (IP de quem abre o grupo;
  a CSP aplicada permite `img-src https:`); `name` sem limite de tamanho, que vai para e-mails e push de
  outras pessoas (texto enganoso / páginas enormes).
- **Corrigido:** `/update-user` desligado (`disabledPaths` em `apps/web/src/server/auth.ts`); no
  cadastro, o nome é limpo (sem controles, até 80 caracteres) e só fica foto do Google
  (`*.googleusercontent.com`, `apps/web/src/server/user-fields.ts`); `deleteUploadedImage` só apaga o
  arquivo em `avatars/<id da pessoa>/` ou `logos/<id da loja>/` (`isUploadOf` em
  `@boramarcar/core/images`). Testes: `server/auth.test.ts`, `server/uploads.test.ts`,
  `core/src/images/images.test.ts`.

✅ **A2. Padrão de previews confiável demais no login (`apps/web/src/server/trusted-origins.ts:33`).**

- `https://boramarcar-*-fernandolobaos-projects.vercel.app` (ativo em produção, com o OAuth proxy): o `*`
  aceita qualquer coisa, então um projeto/conta de terceiros na Vercel com nome que case (ex.: equipe
  `x-fernandolobaos-projects`) vira origem confiável → redirecionamento aberto depois do login e destino
  aceito pelo OAuth proxy (risco de levar a sessão para fora; depende do comportamento do proxy).
- **Corrigido:** `apps/web/src/server/auth-guard.ts` envolve a rota `/api/auth/*` e recusa (403)
  pedidos (parâmetros, corpo JSON, `Origin`) e redirecionamentos para qualquer `*.vercel.app` que não
  seja o endereço de deploy deste projeto (`boramarcar-<9 letras ou números>-fernandolobaos-projects`).
  Custo: o login nos previews funciona só pelo endereço de deploy, não pelo do branch. Teste:
  `server/auth-guard.test.ts`. (Domínio próprio para os previews foi descartado pelo custo.)

✅ **A3. Esquema antigo `boramarcar://` confiável no login do app (`trusted-origins.ts:27`, plugin Expo).**

- Depois do login, o plugin Expo põe a sessão no redirecionamento para o esquema do app. Um app malicioso
  no celular que registre `boramarcar://` (esquema antigo, provavelmente livre) recebe a sessão via um
  link de login preparado. O app ainda não foi publicado, então o esquema antigo não tem usuários.
- **Corrigido:** `boramarcar://` saiu das origens confiáveis (`trusted-origins.ts`). Decisão:
  `EXPO_GO_LOGIN=lan` continua possível em produção, porque o dono testa o app no Expo Go contra
  produção até as builds próprias; o risco (alguém na mesma rede Wi-Fi recebe a sessão por um link de
  login preparado) fica documentado: **ligue a variável só enquanto testa e desligue depois**. Com as
  builds de dezembro, a variável deixa de ser necessária. Plano futuro: links universais (https).

### MÉDIA

- ✅ **M1. Torneio de loja expõe nomes completos e IDs de conta a qualquer pessoa logada**
  (`packages/db/src/services/tournaments.ts` `loadTournament`/`buildView`): `GET /api/v1/tournaments/:id`
  de torneio de loja devolve `memberIds` e nomes completos, contrariando a página pública (só primeiro
  nome). Correção: quem não é equipe nem inscrito recebe a projeção de `getPublicTournament`.
  **Corrigido:** quem não é da equipe vê a projeção da página pública (primeiros nomes, sem IDs de conta), menos a própria inscrição, que precisa do ID para registrar a mesa (`anonymized` em `tournaments.ts`; teste em `store-tournaments.test.ts`).
- ✅ **M2. Retrospectiva do mês com endereço permanente** (`/retrospectiva/<groupId>/<mês>`): um link
  compartilhado abre todos os meses, para sempre, inclusive para quem saiu do grupo. Correção: token de
  compartilhamento por grupo, que dá para trocar (como o convite); endereço antigo só para membros.
  **Corrigido:** cada mês tem um código próprio no link (`?k=`, HMAC com o segredo do servidor, `server/monthly-link.ts`); sem o código, só quem é do grupo e está logado vê. O app pede o link com o código em `GET /api/v1/groups/:id/monthly-link`. Mais simples que um token por grupo e sem migration; o link de um mês continua valendo para sempre, mas só para aquele mês.
- ✅ **M3. Redirecionamento aberto em `/entrar?para=` e `/cadastro`** (`apps/web/src/lib/safe-callback.ts`):
  `/%09/site.com` passa no filtro e o navegador lê `//site.com`. Correção: rejeitar caracteres de
  controle e `\`, ou validar com `new URL(valor, base)` exigindo a mesma origem.
  **Corrigido:** `safeCallback` recusa caracteres de controle e `\` (também codificados) e confere a origem com `new URL` (`lib/safe-callback.test.ts`).
- ✅ **M4. Limite de tentativas do login fraco na Vercel** (`apps/web/src/server/auth.ts`): o Better Auth usa
  memória por instância → senha adivinhável e "bombardeio" de e-mails de verificação (`sendOnSignIn`).
  Correção: `rateLimit: { enabled: true, storage: 'database', customRules }` para entrar, cadastrar,
  redefinir senha e reenviar verificação.
  **Corrigido:** `rateLimit` do Better Auth com `customStorage` no contador do banco (`consumeRateLimit`), chave como HMAC; entrar 10/min, cadastro 10/h, reenvio de verificação e redefinição de senha 3 a cada 5 min, por IP; `get-session` fora (`server/auth.ts`, teste em `server/auth.test.ts`).
- ✅ **M5. Disponibilidade sem limite de datas trava a função** (`server/http.ts` `isoDate`;
  `packages/core/src/availability/recurring.ts:60` percorre dia a dia): um membro pede
  `from=-200000…&to=+200000…` e prende a CPU até estourar o tempo. Correção: datas entre ±5 anos de hoje
  e intervalo ≤ 120 dias nas rotas de disponibilidade e em `expandWeeklyRules`.
  **Corrigido:** `isoDate` só aceita 2000–2100 (`server/http.ts`) e `expandWeeklyRules` recusa intervalos acima de um ano (`MAX_RANGE_DAYS`).
- ✅ **M6. Inscrição em evento de loja passa da capacidade** (`store-events.ts:301`): conta e insere sem
  trava; duas inscrições na última vaga entram as duas; `promote` e `cancelStoreEntry` têm a mesma
  corrida; duplicata vira 500 (23505) em vez de 409. Correção: transação com `SELECT … FOR UPDATE` no
  evento; erro de chave única → `conflict` em `errorResponse`.
  **Corrigido:** inscrição, desistência e edição de vagas numa transação que trava o evento (`SELECT … FOR UPDATE`, `lockEvent`); inscrição repetida vira 409 (testes de concorrência em `store-events.test.ts`).
- ✅ **M7. Começar torneio não é atômico** (`tournaments.ts` `begin`/`startStoreTournament`): clique duplo
  começa duas vezes (500 por índice único); falha no meio deixa torneio "rodando" sem rodada ou com
  inscritos pela metade, e o evento da loja fica travado. Correção: transação + `UPDATE … WHERE
status='registration' RETURNING`; inscritos em lote.
  **Corrigido:** `begin` numa transação com `UPDATE … WHERE status = 'registration'`; o torneio de loja trava o evento e cria tudo numa transação, com os inscritos em lote (testes de clique duplo em `tournaments.test.ts` e `store-tournaments.test.ts`).
- ✅ **M8. Publicar aviso do ArcanaKin** (`announcements.ts:94`): um INSERT com uma linha por usuário quebra
  acima de ~16 mil pessoas (limite de parâmetros do Postgres); status vira "publicado" antes de gravar;
  clique duplo manda duas vezes. Correção: guarda no UPDATE, transação, lotes de 1.000.
  **Corrigido:** publicação numa transação com guarda de status; `addNotifications` grava em lotes de 1.000 (`announcements-scale.test.ts`, com 17 mil pessoas). E qualquer chave única repetida que escapar vira 409 em `errorResponse` (`isUniqueViolation`).
- ✅ **M9. Cron diário: uma falha derruba o resto do dia** (`app/api/cron/reminders/route.ts`): lembretes,
  métricas, novidades e retrospectivas em sequência; se uma tarefa falha, as outras não rodam (a
  retrospectiva do dia 1 se perde); métricas e novidades podem sair duas vezes. Correção: cada tarefa com
  seu `try/catch` e relatório; marcas "já enviado" por dia; retrospectiva recupera o mês se falhar no dia 1.
  **Corrigido:** cada tarefa do cron diário roda isolada (`runSteps` em `server/cron.ts`; a falha vai ao Sentry com o nome da tarefa e o cron é marcado como falho no fim); métricas e novidades saem uma vez por semana (`onceFor`, tabela `cron_runs`, migration 0039); a retrospectiva tenta do dia 1 ao 7 sem repetir.
- ✅ **M10. Pool do banco sem tratamento de erro** (`packages/db/src/client.ts`): sem `pool.on('error')`, uma
  conexão derrubada pelo Neon pode derrubar o processo; sem tempo limite de conexão e de consulta.
  Correção: `pool.on('error')`, `connectionTimeoutMillis`, `idleTimeoutMillis`, `statement_timeout`.
  **Corrigido:** `pool.on('error')`, `connectionTimeoutMillis` 5 s, `idleTimeoutMillis` 10 s e `statement_timeout` 15 s (`packages/db/src/client.ts`).
- ✅ **M11. Erros 500 da API não chegam ao Sentry e vazam parâmetros no log** (`server/http.ts:40`): só
  `console.error`; erros do Drizzle trazem os parâmetros da consulta (e-mails, nomes). Correção:
  `Sentry.captureException` e registrar só código/mensagem do erro do banco.
  **Corrigido:** `errorResponse` manda o erro ao Sentry e ao log sem a consulta nem os parâmetros (só o código e a mensagem do driver).
- ✅ **M12. "Usar minha localização" não funciona no site** (`next.config.ts`
  `Permissions-Policy: geolocation=()`): o próprio cabeçalho bloqueia a geolocalização. Correção:
  `geolocation=(self)`. (Defeito funcional do 10.3.)
  **Corrigido:** `geolocation=(self)` (`lib/security-headers.ts`), com E2E de localização simulada.

### BAIXA (endurecimento)

- ✅ Nomes de decks **privados** aparecem para o grupo na página do encontro e no resumo
  (`listDecksForUsers`/`getDeckCovers` ignoram a visibilidade). **Corrigido:** deck privado de outra pessoa sai da escolha de deck, da página do encontro, das estatísticas, dos recordes, do resumo e da retrospectiva (`hiddenDeckIds`/`withoutHiddenDecks`).
- ~~`getPublicTournament` ainda devolve o título e a data do encontro do grupo.~~ Não é problema: é o subtítulo da página pública, de propósito (o comentário do código é que estava errado e foi corrigido).
- Token de push pode ser "tomado" por quem o conhecer (`push.ts:17`) → recusar token de outra conta.
- 2HG: quem não organiza inscreve outra pessoa como dupla sem ela aceitar.
- ✅ CSP aplicada com `img-src https:` / `connect-src https:` → promover as listas exatas do modo relatório;
  rotas com ponto no caminho escapam da CSP (`proxy.ts:67` matcher); faltam `COOP`, `CORP`,
  `X-Frame-Options: DENY` e `preload` no HSTS. **Corrigido:** faltavam `X-Frame-Options: DENY` e `Cross-Origin-Opener-Policy: same-origin` (`lib/security-headers.ts`) e o `proxy.ts` deixava de fora qualquer endereço com ponto; agora a lista de estáticos é explícita. **Ainda em aberto:** promover as listas exatas de `img-src`/`connect-src` do modo relatório (esperar os relatórios de produção), `Cross-Origin-Resource-Policy` (pode afetar imagens nos e-mails) e `preload` no HSTS (decisão do dono: compromete o domínio na lista dos navegadores).
- ✅ Upload: conferir o formato real com `sharp().metadata()` (hoje confia no tipo enviado), baixar
  `limitInputPixels` para ~25M.
- ✅ `.ics`: `\r` solto não é escapado (`packages/core/src/calendar/index.ts:26`). **Corrigido:** `\r` solto vira `\n` escapado.
- ✅ Código do balcão com `Math.random` → `crypto.getRandomValues` (`packages/core/src/stores/index.ts:69`).
- ✅ `places/locate` (Nominatim) e coleção (Scryfall) sem limite de uso; `scryfallId` sem validar UUID. **Corrigido:** limite `search` nas duas; o ID aceita só letras, números e hífen (`scryfallIdSchema`), porque os testes e o seed usam IDs que não são UUID.
- ✅ `csp-report` lê o corpo inteiro sem `Content-Length`.
- ✅ Hash do IP no limite de uso sem segredo (HMAC). — ✅ Nomes de deck importado: espaços juntados e até 120 caracteres (`saveImportedDeck`).
- ✅ Busca da descoberta sem limite superior de data/linhas no SQL; índices faltando (lembretes, limpeza de
  `rate_limits`, `notifications(group_id, kind)`); notificações sem limpeza das antigas. **Corrigido:** janela de datas e `limit(500)` no SQL; índices `events_reminder_due_idx` (parcial), `rate_limits_window_start_idx` e `notifications_group_kind_idx` (migration 0040); notificações lidas há mais de 180 dias saem no cron diário (`purgeOldNotifications`).
- ✅ `SKIP_ENV_VALIDATION` em produção usaria segredo fixo → falhar se `VERCEL_ENV=production`. **Corrigido:** `getEnv` recusa subir com ela em produção.
- Migrations rodam em dois lugares (build da Vercel e workflow) → manter um só.
- GitHub Actions de terceiros por tag (fixar por SHA).
- App: convite pendente entra no grupo sozinho depois do login (mostrar a confirmação).
- Sessão revogada vale até 5 min (cache do cookie) — aceitável, documentar.

### Verificado e OK

Admin (`ADMIN_EMAILS` + e-mail verificado; troca de e-mail desligada) · vínculo do Google exige e-mail
local verificado · IDs aleatórios (UUID) · códigos de convite e de loja fortes · SQL só parametrizado ·
`LIKE` com entrada normalizada/escapada · e-mails com `escapeHtml` · sem SSRF (hosts fixos, tempo e
tamanho limitados) · `dangerouslySetInnerHTML` só com conteúdo seguro · links da loja validados ·
cron fecha sem segredo, comparação em tempo constante · Sentry sem IP/cookies · erro 500 genérico ·
segredos fora do repositório · app guarda sessão no SecureStore e só abre rotas internas por push ·
exclusão de conta apaga sessões, push, vínculo do Google.
