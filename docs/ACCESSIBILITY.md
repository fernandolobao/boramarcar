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
- **Bracket**: valor e motivos em texto; a fonte dos dados (Spellbook ou só Game Changers) é dita na tela. Na lista de progresso, a trilha é uma `<ol>` com `aria-current="step"` nos brackets estimados (o número e o nome também em texto para leitor de tela), o total é um `role="meter"` e cada critério é um item com título `<h3>`, estado em texto ("Conta", "Livre", "Não conferido") e contador em texto — as casas coloridas são decorativas (`aria-hidden`). As animações (entrada dos cards, casas e trilha) só rodam sem `prefers-reduced-motion`. axe sem violações com critérios marcados, claro/escuro, 1280 e 360 px.
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

### Revisão: painel, nomes clicáveis e foil

- Painel: números em texto (o anel de aproveitamento, as barras de atividade e o pódio são decorativos, com tabela ou texto equivalente); a forma recente usa letras (V/D/E) além da cor e tem o texto por extenso para leitores de tela; avatares decorativos com os nomes em `sr-only`.
- Nomes de jogador são links com sublinhado (não só cor); nomes de carta são botões (`aria-haspopup="dialog"`) com sublinhado pontilhado, cujo nome acessível é o próprio nome da carta. O diálogo devolve o foco ao botão ao fechar.
- Foil: caixa de seleção com rótulo visível e o nome da carta para leitores de tela; selo com "✦ Foil" em texto; o brilho é decorativo e para com "reduzir movimento".
- Achado e corrigido: o diálogo da carta dentro de um parágrafo causava erro de hidratação (o React refazia a página e perdia o tema escuro escolhido). Agora ele é criado no primeiro clique, fora do texto.

### Revisão: rebranding ArcanaKin (cores e logotipo)

- Cores vêm dos design tokens (`packages/tokens`), com testes de contraste para todos os pares usados: texto ≥ 4,5:1 (inclusive o secundário sobre o Pergaminho, as superfícies e o hover), bordas de campos e anel de foco ≥ 3:1, nos temas claro e escuro.
- O Dourado só aparece como preenchimento com texto Noite por cima (11:1) ou como texto em versões escuras (`accentText`); o Mana como texto usa tons escuros no claro e claros no escuro.
- O logotipo é SVG com a cor do texto: com nome ("ArcanaKin") quando sozinho num link ou como título da tela de entrada do app; decorativo (`aria-hidden`) quando o nome já está na página.
- O vídeo do topo continua decorativo, com botão de pausar e o texto sobre camadas escuras.

### Revisão: trocar lugares no modo mesa

- No modo de troca, cada área vira um botão com nome ("Escolher Ana para trocar de lugar") e estado (`aria-pressed`/`selected`); o botão central vira "Pronto" com texto visível; a troca é anunciada numa região viva ("Ana e Bia trocaram de lugar.") e "Desfazer" volta a ordem.

### Revisão: deck no app

- Cada carta é um botão com quantidade, nome, edição e proxies no nome ("2 × Sol Ring, CMM, 1 proxy") e dica de que abre a carta; a carta grande tem a imagem com o nome como rótulo, botão para ver o verso e o texto da carta em texto.
- A barra da nota é decorativa (o número está em texto); cada faixa da curva é lida como "Custo 3: 12 cartas". Problemas de validação têm ícone e texto, não só cor.

### Revisão: disponibilidade no app

- Dia, frequência, dias da semana e locais como `radio`/`checkbox` com estado; horários com botões −/+ de meia em meia hora (sem relógio nativo), com nome que diz o horário atual e valor anunciado.
- Remover pede confirmação em dois toques ("Confirmar remoção") com o contexto no nome do botão; "Não posso nesta data" e "voltar a poder" dizem a data. Mensagens de resultado em região viva; erros como alerta.

### Revisão: configurações no app (13/11/2026)

- Fuso em texto com rótulo ("Fuso horário: America/Sao_Paulo") e botão para usar o fuso do aparelho quando difere (sem lista nativa gigante); idioma como `radiogroup`/`radio`; avisos por e-mail como `Switch` com rótulo e dica. "Salvar" só habilita com mudança; resultado em região viva.

### Revisão: seu grupo no app (13/11/2026)

