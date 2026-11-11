# Roadmap e plano de desenvolvimento

Este documento lista tudo o que falta para entregar as funcionalidades planejadas, organizado em fases. Cada fase termina em algo utilizável pelo grupo. Itens marcados (✅) já estão neste repositório.

**Legenda de tamanho:** P (até 1 dia) · M (2–4 dias) · G (1–2 semanas), considerando dedicação parcial.

---

## Fase 0 — Fundação ✅

- ✅ Monorepo pnpm + Turborepo (`apps/web`, `packages/core`, `packages/db`)
- ✅ Next.js 16 (App Router), React 19, Tailwind v4, TypeScript strict
- ✅ Neon Postgres + Drizzle (schema, migration inicial, serviços)
- ✅ Login com Google (Better Auth) e proteção de rotas
- ✅ i18n com next-intl (pt-BR padrão, en incluído, teste de paridade de chaves)
- ✅ API REST `/api/v1` com validação Zod e erros padronizados
- ✅ Testes unitários (core), integração (PGlite) e API; componentes (Testing Library); E2E smoke (Playwright)
- ✅ CI em cada PR: Prettier, ESLint, TypeScript, Vitest com cobertura mínima, migrations em Postgres 17, build e E2E
- ✅ Dependabot, templates de PR/issue, workflow de migração de produção

### Configuração pendente (você)

- [x] Criar projeto na Vercel com **Root Directory `apps/web`**
- [x] Adicionar **Neon** pelo Vercel Marketplace (região `sa-east-1`)
- [x] Criar OAuth Client no Google Cloud e cadastrar as URIs de callback
- [x] Configurar `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` na Vercel
- [x] Rodar `pnpm db:migrate` no Neon (ou configurar o secret `DATABASE_URL` no environment `production` do GitHub)
- [ ] Proteger a branch `main` exigindo os checks da CI

---

## Fase 1 — Agenda do grupo (MVP para começar a usar)

Objetivo: o grupo para de usar enquete e passa a marcar pelo app.

| #    | Item                                                                                                           | Tamanho | Status                                 |
| ---- | -------------------------------------------------------------------------------------------------------------- | ------- | -------------------------------------- |
| 1.1  | Criar grupo, entrar por código, listar membros                                                                 | M       | ✅                                     |
| 1.2  | Locais de jogo do grupo                                                                                        | P       | ✅                                     |
| 1.3  | Disponibilidade por intervalo + locais aceitos                                                                 | M       | ✅                                     |
| 1.4  | Sugestão de janelas em que ≥ 4 jogadores coincidem (por local)                                                 | M       | ✅                                     |
| 1.5  | Criar encontro a partir de uma janela; RSVP                                                                    | M       | ✅                                     |
| 1.6  | **Link de convite** (`/convite/:codigo`) e **QR Code**, compartilhamento e troca do código                     | P       | ✅                                     |
| 1.7  | **Disponibilidade recorrente** (ex.: "toda quinta, 19h–23h") com exceções                                      | G       | ✅                                     |
| 1.8  | Visualização em **grade semanal** (quem pode em cada hora) com marcação direto na grade, acessível por teclado | G       | ✅                                     |
| 1.9  | Editar/cancelar encontro; marcar como finalizado; reabrir                                                      | P       | ✅                                     |
| 1.10 | Gerenciar membros: promover/rebaixar admin, remover, sair do grupo, transferir posse                           | M       | ✅ (regenerar convite já feito em 1.6) |
| 1.11 | **Fuso horário por usuário** (detectado no navegador, editável no perfil)                                      | P       | ✅                                     |
| 1.12 | Configurar tamanho da mesa (3–6) e duração mínima por grupo                                                    | P       | ✅ (2–8 jogadores)                     |
| 1.13 | Notificações: novo encontro, lembrete no dia, "a mesa fechou!" (e-mail via Resend; depois push)                | M       | ✅ (e-mail; push em 5.5)               |
| 1.14 | Compartilhar encontro no WhatsApp (link + texto) e exportar `.ics`                                             | P       | ✅                                     |
| 1.15 | Página de perfil (nome, foto, idioma)                                                                          | P       | ✅ (perfil + configurações)            |

