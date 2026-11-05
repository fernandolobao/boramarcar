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

### Pendências e limitações conhecidas

- **Leitor de tela real**: os testes cobrem o que é automatizável; falta uma passada manual com VoiceOver e NVDA nos fluxos de registrar partida e importar deck.
- **Mensagens de erro de formulário**: aparecem em `role="alert"`, mas ainda não são ligadas ao campo com `aria-describedby`/`aria-invalid` (a maioria dos erros vem do servidor e não é de um campo só).
- **Campos obrigatórios**: os opcionais estão marcados como "(opcional)"; considerar também um indicador visual nos obrigatórios em formulários longos.
- **Login com Google**: depende da tela do Google (fora do nosso controle).
