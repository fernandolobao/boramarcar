# Mesa de testes solo (11.4) — desenho

Data: 26/11/2026. Situação: **aprovado pelo dono** (abordagem A e a ligação com o glossário e a trilha).

## Intenção

"Ver o deck girar": jogar turnos de mentira sozinho, para sentir se a curva, os terrenos e o
ramp funcionam, sem ninguém do outro lado. É o passo seguinte do "Sortear mão inicial" (11.3).
Para quem está aprendendo, a mesa também ensina, ligada ao glossário e à trilha.

## Não objetivos

- Regras automáticas: não confere custo, pilha, combate nem fases. Joga-se como numa mesa de verdade.
- Jogar contra outra pessoa ou guardar partidas.
- Arrastar e soltar na primeira versão (pode vir depois, como extra).

## Abordagens

|                                                       | Como é                                              | Prós                                                                         | Contras                                                                     |
| ----------------------------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **A. Página com zonas e menus por carta** (escolhida) | uma área por zona; cada carta abre um menu de ações | igual no celular e no computador, com teclado e leitor de tela; pouco código | sem arrastar na primeira versão                                             |
| B. Estender a janela da mão inicial                   | a janela ganha campo e cemitério                    | reaproveita a tela                                                           | apertado, sobretudo no celular                                              |
| C. Mesa virtual de arrastar e soltar                  | cartas soltas, arrastando entre zonas               | mais visual                                                                  | difícil com teclado e leitor de tela (WCAG), ruim no celular, bem mais caro |

## Como funciona

- **Entrada:** botão **"Testar o deck"** no deck, ao lado de "Sortear mão inicial", abre
  `/decks/:id/testar` (tela cheia). Qualquer deck que a pessoa pode ver.
- **Início:** mão de 7, mulligan de Londres (põe 1 no fundo por mulligan antes de manter);
  comandante(s) na zona de comando; vida 40 em Commander e 20 nos outros; "comecei jogando"
  (quem começa não compra no turno 1).
- **Zonas:** mão, terrenos e outras permanentes (o campo), cemitério, exílio, zona de comando e
  grimório (contagem).
- **Turno:** "Próximo turno" desvira tudo e compra 1. Mostra o turno, a vida (+/−) e a **mana
  disponível** (terrenos desvirados, com as cores de cada um; sem cor = incolor).
- **Ações por carta** (menu): da mão, jogar / descartar / exilar; no campo, virar / desvirar /
  cemitério / exílio / mão / topo ou fundo do grimório; do cemitério e do exílio, voltar para a
  mão ou o campo; o comandante volta para a zona de comando. **Procurar no grimório** (tutores),
  pegando uma carta e embaralhando. **Fichas:** "Criar ficha" com nome e quantidade; fora do campo,
  deixam de existir.
- **Imposto do comandante:** cada vez que ele sai da zona de comando para o campo, +2 (mostrado).
- **Desfazer** (várias vezes) e **Recomeçar**.
- **Custo e privacidade:** tudo roda no navegador ou no app, a partir das cartas do deck. Nada é
  gravado no servidor.

## Ligação com o glossário e a trilha

1. **Palavras-chave da carta:** ao abrir uma carta, o texto dela é comparado com o glossário
   (`GLOSSARY`, termos em inglês e português); aparece "Palavras-chave nesta carta" com a
   definição curta, "Ver no glossário" (`/aprender/glossario#id`) e a lição do termo.
2. **"?" nas zonas e ações:** cemitério, exílio, grimório, zona de comando, virar, ficha, mulligan
   e imposto do comandante abrem a definição do glossário, com o link.
3. **Dicas da trilha** (as dicas que já existem: uma vez por pessoa, dispensáveis): no primeiro
   "Próximo turno", a lição "O turno"; na mana disponível, "Mana e terrenos"; no imposto do
   comandante, o termo e "Commander: o formato".
4. **Da trilha para a mesa:** no fim da trilha básica e da primeira mesa, o convite "Pratique
   sozinho: abra um deck e jogue alguns turnos na mesa de testes".

## Técnico

- **Core** (`packages/core/src/decks/playtest.ts`): redutor puro `playtest(state, action, random)`,
  `startPlaytest`, `manaAvailable`, `commanderTax`; o sorteio entra como parâmetro (testes
  previsíveis). A busca das palavras-chave da carta também fica no core (`learn`).
- **Site:** página `/decks/[id]/testar` (cliente), com o estado e a pilha do desfazer no
  componente; as cartas vêm do deck já carregado no servidor.
- **App:** a mesma lógica do core, numa tela própria, depois do site.

## Ordem (um PR por item)

1. Core: redutor com testes (e este documento).
2. Site: a mesa e o botão "Testar o deck".
3. Ligações: palavras-chave da carta, "?" nas zonas e ações, dicas da trilha, convite no fim da
   trilha.
4. App: a mesa com as ligações.

## O que fica com quem implementa

Textos (pt-BR e en), disposição das zonas seguindo o padrão do site (e o layout de tablet no app),
nomes internos.