## Fase 2 — Partidas e ranking

| #    | Item                                                                                                                                                                                                                        | Tamanho | Status                               |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------------------------------------ |
| 2.1  | Registrar partidas do encontro (vencedor/empate, assento, deck)                                                                                                                                                             | M       | ✅                                   |
| 2.2  | Ranking do grupo (V/D/E, pontos, % vitórias)                                                                                                                                                                                | M       | ✅                                   |
| 2.3  | Visualizar partidas do encontro com vencedor                                                                                                                                                                                | P       | ✅                                   |
| 2.4  | **Mostrar o deck usado** por cada jogador na partida (UI de destaque, imagem do comandante)                                                                                                                                 | P       | ✅                                   |
| 2.5  | Editar partida (hoje: remover e registrar de novo)                                                                                                                                                                          | P       | ✅                                   |
| 2.6  | Filtros do ranking por período na UI e **temporadas** (ex.: semestre)                                                                                                                                                       | M       | ✅                                   |
| 2.7  | Tabela de pontos configurável por grupo                                                                                                                                                                                     | P       | ✅                                   |
| 2.11 | **Tipo de jogo por partida** (Commander, Brawl, Oathbreaker, Two-Headed Giant, Standard, Pioneer, Modern, Legacy, Vintage, Pauper, Draft, Selado, Outro): regras de jogadores, times e vencedor; ranking filtrável por tipo | M       | ✅                                   |
| 2.12 | **Conquistas**: selos no perfil (primeira vitória, sequências, deck favorito, "rei da mesa" na temporada…)                                                                                                                  | M       | ✅ (14 conquistas)                   |
| 2.13 | **Perfil do jogador** visível para quem divide grupo: resumo, títulos de temporada, conquistas e decks visíveis                                                                                                             | P       | ✅                                   |
| 2.8  | Estatísticas: confronto direto, sequência de vitórias, primeiro a jogar, duração, ordem de eliminação, "turno da vitória"                                                                                                   | G       | ✅                                   |
| 2.9  | Estatísticas por deck: % de vitórias, decks mais jogados, comandantes do grupo                                                                                                                                              | M       | ✅                                   |
| 2.10 | Histórico de encontros com busca                                                                                                                                                                                            | P       | ✅                                   |
| 2.14 | **Gestão de endereços e locais**: cadastrar, editar e remover locais do grupo com **autocomplete de endereço** e **mapa** (ver no mapa, abrir rotas no Google Maps/Apple Maps/Waze); mapa no encontro                       | M       | ✅ (OpenStreetMap: Photon + Leaflet) |

## Fase 3 — Decks e coleção

