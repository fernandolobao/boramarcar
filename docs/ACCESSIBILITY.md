# Acessibilidade

**Meta:** WCAG 2.2 nível AA em toda a interface, nos temas claro e escuro, em desktop e mobile.
As regras de trabalho estão no [CLAUDE.md](../CLAUDE.md#acessibilidade-e-usabilidade-obrigatório).

## Como é garantida

| Camada      | Ferramenta                                                                                                 | Onde                                      |
| ----------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Lint        | `eslint-plugin-jsx-a11y` (strict, como erro)                                                               | `pnpm lint` / CI                          |
| Componentes | axe-core em jsdom (todos os componentes interativos)                                                       | `apps/web/src/components/a11y.test.tsx`   |
| Páginas     | `@axe-core/playwright` em todas as telas públicas e logadas, claro/escuro, desktop/mobile, com dados reais | `apps/web/e2e/a11y.spec.ts` / CI          |
| Manual      | Teclado, reflow 320px, zoom 200%, leitor de tela                                                           | A cada tela nova (checklist do CLAUDE.md) |

## Auditoria de 05/11/2026

Escopo: todas as telas (página inicial, convite, painel, disponibilidade, encontros, encontro, ranking, decks, deck, importar deck, grupo, perfil).
Método: axe-core (WCAG 2.0/2.1/2.2 A e AA) com dados reais em Chromium desktop e Pixel 7, temas claro e escuro;
navegação por teclado automatizada (ordem e visibilidade do foco), reflow em 320px, revisão de código dos componentes.

### Problemas encontrados e corrigidos

| #   | Problema                                                                                                                                | Critério         | Severidade | Correção                                                                                                           |
| --- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ---------- | ------------------------------------------------------------------------------------------------------------------ |
| 1   | Texto secundário (`zinc-500`) sobre fundos `zinc-100` e cabeçalhos de tabela com contraste abaixo de 4,5:1 (painel, encontros, ranking) | 1.4.3 (AA)       | Alta       | `muted` e cabeçalhos passam a `zinc-600` / `zinc-400` no escuro                                                    |
| 2   | Bordas de campos (`zinc-300`/`zinc-700`) com contraste ~1,5:1 contra o fundo                                                            | 1.4.11 (AA)      | Alta       | Bordas `zinc-500` (≥ 3:1 nos dois temas)                                                                           |
| 3   | Sem link para pular a navegação                                                                                                         | 2.4.1 (A)        | Alta       | "Pular para o conteúdo" visível ao receber foco, apontando para `<main id="conteudo">`                             |
| 4   | Páginas de encontro, deck e importar deck com título genérico ("Bora Marcar")                                                           | 2.4.2 (A)        | Média      | `generateMetadata` com o nome do encontro/deck                                                                     |
| 5   | Vários botões "Remover" iguais na mesma página (partidas, disponibilidades, deck)                                                       | 2.4.6 (AA)       | Média      | Nome com contexto: "Remover partida 2", "Remover disponibilidade de …", "Remover deck …"                           |
| 6   | Links "Buscar substitutos no Scryfall" idênticos e abrindo nova aba sem aviso                                                           | 2.4.4 (A), 3.2.5 | Média      | Contexto da função e "(abre em nova aba)" em texto para leitores de tela, mantendo o texto visível no nome (2.5.3) |
| 7   | Seletor de importação usava `role="tab"` sem painéis nem setas                                                                          | 4.1.2 (A)        | Média      | Grupo de botões com `aria-pressed`                                                                                 |
| 8   | Navegação sem rótulo e sem indicar a página atual                                                                                       | 1.3.1, 2.4.8     | Média      | `<nav aria-label>` + `aria-current="page"` (também destacado visualmente)                                          |
| 9   | Tabelas sem `scope` nos cabeçalhos e ranking sem legenda                                                                                | 1.3.1 (A)        | Baixa      | `<th scope="col">` e `<caption class="sr-only">`                                                                   |
| 10  | Grupo de presença (Vou/Talvez/Não vou) sem rótulo                                                                                       | 1.3.1 (A)        | Baixa      | `role="group"` com `aria-label`                                                                                    |
| 11  | Títulos de validação/sugestões do deck como parágrafos                                                                                  | 1.3.1 (A)        | Baixa      | `<h2>`/`<h3>`                                                                                                      |
| 12  | Barras de gráfico (cores de mana, nota) sem alternativa, com `title` como única descrição                                               | 1.1.1 (A)        | Baixa      | Marcadas como decorativas (`aria-hidden`); os números já estão em texto                                            |
| 13  | Checkbox e radio com 13px                                                                                                               | 2.5.8 (AA)       | Baixa      | 20px + rótulo clicável, na cor da marca                                                                            |
| 14  | Seta do `select` colada na borda                                                                                                        | Usabilidade      | Baixa      | Classe `select` com seta própria e espaçamento                                                                     |
| 15  | Ícone de calendário dos campos de data quase invisível no tema escuro                                                                   | 1.4.11 (AA)      | Baixa      | `color-scheme: dark` nos campos                                                                                    |
| 16  | Transições sem respeitar "reduzir movimento"                                                                                            | 2.3.3 (AAA)      | Baixa      | `motion-reduce:transition-none` nos botões                                                                         |

Resultado após as correções: **0 violações** do axe em 15 telas × 2 temas × 2 dispositivos; foco visível em todos os elementos;
sem rolagem horizontal em 320px.

### Revisão de 05/11/2026 (importação do Moxfield e cursor)

| Problema                                                                                              | Critério            | Correção                                                                             |
| ----------------------------------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------ |
| Botões, rótulos de checkbox/radio e selects sem cursor de "mãozinha" (o Tailwind v4 removeu o padrão) | Usabilidade         | `cursor: pointer` global para elementos clicáveis e `not-allowed` para desabilitados |
| Placeholder com contraste baixo                                                                       | 1.4.3 (boa prática) | `placeholder:text-zinc-500` / `zinc-400` no escuro                                   |
| Falha do Moxfield mostrava só um erro genérico                                                        | 3.3.3 (AA)          | Passo a passo em `role="alert"`, troca para "Colar lista" e foco no campo de texto   |

### Revisão: agenda madura (grade semanal, regras semanais, membros)

- **Grade semanal**: padrão ARIA _grid_ — uma parada de Tab, setas, Home/End, PageUp/PageDown; cada célula tem nome completo ("quinta-feira, 12 de novembro, 19h: 3 pessoas disponíveis (…). Você está disponível."), `aria-pressed` para o próprio horário e `aria-disabled` quando o horário vem de regra semanal. A cor (mesa fechada) sempre acompanha o número e a legenda; o próprio horário tem contorno, e a regra semanal tem o símbolo ↻.
- **Formulário**: escolha "Uma vez / Toda semana" com `aria-pressed`, dias em `<fieldset>/<legend>`, dica do horário que atravessa a meia-noite ligada por `aria-describedby`.
- **Membros**: ações agrupadas com rótulo ("Ações para Bia"), nomes com contexto em texto para leitores de tela, confirmação em dois cliques para remover/transferir/sair, e motivo visível quando "Sair" está desabilitado.
- **Gráfico da curva de mana**: as barras não apareciam (altura em % sem contêiner com altura definida). Corrigido e coberto por teste E2E que mede a altura renderizada; cada coluna tem nome acessível ("Custo 3: 2 cartas").

### Revisão: ícones (Lucide)

- Ícones são decorativos (`aria-hidden`, `focusable="false"`) e sempre acompanham texto; os nomes acessíveis não mudaram (coberto por teste).
- Mapa semântico único (`components/icons.tsx`): a mesma ação usa sempre o mesmo ícone.
- Botão "Sair": a partir de telas `sm` mostra só o ícone (o texto fica `sr-only` e em `title`), para o cabeçalho caber numa linha; no celular mostra ícone + texto.
- Ícone de link externo junto do aviso "(abre em nova aba)" para leitores de tela.

### Revisão: avisos por e-mail

- **Perfil**: a opção "Receber avisos por e-mail" é um checkbox nativo com rótulo clicável e a explicação ligada por `aria-describedby`; testado por teclado (Espaço) em E2E e pelo axe no componente e na página.
- **E-mails**: `<html lang>` no idioma de quem recebe, `<title>`, texto escapado, versão em texto puro equivalente, link com texto descritivo ("Abrir o encontro"), contraste ≥ 4,5:1 (botão roxo com texto branco, rodapé zinc-600) e informação nunca só em cor. Datas por extenso no fuso de quem recebe.

### Revisão: tipos de jogo e partidas

- **Formulário de partida**: jogadores em lista (não tabela), para caber em 320px; "Jogou" dentro de `<fieldset>/<legend>` com a contagem exigida pelo tipo de jogo ligada por `aria-describedby` e anunciada em texto (não só pelo botão desabilitado). O radio "Venceu" tem nome com contexto ("Venceu: Bia") que começa pelo texto visível (WCAG 2.5.3). Em Two-Headed Giant, cada jogador tem um select "Time de …" e o vencedor é escolhido por time em outro `<fieldset>`.
- **Detalhes opcionais** num `<details>/<summary>` nativo (teclado e leitor de tela sem ARIA extra).
- **Editar partida**: botão de disclosure com `aria-expanded`/`aria-controls`; o nome não muda ao abrir. Ao salvar, o formulário fecha e o foco volta para o botão (testado em unidade e E2E).
- **Partidas**: cada partida tem `<h3>` com o tipo de jogo; vencedor indicado por texto ("Venceu"), ícone e fundo (cor não é a única pista). A arte do comandante é decorativa (`alt=""`): o nome do deck e do comandante estão em texto. Corrigida rolagem horizontal em 320px (itens do grid sem `min-w-0`).
- **Configurações do grupo**: campos numéricos com `<label>`, regras dos pontos explicadas em texto ligado aos campos; membros comuns veem os valores desabilitados com o motivo.

### Revisão: ranking, estatísticas e temporadas

- **Filtros** em `<form method="get">` nativo (funciona sem JavaScript, URL compartilhável); o filtro aplicado é repetido em texto ("Mostrando: …").
- **Tabelas** com `<caption>` (sr-only), `th scope="col"` e nome do jogador como `th scope="row"`. Tabelas largas ficam numa região rolável com `role="region"`, nome e `tabIndex=0` (WCAG 2.1.1 / axe `scrollable-region-focusable`), sem rolar a página em 320px.
- **Confronto direto**: matriz com explicação visível ligada por `aria-describedby`; células "2 × 1" com `title` por extenso; diagonal "—" escondida de leitores de tela.
- **Decks e comandantes**: arte decorativa (`alt=""`), nome e números em texto; link para o deck.
- **Temporadas**: datas digitadas no fuso do usuário (primeiro e último dia, inclusive); remoção com confirmação em dois cliques e contexto para leitores de tela.

### Revisão: decks visuais

- **Lista de decks**: cartões com um único link (o nome; `::after` cobre o cartão), foco visível no cartão inteiro (`has-[a:focus-visible]`), arte decorativa (`alt=""`). Identidade de cor com letra sobre fundo claro (contraste ≥ 7:1) e nome das cores em `sr-only`.
- **Deck**: imagem do comandante com `alt` = nome da carta; fundo desfocado decorativo. Modos "Visual/Lista" com `aria-pressed`.
- **Modo visual**: cada carta é um botão "Ampliar {carta}" que abre `<dialog>` nativo (`showModal`: foco preso, Esc fecha, foco volta ao botão). Selos de quantidade e proxy ficam fora do botão para o nome acessível bater com o conteúdo (axe `label-content-name-mismatch`, WCAG 2.5.3) e a informação também aparece em texto abaixo da imagem.
- **Responsivo**: 2 colunas no celular, 3–4 no iPad, até 6 no desktop; sem rolagem horizontal em 320px. Animações de hover com `motion-reduce:`.

### Revisão: cabeçalho, menu da conta e membros

- **Cabeçalho em duas linhas**: marca com o grupo ativo embaixo (truncado com reticências) e menu da conta na primeira; navegação na segunda (rola horizontalmente no celular). Não quebra com nomes de grupo longos nem com rótulos maiores em inglês (testado em E2E).
- **Menu da conta**: padrão _disclosure_ de navegação (botão com `aria-expanded`/`aria-controls` e lista de links), não `role="menu"`, porque os itens são links comuns. Esc fecha e devolve o foco ao botão; clique fora e troca de página também fecham. Nome do botão começa pelo texto visível ("Ana (Menu da conta)").
- **Perfil x Configurações**: "Perfil" mostra dados e resumo do usuário (e futuramente conquistas); fuso, idioma e avisos por e-mail ficam em "Configurações". O link de descadastro dos e-mails aponta para Configurações.
- **Membros do grupo**: ações recolhidas atrás de "Gerenciar (Nome)" (disclosure), abertas numa faixa própria abaixo do nome — os botões não disputam espaço com o nome nem desalinham a lista.

### Revisão: símbolos de mana

- Símbolos reais do Mana Font (subconjunto em `src/styles/mana.css`, fonte `public/fonts/mana.woff2`) no lugar das letras W/U/B/R/G/C: identidade de cor, símbolos de mana do deck e custo das cartas.
- Os glifos são decorativos (`aria-hidden`); o texto vem junto: custos têm `role="img"` com nome por extenso ("Custo de mana: 2, verde", híbridos "branco ou azul", phyrexianos), e identidade/contagem de cores têm o nome da cor em `sr-only`. Cada cor tem um desenho próprio, então a cor não é a única pista.
- Os seletores do Mana Font foram prefixados com `.ms` (ex.: `.ms.ms-1`) porque `ms-1`, `ms-2`… também são utilitários do Tailwind (margem): sem isso, um `ms-1` comum ganhava um glifo e mudava o nome acessível de títulos — pego pelo teste E2E.
- A barra de símbolos agora usa `flex-grow` proporcional (antes, larguras em % podiam esconder a última cor).

### Revisão: editor de deck

- **Busca de cartas**: padrão ARIA 1.2 _combobox_ com `listbox` (`aria-expanded`, `aria-controls`, `aria-activedescendant`); setas navegam, Enter escolhe, Esc fecha; instrução em `aria-describedby` e quantidade de sugestões anunciada numa região `aria-live`. Clique na sugestão usa `mousedown` para não perder a escolha no `blur`.
- **Modo Editar** (só o dono, terceiro botão com `aria-pressed`): tabela com cabeçalhos visíveis; cada campo tem nome com contexto ("Quantidade de Forest", "Proxies de Forest"); salva ao sair do campo ou com Enter e confirma numa região `role="status"` sempre presente. Remover usa confirmação em dois cliques; no celular o botão mostra só o ícone, com o texto para leitores de tela.
- **Exportar/atualizar**: botões com texto, resultado em `role="status"`, lista colada num `<details>` com instrução ligada ao campo.

### Revisão: perfis, conquistas e visibilidade

- **Conquistas**: lista de selos; desbloqueada com ícone próprio, fundo e a data em texto; bloqueada com cadeado, "Bloqueada" para leitores de tela e o progresso em texto ("3 de 10") — a barra é decorativa.
- **Perfil de outro jogador**: links a partir do grupo e do ranking; título da aba com o nome; sem e-mail.
- **Visibilidade do deck**: três opções em `fieldset/legend` com rótulo, ícone e explicação clicáveis; o selo de visibilidade usa texto + ícone.

### Revisão: análise de deck (Tagger, bracket, mana, mão inicial)

- **Formato na importação**: `select` com rótulo e dica ligada por `aria-describedby`; "Detectar automaticamente" explica o que acontece.
- **Funções**: cada função é um `h3` com contagem e meta em texto (meta não atingida tem ícone de alerta **e** a palavra "meta"); "Ver cartas" é `details/summary` com o nome da função para leitores de tela.
- **Alternativas**: botão com `aria-expanded`/`aria-controls` e nome com contexto ("Ver alternativas (Ramp)", contendo o texto visível — WCAG 2.5.3); a região de resultados é `aria-live="polite"`; imagens decorativas (`alt=""`) porque o nome da carta está em texto; link do Scryfall avisa que abre nova aba.
- **Bracket**: valor e motivos em texto; a fonte dos dados (Spellbook ou só Game Changers) é dita na tela.
- **Base de mana e mão inicial**: tabelas com `th scope="col"`/`scope="row"` e `caption`; situação com ícone **e** texto ("Suficiente"/"Poucas fontes"); barras de probabilidade decorativas, com o valor em texto ao lado.
- **Atualizar análise**: resultado em `role="status"`; o ícone girando respeita `motion-reduce`.

### Revisão: folha de proxies no navegador

- Página `/decks/:id/imprimir` com pré-visualização em milímetros reais, numa região rolável focável; cada página tem nome ("Página 1 de 5") e cada carta usa `alt` com o nome. Botão "Imprimir / salvar como PDF" com texto; instruções de impressão em texto. Na impressão, cabeçalho e instruções somem (`print:hidden`).

### Revisão: edições das cartas

- **Escolher edição**: botão com texto visível ("Edição: CMM #400" ou "Escolher edição") e o nome da carta para leitores de tela; abre um `<dialog>` modal com título, que fecha com Esc e devolve o foco ao botão.
- As edições são um grupo de `radio` nativo (`fieldset/legend`), com nome da edição, código e número em texto; a imagem é decorativa. A edição selecionada tem borda **e** fundo; a edição em uso diz "Em uso" em texto. O número de resultados do filtro é anunciado (`role="status"`).
- Campos de quantidade/proxies e "Remover" incluem a edição no nome acessível quando conhecida ("Quantidade de Sol Ring (CMM #400)"), para distinguir linhas da mesma carta.

### Revisão: histórico de encontros

- Formulário com `role="search"` e nome, campos com `label` (a dica da busca ligada por `aria-describedby`); funciona sem JavaScript (GET).
- Resultado com título que diz quantos encontros foram encontrados; situação com selo em texto.
- Paginação em `<nav>` com nome, links "Anterior"/"Próxima" com texto e a página atual com `aria-current="page"`.

### Revisão: escolha de tema

- Em Configurações, "Tema" é um `fieldset/legend` com três `radio` nativos (Automático, Claro, Escuro), com ícone **e** texto; a dica está ligada ao grupo.
- O tema salvo é aplicado por um script no `<head>` antes da primeira pintura (sem piscar) e define `color-scheme`, então controles nativos e barras de rolagem acompanham. Os testes de axe continuam rodando nos dois temas.

### Revisão: gráficos interativos da análise

- **Curva de mana**: cada barra é um `button` com `aria-pressed` e nome com o custo e a contagem ("Custo 3: 5 cartas"); o número fica visível acima da barra. As cartas do custo escolhido aparecem numa região `aria-live` logo abaixo, e a barra escolhida muda de cor **e** o rótulo fica em negrito sublinhado.
- **Nota**: cada componente é um disclosure (`aria-expanded`/`aria-controls`) com a pontuação em texto; o painel diz se está dentro, abaixo ou acima da meta (ícone **e** texto), explica o cálculo e lista as cartas que contam. As barras continuam decorativas.

### Revisão: comparação com outros decks

- Tabela com `caption` ("Este deck × média de N decks"), `th scope="col"`/`scope="row"`; a diferença é texto com sinal ("+1,5", "−15", "igual"), sem depender de cor.
- Link "Ver o comandante no EDHREC" avisa que abre em nova aba; listas de cartas em texto.

### Revisão: cartas de duas faces

- "Virar" é um botão com texto visível, `aria-pressed` e o nome da carta para leitores de tela; fica fora do botão "Ampliar" (nada de botão dentro de botão).
- No diálogo, "Frente" e "Verso" são botões com `aria-pressed` num grupo nomeado ("Faces da carta"); o `alt` da imagem muda para o nome da face mostrada.

### Revisão: página inicial

- Vídeo do topo decorativo (`aria-hidden`, sem som) com botão de pausar/reproduzir com nome (WCAG 2.2.2); com "reduzir movimento" ele não toca sozinho. O texto fica sobre camadas escuras para manter o contraste em qualquer quadro do vídeo.
- Um `h1`, seções com `h2` (rótulo de cada seção) e numeração decorativa (`aria-hidden`); navegação por âncoras em `<nav>` com nome; a barra da nota é decorativa e os números estão em texto ao lado.
- Links externos avisam que abrem em nova aba; o mesmo conteúdo para quem entrou ou não, com "Ir para o painel" ou "Entrar no painel" no menu superior.

### Revisão: locais e mapas

- O mapa é complementar (`role="region"` com nome): endereço, complemento, anfitrião e links de rota ficam sempre em texto; ajustar o pino é opcional e quem não usa mouse escolhe o ponto pelo autocompletar do endereço.
- Endereço como `combobox` (setas, Enter, Esc) com dica ligada por `aria-describedby` e número de sugestões anunciado; também aceita texto livre.
- Botões "Editar" e "Remover" com o nome do local para leitores de tela; links de rota avisam que abrem em nova aba e dizem o destino.

### Pendências e limitações conhecidas

- **Leitor de tela real**: os testes cobrem o que é automatizável; falta uma passada manual com VoiceOver e NVDA nos fluxos de registrar partida e importar deck.
- **Mensagens de erro de formulário**: aparecem em `role="alert"`, mas ainda não são ligadas ao campo com `aria-describedby`/`aria-invalid` (a maioria dos erros vem do servidor e não é de um campo só).
- **Campos obrigatórios**: os opcionais estão marcados como "(opcional)"; considerar também um indicador visual nos obrigatórios em formulários longos.
- **Login com Google**: depende da tela do Google (fora do nosso controle).
