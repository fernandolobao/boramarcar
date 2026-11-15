# Design system de componentes (site e app)

Data: 15/11/2026 · Status: **proposta, aguardando aprovação**

## Por quê

No iPad, o campo "Quando" do site saiu desalinhado, com fonte e altura próprias: era o controle nativo do navegador (`datetime-local`) desenhado pelo WebKit. O #121 remendou com CSS, mas o problema é de fundo: data, hora, seleção e número dependem de como cada navegador desenha o HTML padrão. No app, os mesmos controles já são nossos, mas repetidos tela a tela (quatro "−/+ com valor", dois "grupos de escolha", dois "cartões de número").

O dono do projeto escolheu (15/11/2026) a **opção B**: um pacote único com a mesma API no site e no app, e limpeza das repetições do app.

## Objetivos

- Os controles têm a cara do ArcanaKin em qualquer navegador e aparelho, nos dois temas.
- Site e app usam os **mesmos nomes de componente e as mesmas propriedades**, com o mesmo comportamento (passos, limites, formatos de valor).
- Acessibilidade no mínimo igual à dos controles nativos de hoje (WCAG 2.2 AA, regras do `CLAUDE.md`).
- Cada tela que hoje usa um controle nativo divergente, ou uma cópia local no app, passa a usar o pacote.

## Fora do escopo

- Catálogo/Storybook dos componentes (opção C, não escolhida).
- Redesenho visual das telas: só os controles mudam.
- `<dialog>`, `<details>`, links e o resto do HTML que já se comporta igual em todo lugar.
- Tokens: continuam em `packages/tokens`, sem mudança.

## O que não pode acontecer

- Um controle novo ser **menos acessível** que o nativo (teclado, leitor de tela, foco visível, alvo de toque).
- Formulários `GET` (filtros do ranking e do histórico) pararem de enviar os valores.
- Horários convertidos fora da regra do projeto (sempre `zonedLocalToUtc` no fuso do usuário).

## Abordagens consideradas

Alcance (decidido pelo dono): A só o site; **B site e app com a mesma API**; C = B + catálogo.

Como construir B:

1. **Uma implementação só, com React Native Web no site.** Descartada: o site é Next.js com Tailwind e componentes de servidor; trazer o RNW para ele muda a base inteira por causa de meia dúzia de controles.
2. **Contrato e lógica compartilhados; implementação web e nativa separadas, tudo nosso.** Viável, mas recriar calendário, lista de seleção e campo numérico acessíveis no navegador (padrões ARIA de grid, combobox e spinbutton) é onde mais se erra.
3. **Contrato e lógica compartilhados; no site, os controles sobre o React Aria (`react-aria-components`), estilizados com os nossos tokens; no app, componentes nossos.** _Escolhida pelo construtor (pode ser vetada na aprovação)._ O React Aria (Adobe) entrega teclado, leitor de tela e foco dos padrões ARIA prontos e testados, sem impor visual; o HTML que sai é nosso. No app não há equivalente maduro e os controles nativos de toque já resolvem bem.

## Desenho

### Pacote `packages/ui`

```
packages/ui/
  src/
    shared/      contratos (tipos das props), lógica pura e testes (vitest)
    web/         componentes React DOM + react-aria-components + classes Tailwind
    native/      componentes React Native + tokens via useColors
```

- Exporta `@boramarcar/ui` (shared), `@boramarcar/ui/web` e `@boramarcar/ui/native`. O site só importa `web`; o app só importa `native`. Assim o Metro nunca vê código de DOM e o Next nunca vê React Native.
- O site precisa de `@source "../../../../packages/ui/src/web";` no `globals.css` para o Tailwind gerar as classes do pacote.
- **Textos**: o pacote não tem textos próprios. Cada componente recebe `label` e, quando precisa (mês anterior, fechar…), um objeto `labels`; os apps passam os seus textos (`messages/*.json` no site, `i18n.ts` no app), mantendo os testes de paridade. Nomes de meses e dias vêm de `Intl` com a prop `locale`.

### Componentes (mesma API nos dois lados)