| #    | Item                                                                                                                                                                                                                                                                                                               | Tamanho | Status                                         |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- | ---------------------------------------------- |
| 3.1  | Importar do **Archidekt** por URL                                                                                                                                                                                                                                                                                  | M       | ✅                                             |
| 3.2  | Importar do **Moxfield** por URL                                                                                                                                                                                                                                                                                   | M       | ✅ experimental*                               |
| 3.3  | Importar lista em texto (formato Moxfield/Arena/Archidekt, seções, `#proxy`)                                                                                                                                                                                                                                       | M       | ✅                                             |
| 3.4  | Buscar dados das cartas no **Scryfall** (`/cards/collection`), com cache local                                                                                                                                                                                                                                     | M       | ✅                                             |
| 3.5  | Marcar carta como **proxy**                                                                                                                                                                                                                                                                                        | P       | ✅                                             |
| 3.6  | Proxy **parcial** por quantidade (ex.: 3 de 10 Forests)                                                                                                                                                                                                                                                            | P       | ✅                                             |
| 3.7  | Editor de deck: adicionar/remover cartas com **busca autocompletar do Scryfall**                                                                                                                                                                                                                                   | G       | ✅                                             |
| 3.8  | Sincronizar/reimportar deck da origem mantendo marcações de proxy                                                                                                                                                                                                                                                  | M       | ✅ (origem ou lista colada)                    |
| 3.9  | Imagens das cartas (hover/preview), preço total do deck (USD e, se possível, BRL)                                                                                                                                                                                                                                  | M       | ✅ (USD + R$ pela PTAX; link para a LigaMagic) |
| 3.10 | Gerar **folha de impressão de proxies** (PDF 3×3)                                                                                                                                                                                                                                                                  | M       | ✅ (A4 ou Carta)                               |
| 3.11 | Exportar lista (texto / Moxfield / Archidekt)                                                                                                                                                                                                                                                                      | P       | ✅                                             |
| 3.12 | Visibilidade do deck (privado / grupo / público) — hoje: visível para quem divide grupo com o dono                                                                                                                                                                                                                 | P       | ✅ (privado, grupo, público)                   |
| 3.13 | Atualização periódica do cache Scryfall (bulk data diário via Vercel Cron)                                                                                                                                                                                                                                         | M       | ✅ (cartas dos decks via `/cards/collection`)  |
| 3.14 | **Gestão de decks visual e responsiva**: grade de decks com arte do comandante, identidade de cor e tipo de jogo; deck em modo visual (imagens por tipo, ampliar em diálogo) ou lista; renomear e mudar o tipo de jogo                                                                                             | M       | ✅                                             |
| 3.15 | **Edições (impressões)**: a mesma carta em várias edições no deck; importação mantém a edição (id, ou `(SET) número` na lista colada); trocar a edição de parte das cópias no editor; exportação com `(SET) número`                                                                                                | M       | ✅                                             |
| 3.16 | **Cartas de duas faces** (transformar, MDFC): virar na grade, frente/verso no diálogo e as duas faces na folha de proxies                                                                                                                                                                                          | P       | ✅                                             |
| 3.17 | **Coleção pessoal** ✅: as cartas que a pessoa tem (sem proxies, nunca), criada a partir dos decks (soma entre decks) e completada por eles (só acrescenta). Galeria densa e lista, filtros por cor, custo, tipo, edição, ano, ilustrador, raridade, foil e "em deck", decks de cada carta e valor total em R$/US$ | M       |                                                |

\* A API do Moxfield não é pública e costuma exigir um _User-Agent_ aprovado. Ação: pedir acesso ao Moxfield; enquanto isso, a importação por texto ("Export → Copy for MTGA/Plain text") funciona sempre.

## Fase 4 — Análise de deck (estilo mythic.tools)

| #    | Item                                                                                                                                                                        | Tamanho | Status                                                           |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ---------------------------------------------------------------- |
| 4.1  | Curva de mana, símbolos por cor, contagem de terrenos                                                                                                                       | M       | ✅                                                               |
| 4.2  | Funções por heurística (ramp, compra, remoção, wipe) e **nota 0–100**                                                                                                       | M       | ✅                                                               |
| 4.3  | Validação de Commander (100 cartas, singleton, identidade de cor)                                                                                                           | P       | ✅                                                               |
| 4.4  | Sugestões com busca pronta no Scryfall                                                                                                                                      | P       | ✅                                                               |
| 4.4b | **Formato do deck** escolhido na importação (ou detectado no Archidekt/Moxfield) e validação/análise por formato (Commander, Brawl, Oathbreaker, construídos, limitados)    | M       | ✅                                                               |
| 4.4c | **Lista de banidas e restritas** por formato na validação (legalidade do Scryfall)                                                                                          | P       | ✅                                                               |
| 4.5  | Classificação por **Scryfall Tagger** (`otag:`) em vez de regex — mais precisão e mais funções (tutores, proteção, recursão, wincons)                                       | G       | ✅                                                               |
| 4.6  | **Substituições sugeridas**: para cartas fracas/caras, buscar alternativas da mesma função, identidade de cor e CMC menor, ordenadas por popularidade (EDHREC rank) e preço | G       | ✅                                                               |
| 4.7  | Estimativa de **bracket/power level** (lista oficial de _Game Changers_, tutores, combos de 2 cartas, mana rápida, turnos extras)                                           | G       | ✅                                                               |
| 4.8  | Fontes de mana vs. símbolos por cor (recomendação de base de mana)                                                                                                          | M       | ✅                                                               |
| 4.9  | Simulação de mão inicial / probabilidade de jogar terreno no turno N (hipergeométrica)                                                                                      | M       | ✅                                                               |
| 4.10 | Comparação com a média de decks do mesmo comandante (dados do EDHREC, respeitando os termos de uso)                                                                         | G       | ✅ (decks do app + popularidade do Scryfall; EDHREC só por link) |
| 4.11 | Gráficos interativos e explicação de cada componente da nota                                                                                                                | M       | ✅                                                               |

