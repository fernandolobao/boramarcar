# Design system, fase 2: DateField, TimeField e DateTimeField — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar os campos nativos de data e hora (site) e os dias em botões e datas digitadas (app) pelos componentes do design system, com a mesma API nos dois lados.

**Architecture:** Contratos e lógica pura de datas (`'AAAA-MM-DD'`) e horas (`'HH:MM'`) em `packages/ui`; site com `DatePicker`/`TimeField` do React Aria em `apps/web/src/components/ds/`; app com campo-botão + calendário numa folha e −/+ de horário em `apps/mobile/src/components/ds/`. Conversão para UTC continua fora dos componentes (`zonedLocalToUtc`).

**Tech Stack:** React Aria Components 1.22.1 + `@internationalized/date` (site), React Native (app), Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-15-design-system-design.md` (componentes e migração, item 2)

## Global Constraints

- Valores sempre texto: data `'AAAA-MM-DD'`, hora `'HH:MM'`; `DateTimeField` = `{ date, time }`.
- Rótulo visível associado; `description` e `error` por `aria-describedby`/`aria-invalid`; alvo ≥ 40 px (site) e ≥ 44 pt (app); `motion-reduce`.
- Textos vêm dos apps (`messages/*.json`, `i18n.ts`); meses e dias por `Intl` com `locale`.
- Horários digitados continuam convertidos com `zonedLocalToUtc` no fuso do usuário.
- `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test`; E2E local (Postgres do Homebrew) antes do PR.

## Review Focus

- Data fora de `min`/`max` digitada no teclado: o campo mostra erro e o formulário não envia.
- Disponibilidade que termina depois da meia-noite (fim antes do início): continua valendo até o dia seguinte.
- iPad/Safari: o campo não usa mais o controle nativo do WebKit (o motivo da fase).
- Leitor de tela: cada segmento (dia, mês, ano, hora, minuto) com nome e o botão do calendário com nome.
- Fuso: a data escolhida perto da meia-noite não "pula" de dia na conversão para UTC.

---

### Task 1: Lógica e contratos (`packages/ui`)

**Files:** Create `packages/ui/src/dates.ts` (+ teste); Modify `packages/ui/src/index.ts`.

**Produces:** `isDateString`, `isTimeString`, `addDaysToDate(date, n)`, `addMonthsToDate(date, n)`, `compareDates`, `clampDate(date, min?, max?)`, `monthGrid(year, month, weekStartsOn)` (semanas × 7, `null` fora do mês), `stepTime(time, deltaMinutes)` (dá a volta em 24 h), e os contratos `DateFieldProps`, `TimeFieldProps`, `DateTimeFieldProps` (`label`, `value`, `onChange`, `min?`, `max?`, `description?`, `error?`, `disabled?`, `labels`).

- [ ] Testes: datas inválidas (2026-02-30), soma de dias e meses na virada de ano e em fevereiro, clamp, grade de nov/2026 começando no domingo e na segunda, `stepTime('23:30', 60) === '00:30'`.
- [ ] Run → FAIL; implementar; Run → PASS; commit.

### Task 2: Site

**Files:** Create `apps/web/src/components/ds/{date-field,time-field,date-time-field}.tsx` (+ testes); Modify `event-forms.tsx`, `event-manage.tsx`, `availability-forms.tsx`, `season-form.tsx`, `beta-control.tsx`, mensagens `ds.*`, `a11y.test.tsx`, `e2e/support/fill-date.ts` (novo), `e2e/beta.spec.ts`, `e2e/ranking.spec.ts`, `docs/ACCESSIBILITY.md`.

- [ ] Testes (jsdom): `DateField` mostra os segmentos com o rótulo e abre o calendário pelo botão "Escolher data"; escolher um dia chama `onChange('2026-11-20')`; `min` bloqueia dias anteriores. `TimeField` digitado chama `onChange('19:30')`. `DateTimeField` junta os dois.
- [ ] Implementar e migrar os 10 campos (as conversões para UTC ficam onde estão).
- [ ] E2E: helper que digita a data nos segmentos (ordem do idioma) e os dois specs ajustados; rodar o E2E local inteiro.
- [ ] Commit.

### Task 3: App

**Files:** Create `apps/mobile/src/components/ds/{date-field,time-field}.tsx`; Modify `fields.tsx` (`TimeStepper` passa a reexportar o `TimeField`), `encontros/novo.tsx`, `event-manage.tsx`, `availability/add-form.tsx`, `group-settings.tsx` (temporadas), `i18n.ts`.

- [ ] `DateField`: campo-botão com a data por extenso; toque abre uma folha com o mês (setas mês anterior/próximo, dias como botões com nome completo, fora de `min`/`max` desabilitados). `TimeField`: −/+ de 30 min com `stepTime` e o valor.
- [ ] Trocar os dias em botões (encontro novo, organizar encontro, disponibilidade avulsa) e as datas digitadas das temporadas.
- [ ] `pnpm --filter mobile typecheck`; prévia web temporária com capturas; commit; ajuda/capturas conferidas; verificação completa; PR.
