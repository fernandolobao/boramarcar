# Design system, fase 1 (NumberField e Choices) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar `packages/ui` (contratos e lógica) e os componentes `NumberField` e `Choices` no site e no app, migrando todos os campos numéricos e grupos de escolha existentes.

**Architecture:** `packages/ui` exporta só tipos e funções puras (sem React em tempo de execução). O site implementa os componentes em `apps/web/src/components/ds/` sobre `react-aria-components`; o app em `apps/mobile/src/components/ds/` com React Native. Os dois lados usam `satisfies` com os tipos de props do pacote.

**Tech Stack:** TypeScript strict, Vitest (jsdom + Testing Library + axe no site), react-aria-components 1.22.1, React Native 0.88 / Expo 58, Tailwind v4 com as classes por função dos tokens.

**Spec:** `docs/superpowers/specs/2026-11-15-design-system-design.md`

## Global Constraints

- Cores só pelos tokens: no site, classes por função (`bg-surface`, `text-fg`, `text-fg-muted`, `border-line-strong`, `bg-primary`, `text-on-primary`…); no app, `useColors()`. Nada de `#…` novo nem `zinc-*`.
- Texto de interface só em `apps/web/messages/pt-BR.json` + `en.json` (teste de paridade) e `apps/mobile/src/lib/i18n.ts` (pt e en). O pacote não tem textos.
- WCAG 2.2 AA: rótulo visível associado; dica e erro por `aria-describedby`/`aria-invalid`; foco visível; alvo ≥ 40 px no site e ≥ 44 pt no app; `motion-reduce` em animações.
- Valores: `NumberField` usa `number | null` (`null` = vazio, para campos opcionais).
- Dependências do app só com `npx expo install`; o app fala com o servidor só pelo `@boramarcar/api-client` (não muda aqui).
- Antes do PR: `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test`; app com `npx expo export` (o CI faz).
- Um PR para `NumberField` (Tasks 1–4) e outro para `Choices` (Tasks 5–7).

## Review Focus

- Campo opcional apagado (turno da vitória, duração): tem de virar `null`, não `0`, e o formulário salvar sem ele.
- Digitar fora do limite (ex.: 300 cópias com máximo 250, ou 0 com mínimo 1): o valor é limitado ao sair do campo, nunca salvo fora do intervalo.
- Máximo que muda depois (proxies ≤ quantidade): ao baixar a quantidade, o valor de proxies não fica acima do novo máximo.
- Leitor de tela: os botões −/+ dizem o rótulo e o valor atual ("Cópias: aumentar (agora 3)").
- Grupo de escolha sem nenhuma opção marcada (resultado da partida antes de escolher): nenhuma marcada visualmente, e a validação do formulário continua acusando.

---

### Task 1: Pacote `packages/ui` com a lógica de número e escolha

**Files:**

- Create: `packages/ui/package.json`, `packages/ui/tsconfig.json`, `packages/ui/src/index.ts`, `packages/ui/src/number.ts`, `packages/ui/src/choices.ts`
- Test: `packages/ui/src/number.test.ts`, `packages/ui/src/choices.test.ts`
- Modify: `apps/web/package.json`, `apps/mobile/package.json` (dependência `"@boramarcar/ui": "workspace:*"`), `apps/web/next.config.ts:9` (`transpilePackages` + `'@boramarcar/ui'`), `vitest.config.ts` (cobertura `packages/ui/src/**` com o mesmo piso do core)

**Interfaces:**

- Produces:
  - `clampNumber(value: number, min?: number, max?: number): number`
  - `stepNumber(value: number | null, delta: number, opts: { min?: number; max?: number; step?: number }): number` (de `null` parte de `min ?? 0`)
  - `parseNumberInput(text: string): number | null` (vazio → `null`; não numérico → `null`; aceita só inteiros)
  - `stepperLabel(label: string, direction: 'down' | 'up', value: number | null, labels: { decrease: string; increase: string }): string` (substitui `{label}` e `{value}` nos textos recebidos)
  - `interface NumberFieldProps { label: string; value: number | null; onChange(value: number | null): void; min?: number; max?: number; step?: number; description?: string; error?: string; disabled?: boolean; labels: { decrease: string; increase: string } }`
  - `interface ChoiceOption<T extends string> { value: T; label: string; description?: string; disabled?: boolean }`
  - `interface ChoicesProps<T extends string> { label: string; value: T | null; onChange(value: T): void; options: readonly ChoiceOption<T>[]; description?: string; error?: string; orientation?: 'horizontal' | 'vertical' }`
  - `nextChoice<T>(options: readonly ChoiceOption<T>[], current: T | null, delta: 1 | -1): T | null` (pula desabilitadas, dá a volta)