## Fase 5 — Apps Android e iOS

| #   | Item                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Tamanho | Status                                                                                                                    |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------- |
| 5.1 | `apps/mobile` com **Expo (React Native) + Expo Router** no mesmo monorepo                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | M       | ✅                                                                                                                        |
| 5.2 | Login Google no app com o plugin `@better-auth/expo` e sessões via bearer token na API                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | M       | ✅ (sessão por cookie no SecureStore)                                                                                     |
| 5.3 | Cliente da API tipado e compartilhado (`packages/api-client`, gerado a partir de schemas Zod/OpenAPI)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | M       | ✅ (Zod, escrito à mão)                                                                                                   |
| 5.4 | Telas: disponibilidade, encontros, registrar partida, ranking, decks                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | G       | ✅ (encontros com criar e presença, disponibilidade, registrar partida pelo formulário ou pelo modo mesa, ranking, decks) |
| 5.5 | **Push notifications** (Expo Notifications) para encontros e lembretes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | M       |                                                                                                                           |
| 5.6 | Modo "mesa": registrar partida rapidamente durante o jogo (com contador de vida opcional)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | G       | ✅ no site (`/mesa/:encontro`) e no app                                                                                   |
| 5.7 | Publicação nas lojas (EAS Build/Submit), ícones, splash, política de privacidade                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | M       | depois do rebranding (6.x): nome, ícone e identificador do app vão para as lojas                                          |
| 5.8 | Deck no app: ver o deck (cartas, edições, curva e nota da análise) sem abrir o site; editar continua no site                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | M       | ✅ (cartas por tipo, carta grande com verso e edição, curva, funções, nota, bracket e validação)                          |
| 5.9 | **Scan de cartas pela câmera**: aponta o celular para uma ou várias cartas e elas entram no deck (ou numa lista para importar), como nos apps de coleção. Lê o nome e, nas cartas modernas, o código da edição e o número de colecionador no rodapé, para achar a impressão exata no Scryfall (`/cards/:set/:número`; sem isso, busca aproximada pelo nome). Modo contínuo com som/vibração a cada carta, lista para conferir e corrigir antes de salvar, quantidade e idioma. Reconhecimento de texto no aparelho (sem enviar imagens a terceiros), o que exige build próprio, fora do Expo Go | G       |                                                                                                                           |

## Fase 6 — Rebranding para ArcanaKin

O app passou a se chamar **ArcanaKin** (antes Bora Marcar). Vem **antes da publicação nas lojas (5.7)**, porque nome, ícone e identificador do app ficam gravados lá.

| #   | Item                                                                                                                                                                             | Tamanho | Status                                                                                             |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------- |
| 6.1 | Nome, logotipo e paleta de cores                                                                                                                                                 | M       | ✅ nome, logotipo e paleta; falta o **símbolo** (ícone)                                            |
| 6.2 | Design tokens compartilhados entre site e app (`packages/tokens`): paleta, escalas, cores por função nos temas claro/escuro, contraste AA testado                                | M       | ✅                                                                                                 |
| 6.3 | Site: logotipo, página inicial (textos, cores e vídeo do topo), e-mails, PDF e calendário com o nome novo em `pt-BR`/`en`                                                        | M       | ✅; falta **favicon** e imagens de compartilhamento (Open Graph), que dependem do símbolo          |
| 6.4 | App: nome, cores, logotipo, link `arcanakin://` e identificador `app.arcanakin` (o servidor aceita também `boramarcar://` por um tempo)                                          | M       | ✅; falta **ícone** e **splash**, que dependem do símbolo                                          |
| 6.5 | Domínio **www.arcanakin.com.br**, com redirecionamento do endereço atual; URLs de retorno do Google OAuth, `BETTER_AUTH_URL`, endereço no app, links do calendário e dos e-mails | P       | ✅ `www.arcanakin.com.br`; o endereço antigo da Vercel e o domínio sem "www" redirecionam para ele |
| 6.6 | Nomes internos: repositório, pacotes (`@boramarcar/*`), chaves salvas no navegador e no app (com migração), e o aviso aos grupos sobre a mudança                                 | P       |                                                                                                    |

