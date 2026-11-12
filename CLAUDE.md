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

## Fluxo de trabalho (branches, PRs e CI)

- **Antes de qualquer push num branch existente, confira se o PR dele ainda está aberto.** PR mergeado ou fechado = branch novo a partir da `main` atualizada e PR novo. Nunca empurre commits para um branch já mergeado.
- Cada trabalho novo começa num branch novo a partir da `main` atualizada (`feat/…`, `fix/…`, `ci/…`, `docs/…`). Um assunto por PR. Se um PR depende de outro ainda aberto, diga isso no topo da descrição ("faça o merge do #N antes").
- Antes de criar o branch, confira se ele já não existe no remoto.
- Descrição do PR: o que muda, acessibilidade (o que foi auditado), testes executados e qualquer configuração externa necessária (Vercel, Google Cloud, DNS…). Mudança que quebra se for mergeada fora de ordem (ex.: domínio, variáveis de ambiente) avisa a ordem no topo.
- **CI vermelho:** veja primeiro qual job e qual passo falhou. Falha de infraestrutura (download, apt, rede) não é do código: corrija o workflow num PR `ci/…`. "Re-run" de um PR **não** pega mudanças da `main`; depois do merge da correção, atualize os branches dos PRs abertos ("Update branch").
- Nunca imprima, registre em log, comite ou coloque em documentação tokens, chaves ou segredos (PAT do GitHub, chave do Resend, segredos do Better Auth/Google). Não peça essas chaves ao dono do projeto.
- Mudança de escopo no meio de uma tarefa: termine ou pause o que está em andamento (commit no branch), responda e só então siga.

### Sessões do Claude na nuvem (Cowork)

O `git push` direto da nuvem é bloqueado. O caminho é pelo computador do dono, com a pasta Documents conectada e o clone em `$HOME/bm`:

1. Na nuvem: `git bundle create /mnt/user-data/outputs/<nome>.bundle origin/main..<branch>`.
2. Grave o bundle em `~/Documents/<nome>.bundle` (`device_commit_files`).
3. No computador (`device_bash`): `cd $HOME/bm && git fetch -q origin && git fetch -q $HOME/mnt/Documents/<nome>.bundle <branch>:refs/up/<nome> && git push -q origin refs/up/<nome>:refs/heads/<branch>`.
4. PR e consultas à API do GitHub com `curl`, lendo o token do remoto **sem imprimi-lo**: `TOKEN=$(git remote get-url origin | sed -n 's#https://[^:]*:\([^@]*\)@.*#\1#p')`.
5. Para trazer a `main` nova para a nuvem: no computador, `git bundle create $HOME/mnt/Documents/main.bundle <último-conhecido>..origin/main`; na nuvem, `device_stage_files` e `git fetch <bundle> 'refs/remotes/origin/main:refs/remotes/origin/main'`.

O token não lê logs do Actions: para ver o erro, use os passos dos jobs (`/actions/runs/<id>/jobs`) ou peça só o trecho do log em volta de `##[error]`.

### Armadilhas conhecidas (sessões na nuvem)

Aprendidas na prática. Leia antes de concluir que algo "não funciona".

**Push e bundles**

- No Mac, crie o bundle em `$HOME` e copie para `~/Documents`. O `git bundle create` direto na pasta conectada falha em silêncio (não consegue apagar o `.lock`) e deixa um bundle **antigo**.
- Na nuvem, use um **nome de arquivo novo** para cada bundle.
- Antes de buscar um bundle, confira com `git bundle list-heads <arquivo>` que ele tem o commit esperado.
- Proteja o push: só empurre se o PR estiver aberto (`state == open`) e, para branch novo, se ele ainda não existir no remoto. A checagem precisa **interromper** o comando (`exit 1`), não só imprimir o estado.
- Depois do push pelo Mac, atualize a referência local: `git update-ref refs/remotes/origin/<branch> <branch>`. Sem isso, o hook de "commits não enviados" acusa um problema que não existe.
- Commits feitos pelo Claude: `git config user.email noreply@anthropic.com && git config user.name Claude`. Senão o GitHub mostra "Unverified".
- Antes de `git commit`, `git add -A` e `git status --short`: mudanças fora do índice ficam para trás e "vazam" para o próximo branch.