- [ ] **Step 1: Write the failing tests**

```ts
// number.test.ts
expect(clampNumber(300, 0, 250)).toBe(250);
expect(clampNumber(-1, 0)).toBe(0);
expect(stepNumber(null, 1, { min: 1, max: 99 })).toBe(1);
expect(stepNumber(3, 1, { max: 3 })).toBe(3);
expect(stepNumber(30, -1, { step: 30, min: 30 })).toBe(30);
expect(parseNumberInput('')).toBeNull();
expect(parseNumberInput('  12 ')).toBe(12);
expect(parseNumberInput('1,5')).toBeNull();
expect(
  stepperLabel('Cópias', 'up', 3, {
    decrease: '{label}: diminuir (agora {value})',
    increase: '{label}: aumentar (agora {value})',
  }),
).toBe('Cópias: aumentar (agora 3)');
// choices.test.ts
const opts = [
  { value: 'a', label: 'A' },
  { value: 'b', label: 'B', disabled: true },
  { value: 'c', label: 'C' },
] as const;
expect(nextChoice(opts, 'a', 1)).toBe('c');
expect(nextChoice(opts, 'c', 1)).toBe('a');
expect(nextChoice(opts, null, 1)).toBe('a');
```

- [ ] **Step 2: Run** `pnpm --filter @boramarcar/ui test` — Expected: FAIL (módulos não existem)
- [ ] **Step 3: Implement** os arquivos acima; `package.json` no molde de `packages/api-client` (exports `".": "./src/index.ts"`, scripts `typecheck`/`test`, devDeps `typescript ~6.0.3`, `vitest 5.1.0`, `@types/react` só para tipos de `ReactNode` se precisar); `pnpm install`.
- [ ] **Step 4: Run** `pnpm --filter @boramarcar/ui test && pnpm typecheck` — Expected: PASS
- [ ] **Step 5: Commit** `feat(ui): pacote de contratos e lógica do design system`

### Task 2: `NumberField` no site

**Files:**

- Create: `apps/web/src/components/ds/number-field.tsx`
- Test: `apps/web/src/components/ds/number-field.test.tsx`
- Modify: `apps/web/package.json` (`react-aria-components@1.22.1`), `apps/web/messages/pt-BR.json` e `en.json` (`ds.decrease`, `ds.increase` com `{label}` e `{value}`), `apps/web/src/components/a11y.test.tsx` (inclui o componente)

**Interfaces:**

- Consumes: `NumberFieldProps`, `stepperLabel`, `parseNumberInput`, `clampNumber` (Task 1)
- Produces: `export function NumberField(props: NumberFieldProps & { id?: string; name?: string; className?: string }): JSX.Element` (`'use client'`); `export function useDsLabels(): { decrease: string; increase: string }` (lê `ds.*` com `useTranslations`)

- [ ] **Step 1: Write the failing test** (`// @vitest-environment jsdom`): renderiza com `label="Cópias"`, `value={3}`, `min={1}`, `max={4}`; espera `getByRole('textbox', { name: 'Cópias' })` com valor `'3'`; clicar no botão `'Cópias: aumentar (agora 3)'` chama `onChange(4)`; o botão de aumentar fica desabilitado com `value={4}`; digitar `''` e sair do campo chama `onChange(null)`; digitar `'9'` e sair chama `onChange(4)`; `axe` sem violações; com `error="Inválido"`, o campo tem `aria-invalid="true"` e a mensagem em `aria-describedby`.
- [ ] **Step 2: Run** `cd apps/web && npx vitest run src/components/ds/number-field.test.tsx` — Expected: FAIL
- [ ] **Step 3: Implement** sobre `NumberField`, `Input`, `Group`, `Button`, `Label`, `Text`, `FieldError` do React Aria; o valor interno é `number` com `NaN` para vazio (converter de/para `null`); `formatOptions={{ maximumFractionDigits: 0 }}`; estilo: grupo com `input` (classe `input` existente no campo) e botões `btn-secondary` quadrados de 40 px; rótulo com a classe `label`.
- [ ] **Step 4: Run** o teste e `npx vitest run src/components/a11y.test.tsx` — Expected: PASS
- [ ] **Step 5: Commit** `feat(site): NumberField do design system`

