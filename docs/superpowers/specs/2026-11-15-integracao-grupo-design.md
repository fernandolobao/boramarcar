# Integração do grupo: métricas que aproximam as pessoas

Data: 15/11/2026 · Status: **aprovado** (merge do #126) (lista e ordem aprovadas pelo dono do projeto em 15/11/2026)

## Por quê

O dono do projeto quer mais informação dentro do grupo e, principalmente, melhorar a integração entre as pessoas. O ArcanaKin já mostra ranking, estatísticas e conquistas, mas nada disso ajuda a **misturar a mesa**, **trazer de volta quem sumiu** ou **acolher quem chegou**. O banco já guarda tudo o que é preciso: presenças por encontro, quem jogou com quem em cada partida, assentos, ordem de eliminação, decks e comandantes, e a data de entrada de cada membro (`group_members.joined_at`).

## Objetivos

1. Na hora de montar as mesas, sugerir divisões que juntem quem menos jogou junto.
2. Dar a quem organiza uma visão de quem anda sumido e um jeito simples de chamar para o próximo encontro.
3. Fazer quem chega se sentir parte do grupo cedo.
4. Dar assunto entre os encontros: rivalidades, recordes, a "cara" do grupo e a retrospectiva do mês.

## Fora do escopo

- Coleta de dado novo (localização, contatos, mensagens). Tudo sai do que já existe.
- Chat ou rede social dentro do app.
- Comparação entre grupos diferentes.

## O que não pode acontecer

- **Expor alguém**: "quem anda sumido" e a frequência de cada um aparecem só para dono e admins do grupo, nunca para os membros comuns. Nenhuma métrica sai do grupo (inclusive nas imagens de compartilhar).
- **Envergonhar**: rivalidade e recorde só com mínimo de partidas (para não rotular alguém por uma partida) e em tom de brincadeira, sem "pior jogador".
- **Aviso em excesso**: "chamar para o próximo" manda no máximo um aviso por pessoa por encontro.

## Abordagens consideradas

1. **Uma página nova "Vida do grupo"** com tudo junto. Fácil de achar, mas ninguém visita uma página de estatística na hora de montar a mesa ou de chamar alguém.
2. **Cada métrica onde a decisão acontece** (encontro, painel, perfil, resumo da noite, tela do grupo), com página própria só para recordes e retrospectiva. _Escolhida e aprovada._
3. **Só avisos automáticos** (push/e-mail). Alcança todo mundo, mas vira ruído e não ajuda no momento de montar a mesa.

## Desenho

A lógica fica em `packages/core` (pura e testada), as consultas em `packages/db/src/services`, as rotas da API finas, e site e app mostram (regra do projeto). Todas as rotas novas com ID de grupo ou encontro entram em `autorizacao.test.ts`.

### Entrega 1 — Misturar a mesa e trazer de volta (itens 1 e 2)

**Sugestão de mesas** (no encontro, site e app)

- Aparece quando há 6 ou mais confirmados.
- Core: `suggestTables(players, pairCounts, opts)` divide em mesas de tamanho o mais igual possível dentro do formato do grupo (Commander: 3 a 5, preferindo 4) e minimiza a soma, por mesa, de quantas vezes cada par já jogou junto, com peso maior nas partidas dos últimos 90 dias. Com até 12 pessoas, busca por trocas a partir de uma divisão inicial; resultado determinístico para a mesma entrada, e "Sortear de novo" muda a semente.
- Db: `getPairCounts(groupId, since)` conta, por par de membros, partidas em comum.
- Tela: "Sugestão de mesas" com as mesas e, em cada uma, "3 pessoas que ainda não jogaram juntas". Só sugestão: não muda presenças nem partidas.

**Com quem você ainda não jogou** (painel, site e app)

- Até 3 membros com quem você nunca jogou, ou com quem não joga há mais tempo (mínimo 30 dias), priorizando quem confirmou o próximo encontro. Texto: "Você ainda não jogou com Bia" / "Faz 2 meses que você não joga com Caio".

**Quem anda sumido** (tela do grupo, só dono e admins)

- Para cada membro: presenças confirmadas nos últimos 8 encontros já realizados, data da última partida e "sem aparecer há X semanas" quando não confirmou nos últimos 4 encontros e não joga há 30 dias.
- Quem entrou no grupo há menos de 30 dias não aparece como sumido.
- Botão **"Chamar para o próximo"** no próximo encontro marcado: manda o aviso (push ou e-mail, conforme a preferência da pessoa) com o convite do encontro. No máximo uma vez por pessoa por encontro; o botão mostra "Chamado" depois.
- API: `GET /groups/:id/attendance` (dono/admin) e `POST /groups/:id/members/:userId/nudge` com `{ eventId }` (dono/admin; 409 se já chamado).

### Entrega 2 — Acolher e provocar (itens 3 e 4)

**Boas-vindas**

- No resumo da noite (e-mail, push e `/resumo`): "Primeira partida com o grupo: Ana".
- Conquista nova **"Enturmado"**: jogou ao menos uma partida com cada membro de um grupo de 4 ou mais pessoas (contando quem era membro na data da partida).
- No painel de quem entrou há menos de 30 dias: "Bem-vinda(o)! Próximo encontro: …" com o botão de presença.

**Rivalidades** (perfil e painel)

- Do confronto direto que já é calculado: **"Seu maior rival"** (quem mais te venceu nas partidas em que vocês dois jogaram) e **"Seu freguês"** (quem você mais venceu), com mínimo de 3 partidas juntos. No perfil de outra pessoa, mostra a rivalidade entre vocês dois.

### Entrega 3 — Assunto entre os encontros (itens 5, 6 e 7)

**Recordes do grupo** (página própria no site, tela no app; atalho na tela do grupo)

- Vitória mais rápida (menor turno), partida mais longa (maior duração), maior sequência de vitórias, noite com mais partidas, comandante com mais vitórias. Cada recorde com data e encontro.

**Cara do grupo** (na mesma página)

- Cores mais jogadas (identidade de cor dos decks usados nas partidas), quantos comandantes diferentes já apareceram e o "meta" do período (comandantes mais jogados).

**Retrospectiva do mês** (item 8.6 do roadmap)

- Página por mês (`/grupo/retrospectiva/2026-11`) com partidas, presenças, vencedor do mês, recordes batidos, estreias e rivalidade do mês. Compartilhável como o `/resumo` (sem dados de fora do grupo).
- Aviso no dia 1 de cada mês (cron, como os lembretes), só se o grupo jogou no mês anterior.

## Decisões do construtor (para conferir na aprovação)

- Mínimos: 6 confirmados para sugerir mesas; 3 partidas juntos para rivalidade; 30 dias para "sumido" e para "novo no grupo"; janela de 8 encontros para frequência.
- "Quem anda sumido" só para dono e admins.
- Um aviso de "chamar para o próximo" por pessoa por encontro.
- Três entregas, cada uma com um ou mais PRs, nesta ordem.

## Deixado para quem constrói

- Pesos exatos da busca de mesas (desde que determinística e testada).
- Textos finais (pt-BR e en), sempre nos arquivos de mensagens.
- Arranjo visual de cada cartão, dentro do design system.