**Testes locais (container da nuvem)**

- Postgres 16 em `/usr/lib/postgresql/16/bin`, dados em `/home/claude/pgdata`, porta 5433. Ele **para entre as respostas**, então confira com `pg_isready -h /tmp -p 5433` e suba com `su claude -c "/usr/lib/postgresql/16/bin/pg_ctl -D /home/claude/pgdata -o '-p 5433 -k /tmp' -l /tmp/pg.log start"`. Se o diretório não existir: `initdb` como o usuário `claude` e `createdb boramarcar`.
- Variáveis para E2E (valores fictícios, nada real): `DATABASE_URL=E2E_DATABASE_URL=postgres://boramarcar@127.0.0.1:5433/boramarcar`, `BETTER_AUTH_URL=http://localhost:3000`, um `BETTER_AUTH_SECRET` qualquer com 32+ caracteres, `GOOGLE_CLIENT_ID=x`, `GOOGLE_CLIENT_SECRET=y`. Depois: `pnpm db:migrate`, `pkill -f next-server`, `pnpm build`, `cd apps/web && npx playwright test`.
- No sandbox não há rede para Scryfall, Commander Spellbook nem Banco Central. Os erros `[deck-analysis] … ENOTFOUND` e `[cambio] PTAX indisponível` nos logs do E2E são esperados, e as imagens das cartas não carregam nas capturas de tela.
- `.next/types` velho de outro branch gera erros falsos no `tsc` direto. Use `pnpm typecheck`, que roda `next typegen` antes.
- Testes E2E rodam em sequência no mesmo banco: outro teste pode ter criado dados (ex.: um deck da Ana). Não dependa de contagens exatas. Há uma região `role="status"` em todas as páginas (barra de carregamento), então filtre mensagens de status pelo texto.

**Vercel e previews**

- Logs de runtime: pelo navegador interno, em `https://vercel.com/fernandolobaos-projects/boramarcar/logs?environment=preview` (com `&requestPath=/api/...` para filtrar). Os erros de variável de ambiente aparecem ali como "Variáveis de ambiente inválidas".
- O projeto separa os segredos de produção: variáveis secretas de Production **não** valem em Preview e precisam ser criadas lá também.
- Login no preview: OAuth proxy (ver `docs/ARCHITECTURE.md`). Um 403 "Invalid origin" num preview antigo some com um deploy novo do branch. Teste com `fetch('/api/auth/sign-in/social', {method:'POST', …, body: {provider:'google', callbackURL:'/painel', disableRedirect:true}})` no próprio preview: o `redirect_uri` deve ser o de produção.
- Um PR aberto antes de uma mudança de infraestrutura (CI, login) precisa de "Update branch" para pegá-la.
- **Minutos do Actions** (repositório privado, 2.000/mês): o CI roda só o que mudou (`.github/workflows/ci.yml`). Jobs que terminam em ~2 s sem passo nenhum = minutos esgotados ou limite de gasto, não o código. Mexeu muito em telas para celular? Ponha o rótulo `e2e-completo` no PR. Evite empurrar vários commits seguidos num PR aberto: junte e empurre uma vez.

**App mobile**

- Login no Expo Go contra produção exige `EXPO_GO_LOGIN=lan` no servidor (ver `server/trusted-origins.ts`).
- Para ver telas do app sem aparelho: instale temporariamente `react-native-web`/`react-dom` (`npx expo install`), crie uma rota de prévia, rode `npx expo export --platform web`, sirva a pasta e tire capturas com Playwright. Depois **restaure** `package.json`/`pnpm-lock.yaml` e apague a rota.

### Economia de contexto

- Uma conversa por funcionalidade grande. Ao começar, leia este arquivo, o `README`, `docs/ARCHITECTURE.md` e `docs/ROADMAP.md` em vez de pedir contexto.
- Em mudanças pequenas e de baixo risco, rode só os testes afetados (`vitest run <arquivo>`) e deixe o CI fazer o resto; build completa + E2E locais quando mexer em UI, rotas ou banco.
- Prefira comandos que mostram só o resultado (`| tail`, `grep -E "Tests |FAIL"`) a despejar saídas longas.

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