| Componente            | Valor            | Site                                                                                        | App                                           | Substitui                                                                             |
| --------------------- | ---------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------- |
| `DateField`           | `'AAAA-MM-DD'`   | campo-botão + calendário em popover (`DatePicker` do React Aria)                            | campo-botão + calendário numa folha           | `type="date"` (3), datas digitadas das temporadas no app                              |
| `TimeField`           | `'HH:MM'`        | spinbutton com −/+ e setas do teclado (`step` em minutos, padrão 30)                        | −/+ (o `TimeStepper` atual)                   | `type="time"` (2), `TimeStepper`                                                      |
| `DateTimeField`       | `{ date, time }` | `DateField` + `TimeField` lado a lado                                                       | idem                                          | `datetime-local` (5), dias em chips + horário                                         |
| `Select`              | `string`         | botão + lista (`Select` do React Aria), com `name` gera campo oculto para formulários `GET` | campo-botão + folha com a lista               | `<select>` (29)                                                                       |
| `NumberField`         | `number`         | campo numérico com −/+ (`NumberField` do React Aria), aceita digitar                        | −/+ com valor; tocar no valor permite digitar | `type="number"` (11), `Stepper`/`Counter`/`PanelStepper` do app                       |
| `Choices`             | `string` (um)    | grupo de chips (`RadioGroup`)                                                               | chips com `radio`                             | escolhas em chips do app (histórico, coleção, configurações), radios em chips do site |
| `Checkbox` / `Switch` | `boolean`        | `Checkbox`/`Switch` do React Aria                                                           | `Switch` nativo / chip `checkbox`             | checkbox do site (11) e os "botões-checkbox" do app                                   |
| `Stat`                | —                | cartão de número (rótulo, valor, dica)                                                      | idem                                          | `Stat` duplicado no app (painel, perfil) e no site                                    |

Regras comuns: rótulo visível sempre associado; `description` (dica) e `error` ligados por `aria-describedby`/`aria-invalid`; `disabled` com cursor e contraste do projeto; alvo de toque ≥ 44 pt no app e ≥ 40 px no site; animações com `motion-reduce`.

### Lógica compartilhada (`shared`, com testes)

- Datas como texto `AAAA-MM-DD` e horas `HH:MM` (nunca `Date` dentro do componente): montar a grade do mês, mover por dia/semana/mês, limites `min`/`max`, comparar.
- `stepTime`, `clampNumber`, `stepNumber` (com `min`, `max`, `step`).
- Rótulos acessíveis montados do mesmo jeito nos dois lados (ex.: "Vitória: aumentar (agora 3)").

### Migração

Um PR por família, sempre com as telas migradas no mesmo PR:

1. Pacote, `shared` com testes, `NumberField` e `Choices` (os que mais se repetem no app), e o `@source` no site.
2. `DateField`, `TimeField`, `DateTimeField` (site: encontros, disponibilidade, organizar encontro, temporadas, beta; app: novo encontro, organizar encontro, disponibilidade, temporadas).
3. `Select` (29 usos no site; no app, onde houver lista longa) e ajuste dos 3 testes E2E que usam `selectOption`.
4. `Checkbox`/`Switch` e `Stat`; remoção das cópias locais restantes no app.

Testes: lógica no `shared` (vitest); componentes web em jsdom com Testing Library e axe (como `a11y.test.tsx`); E2E de acessibilidade das páginas como hoje; app com `tsc` e capturas pela prévia web temporária quando a mudança for visual.

## Decisões do construtor (para conferir na aprovação)

- React Aria só no site (abordagem 3).
- Valores de data e hora como texto, convertidos para UTC fora do componente, pela regra do projeto.
- `Select` com campo oculto `name` para os formulários `GET` (eles passam a precisar de JavaScript para escolher; hoje funcionam sem). Os filtros afetados são do ranking e do histórico.
- Textos sempre vindos do app, nunca do pacote.

## Deixado para quem constrói

- Detalhes visuais finos (raio, sombra do popover, tamanho das células do calendário) dentro dos tokens.
- Quais `<select>` do app viram `Choices` (poucas opções) e quais viram `Select` (lista longa).
