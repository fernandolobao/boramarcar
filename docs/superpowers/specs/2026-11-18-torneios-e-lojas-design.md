# Torneios do grupo e perfis de loja — pesquisa e desenho

Data: 18/11/2026. Situação: **proposta para aprovação** (nada construído). Fases no roadmap: 9 (torneios do grupo) e 10 (lojas).

## Por que

- **Torneio do grupo:** grupos que já jogam juntos querem, de vez em quando, uma noite "valendo": chaves, ranking próprio e uma página para acompanhar. Hoje isso vive em papel, planilha ou num app separado, longe do histórico do grupo.
- **Lojas:** lojas organizam eventos, campeonatos e torneios. Com perfil no ArcanaKin, os jogadores acompanham pelo app e as lojas trazem gente nova. Isso pode render parcerias (item 8.9 do roadmap).

**Anti-objetivos:**

- Não substituir o Wizards EventLink em eventos sancionados. Ele é obrigatório para registrar resultados oficiais e o ArcanaKin não registra rating na Wizards.
- Não virar rede social genérica nem marketplace (decisão de escopo de 12/11/2026).
- Organizar ou participar de um torneio nunca depende de pagamento (decisão de monetização).

## O que a pesquisa mostrou

| Ferramenta                                    | O que faz bem                                                                                                                                                                                                                                                                                        | O que aprendemos                                                                                                                                                                                                                                                                        |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Wizards EventLink + Magic Companion**       | Ferramentas oficiais das lojas WPN:<br>• o jogador entra com um **código do evento** pelo Companion;<br>• rodadas e mesas chegam no celular;<br>• o próprio jogador **informa o resultado**;<br>• quem não tem o app é inscrito pelo e-mail.                                                         | • Inscrever por código e o jogador lançar o próprio resultado poupam o organizador.<br>• O EventLink **não tem rodada montada à mão**, de propósito, para não abrir espaço para fraude em eventos oficiais.<br>• Em 2025, a Wizards ajustou o 2HG e o top 8 às regras de torneio (MTR). |
| **Localizador de lojas e eventos da Wizards** | • Busca por loja ou evento, com filtro de tipo e formato.<br>• Página da loja com os próximos eventos e o mapa.<br>• Botão "adicionar à agenda".                                                                                                                                                     | Para o jogador, o perfil de loja precisa de três coisas: lista de eventos, mapa e agenda.                                                                                                                                                                                               |
| **Melee.gg**                                  | • Suíço com top cut, desempates e cronômetro de rodada.<br>• Envio e validação de lista de deck.                                                                                                                                                                                                     | O padrão em eventos maiores: lista de deck validada e desempates oficiais.                                                                                                                                                                                                              |
| **TopDeck.gg**                                | • Inscrição, check-in, desistência, reentrada e listas.<br>• Rodada editável durante o evento.<br>• **Pods de Commander**: suíço em pods de jogadores com campanha parecida.<br>• Top cut em pods: top 4, 10, 16 e outros.<br>• Pontos de vitória, empate, derrota e bye definidos pelo organizador. | • Para Commander, o modelo certo são pods de 4 com pontuação configurável e publicada antes.<br>• Formar o máximo de pods de 4 a cada rodada.<br>• No top cut, cada pod mistura cabeças de chave (ex.: 1º, 8º, 9º e 16º), e o mais bem colocado começa.                                 |
| **Spicerack**                                 | Encontrar torneios e noites de jogo por perto, com ranking dentro do app.                                                                                                                                                                                                                            | A descoberta perto de você é o que atrai jogadores.                                                                                                                                                                                                                                     |
| **Challonge**                                 | Eliminação simples, eliminação dupla, todos contra todos e suíço, com cabeças de chave e byes.                                                                                                                                                                                                       | Formatos de chave para outros jogos ou eventos casuais.                                                                                                                                                                                                                                 |

**Regras de desempate (MTR):** a ordem é pontos, % de vitórias dos oponentes (OMW%), % de jogos vencidos (GW%) e % de jogos vencidos dos oponentes (OGW%). Cada porcentagem tem piso de 33%, o bye fica fora das contas e os desempates congelam ao fim do suíço. O mínimo é de 3 rodadas, e o apêndice E do MTR recomenda o número de rodadas pelo número de jogadores.

