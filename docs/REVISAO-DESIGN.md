# Revisão de design (26/11/2026)

Levantamento antes de mudar as telas (parte B do plano de desempenho e design). Base: capturas de
15 rotas em 1440, 820 e 390 px, temas claro e escuro, com os dados do E2E; rubrica da
`taste-skill` (um sistema, hierarquia, hover e press, ritmo, bordas, contraste, estados vazios).
As imagens de carta não aparecem nas capturas (sem rede para o Scryfall no teste local).

**Decisões do dono:** a marca continua roxa; página inicial refeita a fundo pela skill; telas da
aplicação revistas pelos princípios dela, uma área por PR.

## O que já está bom (manter)

- O destaque do painel (roxo, próximo encontro, botão dourado) e o pódio: têm cara própria.
- Tabelas do ranking limpas, números alinhados à direita.
- Tema escuro coerente; contraste e foco já auditados (WCAG 2.2 AA).
- Ícones de um mapa só, botões com ícone + verbo.

## Achados, por prioridade

### 1. Página inicial (primeira impressão)

1. **Três botões do mesmo peso no topo** (Google, e-mail, "Participar dos testes"). Uma ação
   principal e uma secundária; "Participar dos testes" vai para o fechamento.
2. **O produto aparece pequeno e desalinhado:** três cartões soltos, de larguras e recuos
   diferentes, no lugar do app. Trocar por **uma moldura do app de verdade** (painel com a lista ao
   lado do encontro aberto), grande.
3. **Página longa e densa:** 7 seções, 7,5 telas no desktop e 13 no celular. "De onde vêm os
   dados" e "Como avaliamos" são paredes de texto (metodologia). Levar para `/aprender/metodologia`
   (com link) e deixar na inicial um FAQ curto.
4. **"Funcionalidades" com 8 cartões iguais** (ícone + título + texto, grade de 3) tem cara de
   modelo pronto. Trocar por **3 seções de recurso**, cada uma com uma tela real e um layout
   diferente: agenda e encontros; decks (análise e mesa de testes); torneios e lojas.
5. **Menu com 6 âncoras.** Reduzir para 3 ou 4.

### 2. Base do sistema (vale para todas as telas)

1. **Cantos:** 6 raios em uso (`rounded-full` 89×, `xl` 65×, `lg` 33×, `2xl` 32×, `md`, `3xl`).
   Escala de 3: controle (`lg`), cartão (`2xl`), pílula (`full`).
2. **Sombras:** 6 níveis misturados (`sm`, padrão, `md`, `lg`, `xl`, `2xl`). Dois: repouso e
   elevado (diálogos e cartão em hover).
3. **Títulos:** quase tudo usa `section-title`, mas há 4 estilos de `h2` soltos; no painel, "Os
   seus números" fica fora do cartão e colado nele, enquanto os outros títulos ficam dentro. Um
   padrão só.
4. **Hover e press:** cartões com link não sobem, botões não "afundam" ao clicar. Camada de
   movimento única (cartão sobe 2 px, botão afunda 1 px, sublinhado que se desenha), com
   `motion-reduce`.
5. **O fundo animado (linhas coloridas) atravessa o conteúdo** em todas as telas logadas (painel,
   decks, ranking, coleção), passando por trás de tabelas e formulários. Deixar só atrás do
   cabeçalho da página (ou bem mais suave), nunca sob o conteúdo.
6. **Caixas "Dica" pesadas:** borda forte, ocupam a primeira tela da coleção. Versão compacta,
   fundo levemente tingido, sem borda forte.
7. **Ladrilhos internos com outra cor** (os números da "Atividade do grupo" usam um bege mais
   escuro que nenhum outro ladrilho usa). Um fundo de ladrilho só.

### 3. Telas da aplicação

| Tela                                      | O que muda                                                                                                                                                                                                                                                                    |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Painel**                                | "Atividade do grupo" com 5 meses zerados e 1 barra: mostrar só a partir do 1º mês com partidas (ou esconder com menos de 2 meses). Título "Os seus números" no padrão.                                                                                                        |
| **Encontro**                              | Uma coluna estreita de 9 cartões, com o formulário de edição aberto no fim. No desktop, duas colunas (local, participantes e compartilhar \| partidas e registrar); editar vira diálogo ou seção recolhida. Participantes com foto (como no painel), não só nome em etiqueta. |
| **Deck**                                  | Cabeçalho com área vazia grande; na vista "Visual", um tipo por linha com uma carta cada desperdiça a largura: tipos lado a lado em colunas no desktop.                                                                                                                       |
| **Coleção**                               | Dica + 2 números + 2 painéis recolhidos antes das cartas: as cartas começam na 2ª tela. Números numa linha, busca + filtros + ordenar numa barra só.                                                                                                                          |
| **Ranking**                               | 8 cartões do mesmo peso. A classificação domina (primeiros com destaque); "Temporadas" (criar) sai daqui para as configurações do grupo; filtros aplicam sozinhos (sem botão "Filtrar").                                                                                      |
| **Navegação no celular**                  | Abas do topo rolam para o lado e cortam "Ranking" sem pista. Indicar que há mais (degradê na borda) ou barra inferior com 4 itens + "Mais".                                                                                                                                   |
| **Decks, grupo, perfil, torneios, lojas** | Seguem a base (item 2); sem achado próprio além dela.                                                                                                                                                                                                                         |

## Ordem dos PRs (ajustada)

1. **Base do sistema** (2.1–2.7): tokens de cantos e sombras, títulos, camada de movimento, fundo
   animado contido, dica compacta. Muda todas as telas de uma vez, sem mexer em estrutura.
2. **Página inicial** (1.1–1.5) pela skill, com a metodologia levada para `/aprender`.
3. **Encontro** (a tela mais usada no dia do jogo) e **navegação no celular**.
4. **Painel, coleção e deck.**
5. **Ranking.**
6. **App mobile:** o espelho da base (cantos, sombras, movimento) e os mesmos ajustes de tela.

Cada PR leva capturas antes e depois, E2E e axe da área, novidade quando visível e, se mudar o que
aparece em "Veja por dentro", as capturas novas e o `home.tour`.