- Convite: link selecionável e código lidos com rótulo ("Código de convite: A B C D…", letra a letra); compartilhar usa a folha nativa do sistema. Gerar novo convite e todas as ações destrutivas (remover membro, sair, passar a posse, remover local) usam o `ConfirmButton` compartilhado em dois toques, com o nome do alvo no nome acessível; dono(a) com outras pessoas no grupo vê "Sair" desabilitado e o motivo em texto.
- Membros: o nome é um botão que abre o perfil ("Ver perfil de …"); papel em texto; só as ações permitidas aparecem (mesmas regras do site, conferidas de novo no servidor). Erros por membro em `alert`.
- Locais: campos com rótulo visível; "Adicionar" desabilitado sem nome; resultado em região viva.

### Revisão: perfil do jogador no app (13/11/2026)

- Aberto pelo ranking (cada linha é um botão com o resumo da posição e a dica "Ver perfil de …") e por "Meu perfil" na aba Conta. Foto/iniciais são decorativas (nome no título ao lado).
- Resumo em caixas lidas como "Partidas: 12" (rótulo e valor num só elemento); títulos, grupos e papéis em texto.
- Cada conquista é um elemento só, lido como "Nome. Descrição. Conquistada em … · 3 vezes" ou "Bloqueada · Progresso: 12 de 50"; a estrela cheia/vazia e a opacidade só reforçam o texto. Contraste AA (tokens `accent`/`onAccent`).
- Decks visíveis como botões com nome ("Abrir deck …"); 404 (sem grupo em comum) vira um aviso em texto, não um erro genérico.

### Revisão: histórico de encontros no app (13/11/2026)

- Filtros como `radiogroup`/`radio` com estado (situação, jogador) e campo de busca com rótulo visível e dica; a busca espera meio segundo depois de digitar, sem botão extra. "Limpar filtros" só aparece quando há filtro.
- Total de resultados em título com região viva (anuncia "12 encontros" ou "Nenhum encontro com esses filtros" a cada busca); cada encontro é um link com nome completo (título, situação, data, local, partidas, presenças e vencedores). Situação em texto, não só em cor.
- Paginação como `toolbar` com Anterior/Próxima (desabilitados nas pontas) e "Página X de Y" em região viva.

### Revisão: app mobile (primeira versão)

- Botões com alvo mínimo de 44 pt, `accessibilityRole="button"` e estado (`disabled`, `selected`/`checked`); escolhas únicas (presença, grupo ativo) como `radiogroup`/`radio`.
- Títulos de tela e de seção com `accessibilityRole="header"`; itens de lista com um rótulo completo (encontro: título, data, local e situação; ranking: posição, nome, pontos e vitórias).
- Erros e confirmações em regiões vivas (`accessibilityRole="alert"`, `accessibilityLiveRegion`); carregamento com rótulo.
- Cores com contraste AA nos temas claro e escuro (segue o tema do aparelho); texto escala com o tamanho de fonte do sistema (até 2×).
- Modo mesa no app: cada metade da área é um botão com nome e vida atual ("Tirar 1 de vida de Ana (vida 38)"), a vida é anunciada numa região viva, segurar (ou tocar duas vezes e segurar, com leitor de tela) soma 10; nome do jogador abre a folha com marcadores em botões −/+ com nome e valor; monarca e desistir como `switch`; escolhas (tipo de jogo, jogadores, decks, vencedor) como `radio`/`checkbox`. Texto branco sobre as cores das áreas com contraste AA (mesmas cores do site).
- Marcar encontro e registrar partida (11/11/2026): campos de texto com rótulo visível que também é o nome acessível (`TextField`); dia, horários, local, tipo de jogo, deck, vencedor e quem começou como `radiogroup`/`radio`; jogadores e "Definir horário de término" como `checkbox`; horários com botões −/+ nomeados ("Começa às: meia hora mais cedo (agora 19:00)") e valor anunciado; o número do assento aparece no texto do botão do jogador ("2. Ana"), não só na cor; erros de validação em `alert` antes de enviar, com as mesmas regras do servidor; os botões de deck incluem o nome do jogador ("Deck de Ana: Atraxa").
- Pendente: passada manual com TalkBack e VoiceOver, e testes automatizados de acessibilidade no app.

### Revisão: página inicial