**Lacunas:** não confirmei uma pontuação "padrão" de cEDH. Por isso a pontuação fica configurável, com predefinições. Também não achei detalhes de check-in do Spicerack.

## Torneio do grupo (Fase 9)

Aproveita o que já existe: grupo, encontros, partidas, ranking, conquistas e notificações.

**Quem cria:** o dono ou um admin do grupo. O torneio pertence a **um encontro**, ou a vários, se durar mais de uma noite.

**Formatos de chave:**

1. **Pods de Commander (suíço em pods):**
   - pods de 4 (de 3 quando não fecha);
   - a 1ª rodada é aleatória e as seguintes juntam campanhas parecidas;
   - evita repetir adversários;
   - pontos configuráveis (predefinição: vitória 3, empate 1, derrota 0, a mesma pontuação do ranking do grupo);
   - top cut opcional (top 4 em um pod final, ou top 10 e 16 em pods, com as cabeças de chave misturadas).
2. **Suíço 1 contra 1** (Modern, Pauper, Draft…): rodadas recomendadas pelo número de jogadores, desempates do MTR e top 8 opcional em eliminação simples.
3. **Eliminação simples e dupla:** cabeças de chave pelo ranking do grupo, ou sorteio, com byes automáticos.
4. **Todos contra todos:** para grupos pequenos (até 8).

**Página do torneio:**

- inscritos, com deck opcional ligado ao torneio;
- rodada atual com mesas e assentos;
- resultado de cada mesa pelo **modo mesa** ("Abrir no modo mesa" já traz os jogadores do pod, os assentos e quem começa) ou pelo formulário rápido; vale na hora, e o organizador corrige quando precisar (ou liga "confirmar cada resultado"); a próxima rodada só sai quando todas as mesas têm resultado;
- classificação ao vivo com desempates e uma explicação curta de cada critério;
- **linha do tempo de acontecimentos**: "Rodada 2 começou", "Bia venceu a mesa 3", "Top 4 definido", "Campeão: Caio".

**Integrações:**

- **Partidas:** cada partida do torneio também conta no ranking do grupo, se o organizador quiser.
- **Ranking próprio:** o torneio tem um ranking separado do ranking do grupo.
- **Conquistas novas:** "Campeão de torneio", "Top 4" e "Jogou 3 torneios".
- **Notificações:** "sua mesa saiu", "rodada começou", "você está no top 4".
- **Modo mesa:** é o caminho principal do resultado. Abre já com os jogadores do pod, e ao terminar a partida o resultado vai para a mesa do torneio (e vira partida do grupo, se o torneio conta no ranking).

**Fora da primeira entrega:** lista de deck obrigatória com validação, cronômetro de rodada, desistência e reentrada no meio do evento, e rodada montada à mão. Rodada montada à mão é útil no casual, mas fica para depois, com registro de quem mudou o quê.

**Modelo de dados (rascunho):**

- `tournaments`:
  - grupo e encontro(s);
  - formato do jogo e tipo de chave;
  - pontos, regras de corte e situação (inscrição, rodando, top cut, encerrado).
- `tournament_players`: inscrição, deck, cabeça de chave e se desistiu.
- `tournament_rounds` e `tournament_tables`: mesas, assentos e resultados. Cada mesa pode virar uma `game` existente.
- `tournament_events`: linha do tempo.
- O emparelhamento e os desempates ficam em `packages/core/tournaments`: puros e testados, com casos de 9, 13 e 22 jogadores em pods e números ímpares no suíço.

**Entregas sugeridas:**

- **9.1** Pods de Commander, do núcleo às telas no site e no app.
- **9.2** Top cut e conquistas.
- **9.3** Suíço 1 contra 1 com desempates do MTR.
- **9.4** Eliminação e todos contra todos.
- **9.5** Página pública compartilhável e linha do tempo ao vivo.

## Perfis de loja (Fase 10, depois do beta e da Fase 9)

- **Criação:**
  - um admin do ArcanaKin cria a loja com nome, cidade e e-mail;
  - a loja recebe um **convite por e-mail** para criar o cadastro;
  - o responsável vira dono do perfil e pode convidar a equipe.
