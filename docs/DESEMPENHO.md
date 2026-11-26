# Desempenho (medição de 26/11/2026)

Base para comparar antes do beta. Build de produção local (`pnpm build` + `pnpm start`), banco de
E2E semeado, Chrome sem GPU. Os tempos são **relativos** (máquina local, sem rede lenta): servem
para comparar páginas e versões, não como o que a pessoa sente no celular.

## Páginas públicas (`perf.mjs` da taste-skill, 1440 e 390 px, mediana de 2–3 cargas)

| Página                | LCP      | CLS   | Tarefas longas | JS (lido)           | Fontes              | Imagens |
| --------------------- | -------- | ----- | -------------- | ------------------- | ------------------- | ------- |
| `/`                   | 80–88 ms | 0,000 | 0              | **880 KiB** (aviso) | 66 KiB              | 17 KiB  |
| `/aprender`           | 66–74 ms | 0,000 | 0              | 685 KiB (aviso)     | 66 KiB              | —       |
| `/aprender/glossario` | 70–76 ms | 0,000 | 0              | 701 KiB (aviso)     | **250 KiB** (aviso) | —       |
| `/aprender/o-turno`   | 60–64 ms | 0,000 | 0              | 716 KiB (aviso)     | 66 KiB              | —       |
| `/lojas`              | 60–64 ms | 0,000 | 0              | 832 KiB (aviso)     | 66 KiB              | —       |

As duas "requisições quebradas" do `perf.mjs` são o Vercel Analytics e o Speed Insights, que só
existem no servidor da Vercel (falso alarme local).

## Páginas logadas (Playwright com a sessão do E2E, Pixel 7 e 1440 px)

| Página          | LCP        | CLS (desktop) | Bloqueio | JS (lido)              |
| --------------- | ---------- | ------------- | -------- | ---------------------- |
| Painel          | ~510 ms    | 0,040         | 0        | 1.269 KiB              |
| Deck            | 110–140 ms | 0             | 0        | 1.234 KiB              |
| Decks           | 90–110 ms  | 0             | 0        | 1.113 KiB              |
| Coleção         | ~110 ms    | 0             | 0        | 1.196 KiB              |
| Mesa de testes  | 100–120 ms | 0             | 0        | 1.132 KiB              |
| Encontro        | ~500 ms    | 0             | 0        | 1.466 KiB (com o mapa) |
| Modo mesa       | ~95 ms     | 0             | 0        | 1.136–1.439 KiB        |
| Disponibilidade | 116–408 ms | 0,041         | 0        | 1.123 KiB              |
| Ranking         | ~104 ms    | 0             | 0        | 1.293 KiB              |
| Grupo           | ~435 ms    | 0,041         | 0        | 1.433 KiB (com o mapa) |

## Leitura

- **Tudo aparece rápido e nada pula de lugar** (CLS ≤ 0,04, abaixo de 0,1); não há tarefas longas.
- **O alerta é o volume de JavaScript:** a base comum (React, Next, Sentry, next-intl, React Aria,
  ícones) passa de 600 KiB lidos, e as telas logadas chegam a 1,1–1,5 MB. O maior pacote (378 KiB)
  é o React com o núcleo do Sentry.
- **O que já está certo:** o Leaflet (mapa) só carrega quando o mapa aparece (`import('leaflet')`);
  o leitor da câmera só carrega ao abrir a câmera; imagens com tamanho e `lazy`.
- **Tentado e descartado (26/11):** as opções de tamanho do Sentry (`excludeReplay*`) só valem com
  webpack (a build é Turbopack); `"sideEffects": false` nos pacotes do monorepo tirou ~16 KiB do
  pacote do `zod`, sem ganho que valesse o risco.

## Próximos passos (quando valer a pena)

1. Fontes do glossário (250 KiB): conferir se a fonte dos símbolos de mana carrega inteira.
2. Dividir por página os componentes de cliente mais pesados (React Aria nas telas que só mostram
   dados, abas, `StackSections`), com `next/dynamic` onde não aparecem na primeira tela.
3. CLS de 0,04 no painel, na disponibilidade e no grupo (desktop): achar o elemento que muda de
   tamanho ao carregar.
4. Medir de novo no celular de verdade com o Speed Insights da Vercel depois do beta.
