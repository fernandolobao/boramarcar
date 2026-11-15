# Onboarding (Fase 7): guia do primeiro acesso, avisos no app e dicas das telas

Data: 15/11/2026 · Status: **proposta, aguardando aprovação** (abordagem A escolhida pelo dono do projeto)

## Por quê

O app vai para as lojas (5.7) e o ArcanaKin passa a receber gente que nunca ouviu falar dele. Quem chega precisa conseguir sozinho, sem ninguém explicar: entrar ou criar um grupo, marcar quando pode jogar e ver o próximo encontro (objetivo da Fase 7 no roadmap). Hoje o site tem os primeiros passos no painel (7.2) e o convite com contexto (7.3); o app não tem nada de onboarding, e quem chega sem grupo só vê uma tela de "entrar ou criar".

## Objetivos

1. **7.1 Guia do primeiro acesso** (site e app): 3 passos curtos, que abrem sozinhos uma vez e podem ser pulados a qualquer momento.
2. **7.5 Avisos no app na hora útil**: oferecer as notificações quando a pessoa confirma presença num encontro, não ao abrir o app.
3. **7.4 Dicas nas telas densas** (análise de deck, modo mesa, coleção): uma vez por pessoa, dispensáveis, dentro da tela.
4. **7.6 Medir a ativação**: contar, de forma agregada, quem conclui ou pula o guia.

## Fora do escopo

- Tour com balões apontando para botões, vídeos, animações de boas-vindas.
- Mudar os primeiros passos do painel (7.2) além do atalho para retomar o guia.
- E-mails de boas-vindas ou de reengajamento.

## O que não pode acontecer

- **Bloquear**: o guia nunca é obrigatório; "Pular" em todas as telas, e o resto do app funciona sem ele (decidido no roadmap).
- **Incomodar quem já usa**: quem já tinha conta antes do lançamento do guia não é levado a ele.
- **Modal que prende o foco ou some sozinho** nas dicas (WCAG 2.2: sem tirar o foco, sem tempo limite).
- **Pedir permissão de notificação sem contexto** (a primeira coisa ao abrir o app).

## Abordagens consideradas

- **A. Guia em telas próprias** (3 telas, abre sozinho no primeiro acesso, "Pular" sempre visível) — _escolhida pelo dono do projeto_. Mais claro para quem não conhece nada; reaproveita os formulários que já existem.
- B. Cartão de boas-vindas no painel, conduzindo os passos ali. Mais leve, mas quem chega sem grupo hoje nem vê o painel.

## Desenho

### 7.1 Guia do primeiro acesso

- **Onde**: site em `/boas-vindas` (área logada, sem exigir grupo); app numa tela `boas-vindas` da pilha principal.
- **Quando abre sozinho**: ao entrar na área logada, se a pessoa não tem `guide-completed` nem `guide-skipped` e a conta foi criada a partir do lançamento do guia (data fixa no código). Quem chegou por convite e já entrou no grupo também vê o guia, começando no passo 2.
- **Passos** (barra "Passo 1 de 3"):
  1. **Seu grupo**: entrar com o código do convite ou criar um grupo (os mesmos formulários de hoje). Pulado automaticamente se a pessoa já está num grupo.
  2. **Fuso e idioma**: vêm preenchidos com o do aparelho/navegador; a pessoa confirma ou troca. Explica que os horários e os e-mails seguem essa escolha.
  3. **Quando você pode jogar**: um dia da semana e um horário recorrentes (a mesma regra semanal da Disponibilidade), com "Pular este passo".
  - **Fim**: "Tudo pronto" com o próximo encontro do grupo (ou "ainda não há encontro marcado") e o botão para o painel.
- **Pular**: "Pular o guia" em todas as telas grava `guide-skipped` e leva ao painel (ou ao grupo, se não houver). Concluir grava `guide-completed`.
- **Retomar**: nos primeiros passos do painel (site e, novo, no app) aparece "Ver o guia de novo" enquanto houver passo pendente.
- **Progresso no servidor**: as duas marcas ficam em `onboarding_steps` (já existe; entram na exportação e na exclusão de conta). Novo `GET /api/v1/me/onboarding` devolve as marcas e se o guia deve abrir; o `POST` já existe.

### 7.5 Avisos no app na hora útil

- Ao confirmar presença ("Vou" ou "Talvez") num encontro pela primeira vez neste aparelho, se os avisos estão desligados, aparece no próprio encontro um cartão: "Quer saber quando este encontro mudar ou for cancelado?" com **Ligar avisos** e **Agora não**.
- "Ligar avisos" chama o mesmo `enablePush` de Conta; se o sistema negar, o cartão explica como ligar nos ajustes do aparelho.
- A oferta aparece uma vez por aparelho (guardado no aparelho, como decidido no roadmap: o que é por aparelho fica no aparelho).
- Os primeiros passos do app incluem "Ligar avisos" como passo (deduzido do estado do aparelho).

### 7.4 Dicas nas telas densas

- Componente de dica no topo da tela (não modal, não rouba o foco), com texto curto e "Entendi" que a dispensa para sempre (marca `tip-<tela>` em `onboarding_steps`).
- **Análise de deck**: a nota compara com metas de Commander; toque num item para ver o cálculo e as cartas; é um guia, não uma regra.
- **Modo mesa**: deite o aparelho no meio da mesa; toque para ±1, segure para ±10; deslize para cima na sua área (ou toque na engrenagem) para as suas opções; o botão do centro tem dados, desfazer e trocar lugares.
- **Coleção**: as cartas dos seus decks entram sozinhas; proxies não contam; o valor é estimado em dólar convertido.
- Site e app, nos dois idiomas.

### 7.6 Ativação

- As métricas agregadas do admin (8.3) passam a contar: guias concluídos, guias pulados e dicas dispensadas por tela, sem dados de ninguém.

### Ajuda e página inicial (regra do projeto)

- Ajuda: pergunta "Como vejo o guia de novo?" e menção às dicas; o texto de "avisos no celular" passa a citar a oferta ao confirmar presença.
- Página inicial: as capturas não mostram nenhuma das telas mudadas (o painel capturado é de quem já usa, sem primeiros passos visíveis); conferir no fim e regenerar se alguma mudar.

## Entregas (um PR por item, nesta ordem)

1. **7.1** guia (site e app) + `GET /me/onboarding` + "Ver o guia de novo" + primeiros passos no app.
2. **7.5** oferta de avisos ao confirmar presença.
3. **7.4** dicas nas três telas + **7.6** contagens no admin.

## Decisões do construtor (para conferir na aprovação)

- Guia só para contas criadas a partir do lançamento; quem já usa não é levado a ele (mas pode abrir pelo "Ver o guia de novo").
- Quem chega por convite também vê o guia, começando no passo 2.
- A primeira disponibilidade no guia é uma regra semanal (dia + horário), não um horário avulso.
- Avisos oferecidos uma vez por aparelho, ao confirmar presença.
- Dicas dispensadas por pessoa (servidor), não por aparelho.

## Deixado para quem constrói

- Textos finais (pt-BR e en) e o visual de cada tela, dentro do design system.
- A data fixa de lançamento do guia (a do deploy).