### Task 3: Migrar os campos numéricos do site

**Files:**

- Modify: `apps/web/src/components/deck-cards.tsx` (≈528, 547, 677), `print-picker.tsx` (≈244), `game-form.tsx` (≈363, 378), `table/table-mode.tsx` (≈172, 388), `collection-view.tsx` (≈762, 842, 978)
- Test: os testes existentes de cada um (`deck-visual.test.tsx`, `print-picker.test.ts`, `game-form.test.tsx`, `table/table-mode.test.tsx`, `collection-view.test.tsx`) e `apps/web/e2e/*.spec.ts` que preenchem esses campos

**Interfaces:**

- Consumes: `NumberField`, `useDsLabels` (Task 2)

- [ ] **Step 1:** Em cada formulário, trocar o estado de texto por `number | null` e o `<input type="number">` por `<NumberField>` com os mesmos limites (deck 0–`MAX_COPIES`, proxies 0–quantidade, cópias da edição 1–quantidade da linha, turno 1–99, duração 1–1440, vida inicial 1–999, coleção 1–999 e 1–cópias da linha); campos opcionais (turno, duração) aceitam `null`.
- [ ] **Step 2:** Ajustar os testes que esperavam `toHaveValue(40)` (número) para `toHaveValue('40')` e os que usavam `fireEvent.change` no input numérico para digitar e sair do campo (`fireEvent.blur`); nos E2E, `fill()` continua funcionando pelo rótulo.
- [ ] **Step 3: Run** `pnpm --filter @boramarcar/web test` e `pnpm typecheck` — Expected: PASS (ver Review Focus: opcional vazio → `null`; proxies acima do novo máximo são limitados)
- [ ] **Step 4: Commit** `refactor(site): campos numéricos usam o NumberField`

### Task 4: `NumberField` no app e fim das cópias de −/+

**Files:**

- Create: `apps/mobile/src/components/ds/number-field.tsx`
- Modify: `apps/mobile/src/lib/i18n.ts` (`dsDecrease`, `dsIncrease`; remover `stepDown`/`stepUp` quando não houver mais uso), `apps/mobile/src/components/group-settings.tsx` (`Stepper`), `apps/mobile/src/components/table/board.tsx` (`Stepper`/`PanelStepper`, mantendo o visual claro do painel via prop `tone="onDark"`), `apps/mobile/src/components/deck/deck-edit.tsx` (`Counter`), `apps/mobile/src/app/colecao.tsx` (−/+ de cópias)

**Interfaces:**

- Consumes: `NumberFieldProps`, `stepNumber`, `stepperLabel`, `parseNumberInput` (Task 1)
- Produces: `export function NumberField(props: NumberFieldProps & { tone?: 'default' | 'onDark'; compact?: boolean }): JSX.Element`

- [ ] **Step 1:** Implementar: rótulo, botões −/+ (`accessibilityLabel` de `stepperLabel`, desabilitados nos limites), valor tocável que vira `TextInput` numérico (`keyboardType="number-pad"`) e confirma ao sair, com `clampNumber`.
- [ ] **Step 2:** Trocar as quatro implementações locais pelo componente, sem mudar limites nem textos visíveis.
- [ ] **Step 3: Run** `cd apps/mobile && npx tsc --noEmit` e `pnpm lint` — Expected: PASS; `rtk grep -rn "function \(Stepper\|Counter\|PanelStepper\)" apps/mobile/src` — Expected: nenhum resultado
- [ ] **Step 4:** Prévia web temporária (como no `CLAUDE.md`) com capturas de configurações do grupo, painel do jogador na mesa e edição de deck; restaurar `package.json`/`pnpm-lock.yaml` e apagar a rota.
- [ ] **Step 5: Commit, PR 1** `feat(app): NumberField do design system`; atualizar `docs/ACCESSIBILITY.md`; abrir PR com Tasks 1–4.

