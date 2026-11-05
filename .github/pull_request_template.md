## O que muda

<!-- Descreva a mudança e o motivo. Relacione a issue/fase do roadmap (ex.: "Fase 1 — Disponibilidade"). -->

## Como testar

- [ ] `pnpm test`
- [ ] Passos manuais:

## Checklist

- [ ] Testes unitários/integração cobrindo a mudança
- [ ] Migration gerada (`pnpm db:generate`) se o schema mudou
- [ ] UI nova/alterada auditada (CLAUDE.md → Acessibilidade): componente em `a11y.test.tsx`, rota em `e2e/a11y.spec.ts`, teclado e 320px conferidos
- [ ] Textos novos em `apps/web/messages/pt-BR.json` **e** `en.json`
- [ ] `docs/ROADMAP.md` atualizado, se aplicável