- Vídeo do topo decorativo (`aria-hidden`, sem som) com botão de pausar/reproduzir com nome (WCAG 2.2.2); com "reduzir movimento" ele não toca sozinho. O texto fica sobre camadas escuras para manter o contraste em qualquer quadro do vídeo.
- Um `h1`, seções com `h2` (rótulo de cada seção) e numeração decorativa (`aria-hidden`); navegação por âncoras em `<nav>` com nome; a barra da nota é decorativa e os números estão em texto ao lado.
- Links externos avisam que abrem em nova aba; o mesmo conteúdo para quem entrou ou não, com "Ir para o painel" ou "Entrar no painel" no menu superior.

### Revisão: locais e mapas

- O mapa é complementar (`role="region"` com nome): endereço, complemento, anfitrião e links de rota ficam sempre em texto; ajustar o pino é opcional e quem não usa mouse escolhe o ponto pelo autocompletar do endereço.
- Endereço como `combobox` (setas, Enter, Esc) com dica ligada por `aria-describedby` e número de sugestões anunciado; também aceita texto livre.
- Botões "Editar" e "Remover" com o nome do local para leitores de tela; links de rota avisam que abrem em nova aba e dizem o destino.

### Revisão: modo mesa

- Cada área é uma `region` com nome; "−" e "+" são botões com nome completo ("Tirar 1 de vida de Ana (vida 38). Segure para tirar 10.") e a vida é anunciada numa região viva, com o motivo da eliminação.
- O número grande é decorativo (`aria-hidden`) porque está no anúncio e no nome dos botões; segurar tem alternativa (vários toques, ou o diálogo de marcadores).
- Diálogos nativos (`<dialog>`) com nome, Esc fecha; marcadores com botões "Aumentar/Diminuir {nome}" e valor anunciado.
- Cores das áreas com texto branco em contraste AA; a eliminação aparece com texto, não só escurecendo a área.
- **Tela cheia e tela acesa (13/11/2026)**: a tela cheia é pedida no toque em "Começar" (gesto do usuário) e tem um botão no menu com `aria-pressed`; onde não há a API (Safari e Chrome do iPhone) o menu explica, em texto, como instalar na tela inicial. A tela acesa usa o wake lock ou, sem ele, um vídeo mudo de 1 px com `aria-hidden` e fora da ordem de foco; o resultado ("tela acesa" ou o que fazer quando não deu) fica numa região `status` do menu, sem modal. Como app instalado, o tabuleiro respeita as áreas seguras (`viewport-fit=cover` + `env(safe-area-inset-*)`).

### Pendências e limitações conhecidas

- **Leitor de tela real**: os testes cobrem o que é automatizável; falta uma passada manual com VoiceOver e NVDA nos fluxos de registrar partida e importar deck.
- **Mensagens de erro de formulário**: aparecem em `role="alert"`, mas ainda não são ligadas ao campo com `aria-describedby`/`aria-invalid` (a maioria dos erros vem do servidor e não é de um campo só).
- **Campos obrigatórios**: os opcionais estão marcados como "(opcional)"; considerar também um indicador visual nos obrigatórios em formulários longos.
- **Login com Google**: depende da tela do Google (fora do nosso controle).

## Privacidade e LGPD (11/11/2026)

- **Aviso de cookies**: região com título (`<section aria-labelledby>`), não modal, no fim da ordem de foco. Enquanto está na tela, a página reserva o espaço dele (`scroll-padding-bottom` e `padding-bottom`), para nenhum elemento focado ficar escondido atrás do aviso (2.4.11). "Aceitar" e "Recusar" têm o mesmo estilo e texto visível.
- **Configurações → Privacidade e dados**: escolha de cookies em `fieldset/legend` com rádios e confirmação em `role="status"`. "Excluir minha conta" usa a confirmação em dois cliques do projeto, com o aviso em `role="alert"` ligado ao botão por `aria-describedby`.
- **Botão "Voltar"**: link com texto visível, alvo ≥ 24px, no mesmo lugar em todas as páginas internas (3.2.3).
- **/privacidade**: um `h1`, seções numeradas com `h2` e índice com links para as âncoras; entra no teste axe de páginas públicas.

## Seções em pilha e fluxo de mana (11/11/2026)

