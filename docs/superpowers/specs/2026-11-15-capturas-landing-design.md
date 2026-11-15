# Capturas do produto na página inicial

Data: 15/11/2026 · Status: **proposta, aguardando aprovação** (caminho A escolhido pelo dono do projeto)

## Por quê

Quem chega à página inicial só lê texto e uma prévia montada do topo: não vê o produto por dentro. O dono do projeto quer capturas reais da coleção, do modo mesa, da avaliação de decks e do que mais for importante, para a pessoa entender do que se trata antes de criar conta.

## Objetivos e limites

- Mostrar 6 telas reais: **painel** (próximo encontro e seus números), **disponibilidade** (horários em que a mesa fecha), **avaliação de deck** (nota, curva, bracket), **coleção** (galeria com valor), **modo mesa** (iPad deitado, 4 jogadores em cruz) e **ranking** (estatísticas do grupo).
- **Nenhum dado real**: tudo de um grupo fictício semeado só para as capturas. Nada de produção.
- Temas claro e escuro: a página mostra a captura do tema em que a pessoa está.
- Leve: WebP otimizado, carregamento preguiçoso fora da primeira dobra, dimensões fixas (sem pulo de layout).
- Reprodutível: um comando regenera tudo quando a interface mudar.

## Abordagens

- **A. Capturas reais de um grupo fictício** — _escolhida_.
- B. Prévias vivas com componentes e dados fictícios — descartada: mais peso na página e telas complexas (análise, coleção) difíceis de montar fora do app.

## Desenho

**Dados fictícios** (`apps/web/scripts/showcase/seed.ts`): grupo "Mesa de Quinta" com 6 pessoas de nomes inventados, disponibilidade semanal que fecha a mesa, próximo encontro com presenças, ~25 partidas em 3 meses (vencedores variados, comandantes, turnos), 3 decks importados por lista de verdade (o import busca as cartas no Scryfall, então imagens, curva e análise são reais) e uma coleção com ~120 cartas. O modo mesa vem de um estado salvo no navegador antes da captura.

**Captura** (`apps/web/scripts/showcase/capture.ts`, Playwright): sobe o site (`next start`) contra o banco semeado, entra com a sessão da pessoa fictícia e tira as 6 telas nos dois temas: computador 1280×800 (iPad 1180×820 deitado para o modo mesa). Converte para WebP com o `sharp` que o Next já traz e grava em `apps/web/public/showcase/`. Comando: `pnpm showcase` (precisa de `DATABASE_URL` de um banco descartável; o script recusa rodar se a URL parecer de produção).

**Geração aqui**: instalo o Postgres pelo Homebrew nesta máquina (banco local descartável) para rodar o script. Alternativa, se preferir não instalar: um workflow manual no GitHub Actions que roda o mesmo script e anexa as imagens.

**Página inicial**: seção nova "Veja por dentro", depois de "Recursos": abas acessíveis (padrão ARIA de abas, setas e Home/End) com as 6 telas; cada aba mostra a captura com legenda curta do que a pessoa está vendo. No celular, as abas rolam na horizontal. Imagens com `next/image`, texto alternativo descritivo (o que a tela mostra, não "captura de tela"), a do tema ativo visível e a outra escondida por CSS (`dark:`). Textos em pt-BR e en.

## Decisões do construtor (para conferir na aprovação)

- As 6 telas acima (painel e ranking entram por serem o coração do grupo).
- Instalar o Postgres pelo Homebrew para gerar as capturas aqui.
- Abas em vez de grade, para não alongar demais a página.
- Imagens comitadas no repositório (≈ 12 arquivos WebP; estimativa abaixo de 1,5 MB no total).

## Deixado para quem constrói

- Recortes exatos de cada tela e textos finais das legendas.