### Task 5: `Choices` no site

**Files:**

- Create: `apps/web/src/components/ds/choices.tsx`
- Test: `apps/web/src/components/ds/choices.test.tsx`; incluir em `a11y.test.tsx`

**Interfaces:**

- Consumes: `ChoicesProps`, `ChoiceOption` (Task 1)
- Produces: `export function Choices<T extends string>(props: ChoicesProps<T> & { name?: string; variant?: 'chips' | 'cards' }): JSX.Element` sobre `RadioGroup`/`Radio` do React Aria (`name` mantém o envio em formulários)

- [ ] **Step 1: Write the failing test:** `getByRole('radiogroup', { name })`; três `radio` com nomes das opções; a marcada tem `aria-checked`/`checked`; setas movem e escolhem pulando a desabilitada; `value={null}` não marca nenhuma; axe sem violações.
- [ ] **Step 2–4:** Run (FAIL) → implementar (`chips`: pílulas com `border-line-strong`, marcada com `bg-primary text-on-primary`; `cards`: o visual de cartão com borda dos radios atuais) → Run (PASS)
- [ ] **Step 5: Commit** `feat(site): Choices do design system`

### Task 6: Migrar grupos de escolha do site

**Files:**

- Modify: `apps/web/src/components/game-form.tsx` (≈262, 314), `table/table-mode.tsx` (≈337, 354), `deck-tools.tsx` (≈112, 122), `collection-view.tsx` (≈502), `deck-visual.tsx` (≈110), `feedback-form.tsx` (≈67), `theme-picker.tsx` (≈60), `consent-settings.tsx` (≈39). Fica de fora `print-picker.tsx` (grade de imagens, não é escolha simples).
- Test: testes existentes de cada um

- [ ] **Step 1:** Trocar cada grupo de `<input type="radio">` pelo `Choices` (`cards` onde hoje há cartões com borda, `chips` nos demais), mantendo valores, `name` e textos.
- [ ] **Step 2:** Ajustar testes que buscavam o `radio` pelo rótulo (continua `getByRole('radio', { name })`).
- [ ] **Step 3: Run** `pnpm --filter @boramarcar/web test && pnpm typecheck` — Expected: PASS
- [ ] **Step 4: Commit** `refactor(site): grupos de escolha usam o Choices`

### Task 7: `Choices` no app e migração dos 27 grupos

**Files:**

- Create: `apps/mobile/src/components/ds/choices.tsx`
- Modify: os arquivos com `accessibilityRole="radiogroup"` listados em `rtk grep -rln 'accessibilityRole="radiogroup"' apps/mobile/src` (inclui as cópias locais `Choices` de `encontros/historico.tsx` e `colecao.tsx`)

**Interfaces:**

- Produces: `export function Choices<T extends string>(props: ChoicesProps<T> & { scroll?: boolean }): JSX.Element` (`scroll` = linha horizontal rolável, como os dias do encontro)

- [ ] **Step 1:** Implementar com `View accessibilityRole="radiogroup"` e `Pressable` `radio` com `checked`, visual do `Button` atual (`selected`).
- [ ] **Step 2:** Migrar os grupos, sem mudar textos nem valores; o grupo de "grupo ativo" da aba Conta continua chamando `select`.
- [ ] **Step 3: Run** `cd apps/mobile && npx tsc --noEmit`, `pnpm lint`; `rtk grep -rn 'accessibilityRole="radiogroup"' apps/mobile/src` — Expected: só dentro de `components/ds/choices.tsx`
- [ ] **Step 4:** Prévia web com capturas de "Novo encontro", ranking e importar deck; restaurar arquivos.
- [ ] **Step 5: Commit, PR 2** `feat: Choices do design system no site e no app`; atualizar `docs/ACCESSIBILITY.md`.