- **Pilha**: é só layout ligado à rolagem, sem animação automática. Títulos continuam `h2` na ordem do documento. A seção coberta esmaece no máximo 40% e só depois de metade coberta: o título na faixa mantém ≥ 4,5:1 nos dois temas (claro 5,4:1; escuro 6:1). Foco de teclado que cairia atrás da seção seguinte faz a página rolar até ele aparecer (2.4.11); a seção não sai do lugar na pilha (12/11/2026: antes ela vinha para a frente e ficava por cima das outras durante a rolagem). Seção mais alta que a tela não gruda, então nada fica escondido embaixo das faixas. No app, com "reduzir movimento", a pilha é desligada. Disponibilidade, encontros, ranking e grupo (11/11/2026): mesma estrutura de títulos; no ranking, o `h2` "Estatísticas" passou para a primeira carta (os blocos seguem com `h3`), e no encontro o aviso de cancelado fica fora da pilha, logo abaixo do título. E2E de acessibilidade (axe, claro/escuro, desktop/celular) sem violações.
- **Fluxo de mana**: decorativo (`aria-hidden`/`accessibilityElementsHidden`, `pointer-events: none`), atrás do conteúdo, que fica em cartões opacos. Fios finos e semitransparentes (mais discretos no celular e no tema escuro). Movimento lento (2.2.2 não se aplica: é fundo, mas pausa fora da tela e com a aba escondida) e parado com `prefers-reduced-motion` / "reduzir movimento" (2.3.3). O axe não enxerga o canvas: o contraste de textos soltos sobre a faixa foi conferido à mão nas capturas (deck, coleção, perfil, painel; claro e escuro).

## Cartas holográficas e transições (11/11/2026)

- **Holo**: decorativo (camadas `aria-hidden`, nada depende do efeito). Inclinação pequena (até ~11°), sem piscar. Desligado por completo com `prefers-reduced-motion` (sem listeners de mouse nem de orientação). No celular, segue a orientação do aparelho só nas cartas à vista; no iPhone, a permissão de movimento é pedida no primeiro toque numa carta e pode ser negada sem prejuízo.
- **Holo mais suave** (12/11/2026): reflexo e camada foil ~20% mais fracos.
- **Virar a carta** (12/11/2026): giro curto (~300 ms) só visual; o estado continua no `aria-pressed` dos botões e a imagem troca o texto alternativo como antes. Desligado com "reduzir movimento".
- **Zoom da carta** (12/11/2026): só visual; o foco vai para o diálogo e volta para quem abriu como antes. Esc e clique no fundo fecham com a mesma animação; com "reduzir movimento", sem animação.
- **Diálogos** (12/11/2026): a página de trás não rola com o diálogo aberto (o espaço da barra de rolagem é mantido, sem pulo). Diálogo da carta no celular em uma coluna, carta no topo com altura limitada; sem rolagem horizontal em 320 px.
- **Transições entre telas**: esmaecer e deslize de 40 px, ≤ 400 ms; com "reduzir movimento", duração zero. O foco e o anúncio da página nova são os de sempre (a transição é só visual), e cliques não ficam bloqueados durante a animação.

## Identidade visual (11/11/2026)

- **Arte no topo** (painel e encontro): decorativa (`aria-hidden`, fundo em CSS), sob uma camada escura que mantém o texto claro com ≥ 7:1 mesmo sobre uma arte branca.
- **Barras nas cores do deck**: cada cor de mana tem um tom por tema com ≥ 3:1 contra a superfície (WCAG 1.4.11, teste em `tokens/flow.test.ts`); o valor de cada barra continua em texto. Decks de três ou mais cores usam um degradê dourado: no tema claro, o contorno de 1 px (`gold-700`, 5,4:1) dá o contraste; no escuro, todos os tons do degradê passam de 3:1 (o tom único escuro do claro parecia marrom). A barra selecionada da curva tem contorno, além do `aria-pressed` do botão.
- **Pódio**: texto escuro (noite) sobre ouro (8,1:1), prata (9,4:1) e bronze (6,3:1); reflexo animado só sem "reduzir movimento".
- **Estados vazios**: símbolos de mana decorativos (`aria-hidden`); a mensagem é o texto.
- **Fonte de display**: só nos títulos; `font-display: swap` e fontes de reserva serifadas (Georgia).

## Fechar diálogos clicando fora (11/11/2026)

- Todos os `<dialog>` modais do site (carta, edição, opções do jogador na mesa) fecham com um clique no fundo escurecido (`useLightDismiss`), além do Esc e do botão "Fechar", que continuam sendo o caminho para teclado e leitor de tela. O clique só conta se começou e terminou fora da caixa: arrastar uma seleção de texto para fora não fecha. Ao fechar, o foco volta para o botão que abriu.
- No app, os modais são de tela cheia (sem fundo à mostra); fecham pelo botão "Fechar" e pelo voltar do Android.