- **Perfil público:**
  - nome, logo, endereço com mapa, horários, redes sociais e formatos que joga;
  - próximos eventos com botão "adicionar à agenda";
  - eventos passados com campeões.
- **Eventos da loja:**
  - mesmo motor de torneios da Fase 9;
  - vagas, inscrição pelo app (ou pelo código do evento no balcão), check-in, premiação em texto e regras próprias da casa;
  - acompanhamento ao vivo pelos jogadores (mesa, classificação e linha do tempo).
- **Descoberta:** "lojas e eventos perto de você", pela cidade escolhida no perfil, sem localização precisa sem permissão.
- **Para a loja:**
  - número de inscritos e de pessoas que voltam;
  - mensagens para quem seguiu a loja, usando os avisos que já existem, só para quem segue.
- **Confiança e LGPD:**
  - selo de "loja verificada" (por um admin);
  - a loja vê só os dados que o jogador compartilha ao se inscrever (nome no ArcanaKin, sem e-mail);
  - denúncia de evento;
  - exclusão do perfil de loja.
- **Monetização:** fica fora. Se um dia houver "patrocínio de lojas", ele vem identificado e separado de rankings e análises, como já decidido.

**Entregas sugeridas:**

- **10.1** Perfil de loja e convite por e-mail.
- **10.2** Eventos da loja com o motor de torneios.
- **10.3** Descoberta por cidade.
- **10.4** Seguidores e avisos da loja.
- **10.5** Piloto com 1 a 3 lojas (o 8.9).

## Decisões (18/11/2026)

1. **Pontuação padrão dos pods:** 3/1/0, igual ao ranking do grupo. O organizador muda por torneio.
2. **Partidas do torneio no ranking do grupo:** contam por padrão, com opção de desligar.
3. **Resultado:** pela mesa, no modo mesa (principal) ou no formulário rápido, válido na hora. O organizador corrige quando precisar e pode ligar "confirmar cada resultado" (útil em eventos de loja com premiação).
4. **Torneio aberto a quem não é do grupo:** chega com as lojas (Fase 10).

## Fontes

- Wizards EventLink e Companion: [guia definitivo do EventLink (WPN, 2024)](https://wpn.wizards.com/en/news/definitive-guide-wizards-eventlink), [por que não há rodada montada à mão](https://wpn.wizards.com/en/news/why-eventlink-doesnt-have-manual-pairing), [atualização 2HG e top 8 (2025)](https://wpn.wizards.com/en/news/wizards-eventlink-update-improved-2hg-registration-and-playoff-pairings), [EventLink e Companion](https://wpn.wizards.com/en/news/eventlink-better-companion)
- Localizador e perfil de loja: [Store and Event Locator](https://magic.wizards.com/en/news/feature/find-and-play-magic-with-the-improved-wizards-store-and-event-locator), [perfil da loja WPN (2024)](https://wpn.wizards.com/en/news/introducing-your-new-wpn-store-profile-page), [WPN Premium](https://wpn.wizards.com/en/premium-hub)
- Desempates: [MTR, apêndice C (Magic Judges)](https://blogs.magicjudges.org/rules/mtr-appendix-c/), [desempates (MTG Wiki)](https://mtg.wiki/page/Tiebreaker), [número de rodadas (MTG Wiki)](https://mtg.wiki/page/Number_of_rounds)
- Commander em pods: [TopDeck.gg: como rodar torneio de Commander](https://topdeck.gg/help/running-commander-tournament), [adendo de regras TopDeck.gg](https://topdeck.gg/mtr-ipg-addendum), [Commander's Herald: repensando o cEDH de torneio](https://commandersherald.com/rethinking-tournament-cedh), [cedhstats.org](https://cedhstats.org/tournaments/level-sevens-weekly-cedh-event-27)
- Outras ferramentas: [Melee: organizar torneios](https://help.melee.gg/?p=1810), [Spicerack (App Store)](https://apps.apple.com/us/app/-/id6478617147), [Challonge (SmashWiki)](https://ssbwiki.com/Challonge)