## Transversal (contínuo)

| Item                                                                                                                                                                                   | Tamanho |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| E2E autenticado (usuário de teste criado direto no banco + cookie de sessão) cobrindo o fluxo completo ✅                                                                              | M       |
| **Previews na Vercel** ✅: branch de banco do Neon por PR (integração Neon ↔ Vercel) e login com Google no preview pelo OAuth proxy do Better Auth                                     | M       |
| **Domínio próprio no Resend** ✅: `arcanakin.com.br` verificado (SPF/DKIM no registro.br) e `EMAIL_FROM` em produção                                                                   | P       |
| Observabilidade: Vercel Analytics/Speed Insights e Sentry                                                                                                                              | P       |
| **Hotjar/Contentsquare e LGPD** ✅: gravação de sessões só em produção e com consentimento (aviso de cookies), Política de Privacidade, baixar meus dados e excluir conta (site e app) | P       |
| Rate limiting nas rotas de importação (Upstash Redis free) e timeouts nas chamadas externas                                                                                            | P       |
| Cabeçalhos de segurança (CSP) e revisão de permissões                                                                                                                                  | P       |
| Acessibilidade (auditoria WCAG AA) e modo escuro refinado                                                                                                                              | M       |
| LGPD: exportar e excluir conta ✅                                                                                                                                                      | P       |
| OpenAPI da API v1 (documentação para o app mobile)                                                                                                                                     | M       |
| PWA (instalar na tela inicial) enquanto o app nativo não sai                                                                                                                           | P       |

---

## Plano de execução sugerido

1. ✅ **Semana 1–2 — colocar no ar (Fase 0 pendente + 1.6, 1.9, 1.11, 1.14).** Deploy na Vercel, Neon, OAuth; o grupo começa a usar a disponibilidade e o ranking.
2. ✅ **Semana 3–4 — agenda madura (1.7, 1.8, 1.10, 1.13).** Recorrência e calendário são o que mais reduz atrito.
3. ✅ **Semana 5–6 — partidas ricas (2.4–2.9, 2.11).** Estatísticas aumentam o engajamento depois de algumas semanas de dados.
4. **Semana 7–9 — decks (3.6–3.11).** Editor, proxies parciais e folha de impressão.
5. **Semana 10–13 — análise (4.5–4.9).** Começar pelo Tagger (4.5), que melhora todo o resto.
6. ✅ **Mobile (Fase 5), primeira parte:** app com login, encontros, disponibilidade, ranking, decks e modo mesa.
7. **Depois — rebranding (Fase 6)** e, em seguida, a publicação nas lojas (5.7).

### Definição de pronto (para cada item)

- Regra de negócio em `packages/core` com testes unitários.
- Serviço em `packages/db` com teste de integração (PGlite), incluindo permissões.
- Rota da API validada com Zod e coberta por teste de integração.
- Textos em `pt-BR.json` e `en.json`.
- CI verde e item marcado neste documento.

## Decisões em aberto

- **Scan de cartas (5.9):** escolher a biblioteca de reconhecimento de texto no aparelho (ex.: ML Kit) e decidir se o scan também alimenta uma coleção (3.x) ou só decks; avaliar uma versão no site com a câmera do navegador.

- **Rebranding:** o nome ArcanaKin e a paleta estão aplicados; o símbolo e o favicon ainda estão em criação. Não usar "Bora Marcar" em lugares novos (os nomes internos `boramarcar` só mudam no item 6.6).

- **"Importar do Scryfall":** o Scryfall não hospeda mais decks; hoje ele é a fonte de dados das cartas (e da busca de substitutos). Se a ideia era importar outra coisa (ex.: uma lista de cartas favoritas/coleção), registrar aqui.
- **Pontuação do ranking:** 3/1/0 foi um ponto de partida; confirmar com o grupo.
- **Privacidade dos decks:** hoje qualquer membro de um grupo em comum vê os decks.