## Carregamento e ações (11/11/2026)

- **Toda ação na API** (`useApiAction`) deixa o botão que a disparou com `aria-busy="true"`. O ícone do botão vira um indicador girando (parado com "reduzir movimento") e o botão fica desabilitado **durante a espera pelo servidor**; antes, só ficava desabilitado depois da resposta. Uma ação de cada vez: clique duplo e Enter + "perdeu o foco" não repetem a ação.
- **Barra no topo** (`ActivityBar`) durante ações e mudanças de página (link interno para outra página), decorativa (`aria-hidden`), com "Carregando…" numa região de status para leitores de tela. Testes E2E que procuram mensagens de status devem filtrar pelo texto, porque essa região existe em todas as páginas.
- **Ações no diálogo da carta** (deck e coleção) são todas botões: "Edição: …" deixou de parecer link.

## Segurança (12/11/2026)

- A CSP e os cabeçalhos novos não mudam a interface. A `Permissions-Policy` não bloqueia os sensores de movimento (inclinação das cartas holográficas no celular). E2E de acessibilidade completo sem violações com a CSP aplicada.

## Avisos no celular (12/11/2026)

- **App**: "Avisos neste celular" é um `Switch` nativo com nome e dica acessíveis (`accessibilityLabel`/`accessibilityHint`); o texto da dica também aparece na tela. A permissão do sistema só é pedida quando a pessoa liga. Permissão negada e falhas aparecem como `accessibilityRole="alert"`, com botão para abrir as configurações do celular.
- **Notificações**: título e texto curtos, sem depender de cor ou ícone; tocar abre a tela do encontro ou a disponibilidade. Sem som próprio com o app aberto.

## Ranking: títulos das estatísticas (12/11/2026)

- "Sequências e mesa", "Confronto direto", "Decks mais jogados" e "Comandantes do grupo" agora usam o mesmo estilo de título das outras seções (`section-title`, fonte de display), porque cada um é uma carta da pilha e o título é o que fica à mostra na faixa. Continuam `h3` dentro de "Estatísticas" (`h2`), sem pular níveis. Não viraram `<section>` com nome para não duplicar a região "Confronto direto" da tabela com rolagem.

## Onboarding: convite e primeiros passos (12/11/2026)

- **Primeiros passos**: seção com `h2`, progresso em texto ("1 de 4 feitos"; a barra é decorativa), lista ordenada de links em que cada passo diz "Feito"/"A fazer" para leitores de tela, além do ícone e do riscado. "Dispensar" tem nome com contexto ("Dispensar os primeiros passos", contendo o texto visível) e devolve o foco ao `<main>` quando a seção some.
- **Convite**: um `h1`, contexto em texto simples, "Como funciona" com `h2` e lista ordenada. Boas-vindas na disponibilidade com `h2` e links-âncora para as seções do formulário.
- axe em jsdom (componente) e no E2E (painel e convite, claro/escuro, desktop/celular) sem violações.

## Feedback do beta (12/11/2026)

- **Site**: `h1`, tipo em `fieldset`/`legend` com rádios nativos, mensagem com `label` e dica ligada por `aria-describedby`, botão com texto. Depois de enviar, a confirmação vira `role="status"` e recebe o foco. Link no menu da conta (com `aria-current` na própria página) e no rodapé.
- **App**: tipo como `radiogroup` de botões com `accessibilityState.checked`, campo com rótulo visível e dica, confirmação e erro com `accessibilityRole="alert"`.
- axe em jsdom (componente) e no E2E (`/feedback`, `/admin`, claro/escuro, desktop/celular) sem violações.

### Revisão: beta assistido (8.5)

- `/admin`: grupos num `<fieldset>`/`<legend>` com checkboxes rotulados; data com `<label>` e dica em `aria-describedby`; "Encerrar beta" em dois cliques; confirmação em `role="status"` com foco. A tabela por grupo tem `<caption>` e `th scope`, e cabe em 360 px sem rolagem horizontal (uma região rolável exigiria foco por teclado).
- Faixa do painel: `<section>` com título, link "Enviar feedback" e "Dispensar" com nome acessível; ao dispensar, o foco vai para o conteúdo principal.
- axe sem violações no `/admin` com o beta rodando (E2E `beta.spec.ts`) e no `a11y.spec.ts`.
