/**
 * Novidades para quem usa o ArcanaKin (item 14 do roadmap): uma ou duas frases por mudança
 * visível, em linguagem de usuário, em pt-BR e en. Toda segunda o cron junta as da semana num
 * rascunho "Novidades da semana" no `/admin`; um admin revisa e publica (vira notificação).
 *
 * Mudou algo que as pessoas vão notar? Acrescente uma entrada no fim (data do merge, sem termos
 * técnicos: o que a pessoa ganha, não como foi feito).
 */
export interface ChangelogEntry {
  /** Dia (AAAA-MM-DD) em que a mudança entrou. */
  date: string;
  pt: string;
  en: string;
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    date: '2026-11-18',
    pt: 'A página inicial abre em português para quem está no Brasil, e ganhou um seletor de idioma (PT | EN) no topo.',
    en: 'The home page opens in Portuguese for people in Brazil, and has a language switch (PT | EN) at the top.',
  },
  {
    date: '2026-11-18',
    pt: 'A busca de cartas em português agora encontra cartas de duas faces, como "Ídolo do Rei das Profundezas".',
    en: 'Searching cards in Portuguese now finds double-faced cards too.',
  },
  {
    date: '2026-11-18',
    pt: 'Ao adicionar à coleção uma carta que só tem uma edição, ela já vem escolhida.',
    en: 'When you add a card with a single edition to your collection, it comes already picked.',
  },
  {
    date: '2026-11-18',
    pt: 'Na página do deck, tocar no nome de uma carta mostra a edição que você usa no deck.',
    en: 'On a deck page, tapping a card name shows the edition you use in that deck.',
  },
  {
    date: '2026-11-18',
    pt: 'Convidar para o grupo ficou mais simples: "Copiar link" ao lado do link e "Baixar QR Code" logo abaixo do QR Code.',
    en: 'Inviting people is simpler: "Copy link" next to the link and "Download QR code" right below the QR code.',
  },
  {
    date: '2026-11-18',
    pt: 'Decks públicos podem ser compartilhados por link, QR Code ou WhatsApp.',
    en: 'Public decks can be shared by link, QR code or WhatsApp.',
  },
  {
    date: '2026-11-18',
    pt: 'A análise de deck dá nota também para Modern, Pauper, Standard, Draft e outros formatos, e ficou mais enxuta.',
    en: 'Deck analysis now scores Modern, Pauper, Standard, Draft and other formats too, and is more compact.',
  },
  {
    date: '2026-11-18',
    pt: '12 conquistas novas, e uma janela mostra as que você ganhou desde a última visita.',
    en: '12 new achievements, and a window shows the ones you earned since your last visit.',
  },
  {
    date: '2026-11-18',
    pt: 'Chegou o sino de notificações: partidas suas e do grupo, conquistas, mudanças no pódio e avisos do ArcanaKin.',
    en: 'Meet the notifications bell: your games and your group’s, achievements, podium changes and ArcanaKin announcements.',
  },
  {
    date: '2026-11-18',
    pt: 'No editor de deck, vários toques no − ou + agora viram uma gravação só, sem travar o campo.',
    en: 'In the deck editor, several taps on − or + now save once, without locking the field.',
  },
  {
    date: '2026-11-18',
    pt: 'No modo mesa do app, apagar o número de um marcador para digitar outro não zera mais o marcador.',
    en: 'In the app’s table mode, clearing a counter to type another number no longer resets it.',
  },
  {
    date: '2026-11-18',
    pt: 'Quando alguém chama você para o próximo encontro, o convite também aparece no sino de notificações.',
    en: 'When someone invites you to the next meetup, the invite also shows up in the notifications bell.',
  },
  {
    date: '2026-11-18',
    pt: 'Notificações agora podem ser marcadas como lidas uma a uma, ou todas de uma vez.',
    en: 'Notifications can now be marked as read one by one, or all at once.',
  },
  {
    date: '2026-11-18',
    pt: 'As conquistas no perfil ganharam abas: "Em aberto", com as mais perto de sair primeiro, e "Finalizadas".',
    en: 'Achievements on the profile now have tabs: "Open", closest first, and "Completed".',
  },
  {
    date: '2026-11-19',
    pt: 'Boas-vindas para quem chega: o resumo da noite celebra a primeira partida com o grupo, e o painel acolhe quem entrou há pouco.',
    en: 'Welcoming newcomers: the night recap celebrates a first game with the group, and the dashboard greets people who just joined.',
  },
  {
    date: '2026-11-19',
    pt: 'Conquista nova, "Enturmado": jogue ao menos uma partida com cada pessoa do seu grupo.',
    en: 'New achievement, "One of the gang": play at least one game with each person in your group.',
  },
  {
    date: '2026-11-19',
    pt: 'Rivalidades no painel: seu maior rival e o seu freguês no grupo, e o placar entre vocês no perfil de cada pessoa.',
    en: 'Rivalries on the dashboard: your biggest rival and your favorite target in the group, plus your head-to-head score on each person’s profile.',
  },
  {
    date: '2026-11-19',
    pt: 'A página do deck ficou mais limpa: nome, tipo de jogo, visibilidade e remover agora ficam em "Editar deck", no topo.',
    en: 'The deck page is cleaner: name, game type, visibility and delete now live under "Edit deck", at the top.',
  },
  {
    date: '2026-11-19',
    pt: 'Recordes do grupo: vitória mais rápida, partida mais longa, maior sequência e mais, além da cara do grupo (cores e comandantes).',
    en: 'Group records: fastest win, longest game, longest streak and more, plus the group’s identity (colors and commanders).',
  },
  {
    date: '2026-11-19',
    pt: 'Atualizamos a política de privacidade: a equipe do ArcanaKin pode ver decks privados só para suporte e moderação, e cada acesso fica registrado nos seus dados.',
    en: 'We updated the privacy policy: the ArcanaKin team can view private decks only for support and moderation, and each access is logged in your data.',
  },
  {
    date: '2026-11-19',
    pt: 'Retrospectiva do mês: todo dia 1, o seu grupo recebe o resumo do mês que passou, com o destaque, as estreias, os recordes que caíram e o duelo do mês, pronto para compartilhar.',
    en: 'Monthly recap: on the 1st of each month, your group gets a recap of the month before, with the player of the month, first-timers, records that fell and the duel of the month, ready to share.',
  },
  {
    date: '2026-11-19',
    pt: 'As listas de escolha (tipo de jogo, filtros, local, deck…) ganharam a cara do ArcanaKin: iguais em qualquer navegador, celular ou tablet, nos temas claro e escuro.',
    en: 'Pick lists (game type, filters, place, deck…) now look like ArcanaKin: the same in any browser, phone or tablet, in light and dark themes.',
  },
  {
    date: '2026-11-19',
    pt: 'Caixas de marcar e interruptores com a cara do ArcanaKin, com um ✓ visível no app; a lista de escolha alinha com os campos e botões ao lado, e o selo Foil da coleção fica sobre a imagem da carta.',
    en: 'Checkboxes and switches now look like ArcanaKin, with a visible ✓ in the app; pick lists line up with the fields and buttons next to them, and the collection’s Foil tag sits on the card image.',
  },
  {
    date: '2026-11-19',
    pt: 'Chegaram os torneios do grupo, em qualquer formato: pods no Commander, partidas um contra um em melhor de 3 e duplas no 2HG, com rodadas, mesas, classificação com desempates oficiais e linha do tempo.',
    en: 'Group tournaments are here, in any format: Commander pods, best-of-3 one-on-one matches and Two-Headed Giant duos, with rounds, tables, standings with official tiebreakers and a timeline.',
  },
  {
    date: '2026-11-19',
    pt: 'Torneios também no app, e um aviso no sino a cada rodada com a sua mesa (ou o bye) e quando o torneio termina.',
    en: 'Tournaments in the app too, plus a bell notice every round with your table (or bye) and when the tournament ends.',
  },
  {
    date: '2026-11-19',
    pt: 'Trocar de página ficou mais responsivo: o item do menu reage na hora do toque e a página nova mostra onde o conteúdo vai aparecer enquanto carrega.',
    en: 'Switching pages feels faster: the menu item reacts right when you tap it, and the new page shows where content will appear while it loads.',
  },
  {
    date: '2026-11-19',
    pt: 'Nas mesas de torneio (pods e melhor de 1), "Abrir no modo mesa" já traz os jogadores e o formato; ao registrar, o resultado vai direto para a mesa do torneio.',
    en: 'On tournament tables (pods and best of 1), "Open in table mode" brings the players and format; when you save, the result goes straight to the tournament table.',
  },
  {
    date: '2026-11-19',
    pt: 'O painel e a página do encontro abrem mais rápido no celular: a arte do destaque passou a carregar primeiro.',
    en: 'The dashboard and meetup pages open faster on phones: the highlight art now loads first.',
  },
  {
    date: '2026-11-19',
    pt: 'Chegaram os perfis de loja: endereço com mapa, horários, contatos e formatos, com o selo de loja verificada. A loja entra por convite da equipe do ArcanaKin.',
    en: 'Store profiles are here: address with a map, hours, contacts and formats, with a verified-store badge. Stores join by invite from the ArcanaKin team.',
  },
  {
    date: '2026-11-19',
    pt: 'Eventos de loja: a loja publica torneios e noites livres com vagas, premiação e regras; você se inscreve pelo site ou pelo código do balcão, e a lista de espera anda sozinha.',
    en: 'Store events: stores post tournaments and open-play nights with spots, prizes and rules; sign up on the site or with the counter code, and the waitlist moves on its own.',
  },
  {
    date: '2026-11-19',
    pt: 'Torneios nos eventos de loja: a loja começa com quem fez check-in (convidados também) e todo mundo acompanha mesas e classificação ao vivo na página do evento.',
    en: 'Tournaments at store events: the store starts with everyone who checked in (guests too), and anyone can follow tables and standings live on the event page.',
  },
  {
    date: '2026-11-19',
    pt: 'Saiu da lista de espera de um evento de loja? O aviso chega no sino, com o link para o evento.',
    en: 'Moved off a store event’s waitlist? The notice arrives in the bell, with a link to the event.',
  },
  {
    date: '2026-11-19',
    pt: 'Agora dá para escolher a sua foto do perfil, no site (Configurações) e no app (Conta). A foto é guardada sem a localização. Lojas também ganham logo, trocado em "Gerenciar a loja".',
    en: 'You can now choose your profile photo, on the website (Settings) and in the app (Account). The photo is stored without its location. Stores get a logo too, changed under "Manage the store".',
  },
  {
    date: '2026-11-19',
    pt: 'Eventos de loja também no app: em Conta → Eventos de loja, os seus próximos eventos e o código do balcão; dá para ver a loja, se inscrever, desistir e acompanhar o torneio ao vivo.',
    en: 'Store events in the app too: under Account → Store events, your upcoming events and the counter code; see the store, sign up, drop out and follow the tournament live.',
  },
  {
    date: '2026-11-19',
    pt: 'Torneios com top cut: depois do suíço, os melhores seguem em eliminação (top 4 ou 8 no um contra um; top 4, 10 ou 16 em pods) até a final, e o campeão aparece no topo da página.',
    en: 'Tournaments with a top cut: after the Swiss rounds, the best go on to elimination (top 4 or 8 in one-on-one; top 4, 10 or 16 in pods) up to the final, and the champion shows at the top of the page.',
  },
  {
    date: '2026-11-19',
    pt: 'Conquistas de torneio: estreia em torneio, chegar ao top cut e campeão de torneio (com quantas vezes), de grupo ou de loja.',
    en: 'Tournament achievements: tournament debut, making the top cut and tournament champion (with how many times), in groups or at stores.',
  },
  {
    date: '2026-11-19',
    pt: 'Torneio do grupo com link público: quem não é do grupo acompanha rodadas, mesas e classificação ao vivo, sem entrar e vendo só o primeiro nome de cada pessoa.',
    en: 'Group tournaments get a public link: people outside the group follow rounds, tables and standings live, without signing in and seeing only first names.',
  },
  {
    date: '2026-11-19',
    pt: 'Torneios de um contra um ganham eliminação simples (chave sorteada, quem perde sai) e todos contra todos (cada um enfrenta todos), além do suíço.',
    en: 'One-on-one tournaments get single elimination (random bracket, lose and you’re out) and round robin (everyone plays everyone), besides Swiss.',
  },
  {
    date: '2026-11-19',
    pt: 'A página do grupo ficou mais do grupo: recordes e a cara do grupo logo no começo, fotos de quem participa, e convite, configurações e novo local em janelas que abrem por botões.',
    en: 'The group page is more about the group now: records and the group’s identity right at the top, members’ photos, and invite, settings and new place in windows opened by buttons.',
  },
  {
    date: '2026-11-19',
    pt: 'Lojas agora dizem o que oferecem (cartas avulsas, selados, mesas para jogar, torneios), e a cidade da loja vem da lista oficial de municípios.',
    en: 'Stores now show what they offer (singles, sealed, tables to play, tournaments), and the store’s city comes from the official list of municipalities.',
  },
  {
    date: '2026-11-20',
    pt: 'Nova página "Lojas e eventos": escolha a sua cidade (ou use a localização) e veja torneios, noites de jogo e lojas a até 50 km, com "Adicionar à agenda". Funciona sem conta.',
    en: 'New "Stores and events" page: pick your city (or use your location) and see tournaments, game nights and stores within 50 km, with "Add to calendar". Works without an account.',
  },
  {
    date: '2026-11-20',
    pt: 'No app, Conta → "Lojas e eventos": a sua cidade (salva no perfil) ou a localização mostram torneios e lojas por perto, com "Adicionar à agenda". No site, a cidade também fica em Configurações.',
    en: 'In the app, Account → "Stores and events": your city (saved to your profile) or your location shows tournaments and stores nearby, with "Add to calendar". On the website, the city also lives in Settings.',
  },
  {
    date: '2026-11-20',
    pt: 'O aviso do resumo da noite no celular agora dá as boas-vindas a quem jogou a primeira partida com o grupo, e o perfil de outra pessoa no app mostra o placar entre vocês.',
    en: 'The night recap notification on your phone now welcomes whoever played their first game with the group, and someone else’s profile in the app shows the score between you two.',
  },
  {
    date: '2026-11-20',
    pt: 'Siga as suas lojas: em "Seguir loja", os eventos novos e os avisos delas chegam no sino e no celular. A equipe da loja manda avisos curtos para quem segue.',
    en: 'Follow your stores: with "Follow store", their new events and notices arrive in your bell and on your phone. The store team sends short notices to followers.',
  },
  {
    date: '2026-11-20',
    pt: 'Torneios de um contra um ganham eliminação dupla: quem perde a primeira vez vai para a chave dos perdedores e ainda pode chegar à grande final.',
    en: 'One-on-one tournaments get double elimination: lose once and you go to the losers bracket, with a path back to the grand final.',
  },
  {
    date: '2026-11-20',
    pt: 'O link da retrospectiva do mês agora abre só aquele mês: quem recebe o de outubro não vê os outros meses do grupo. Na loja, quem não é da equipe vê só o primeiro nome de quem joga o torneio.',
    en: 'The monthly recap link now opens only that month: whoever gets October’s can’t see the group’s other months. In stores, people outside the staff see only the first name of tournament players.',
  },
  {
    date: '2026-11-20',
    pt: 'No celular, as listas de membros e de locais do grupo ficaram mais compactas: "Gerenciar" fica ao lado do nome, e as rotas de cada local abrem em "Como chegar".',
    en: 'On phones, the group’s member and place lists are more compact: "Manage" sits next to the name, and each place’s routes open under "Directions".',
  },
  {
    date: '2026-11-25',
    pt: 'Imprimir proxies agora está liberado para todo mundo: na página do deck, abra a folha para imprimir (cartas em tamanho real) ou baixe o PDF.',
    en: 'Printing proxies is now open to everyone: on the deck page, open the print sheet (real-size cards) or download the PDF.',
  },
  {
    date: '2026-11-25',
    pt: 'As páginas de lojas, eventos de loja, torneio, resumo e retrospectiva ganharam "Voltar ao painel" no topo, para quem usa o ArcanaKin instalado no celular.',
    en: 'Store, store event, tournament, recap and monthly recap pages now have "Back to dashboard" at the top, for people using ArcanaKin installed on their phone.',
  },
  {
    date: '2026-11-25',
    pt: 'Na busca de lojas e eventos, "Usar minha localização" agora funciona no site: os eventos aparecem pela distância de onde você está (a posição não é guardada).',
    en: 'In the store and event search, "Use my location" now works on the website: events are sorted by distance from where you are (your position is not stored).',
  },
  {
    date: '2026-11-25',
    pt: 'Agora dá para montar um deck do zero, sem importar nada, e deixá-lo como rascunho: as cartas de um rascunho não entram na sua coleção até você publicar o deck.',
    en: 'You can now build a deck from scratch, without importing anything, and keep it as a draft: a draft\u2019s cards don\u2019t go into your collection until you publish the deck.',
  },
  {
    date: '2026-11-25',
    pt: 'Tokens e emblemas ganharam categoria própria na lista do deck: não ficam mais em "Talvez" e não contam no total de cartas nem na sua coleção.',
    en: 'Tokens and emblems now have their own section in the deck list: they no longer sit in "Maybe" and don\u2019t count in the card total or your collection.',
  },
  {
    date: '2026-11-25',
    pt: 'Nos rascunhos de deck, as cartas que você já tem livres na coleção ganham um selo. Ao publicar, você escolhe carta a carta se usa a que já tem ou se adiciona uma nova à coleção.',
    en: 'In draft decks, cards you already have free in your collection get a badge. When publishing, you choose card by card whether to use the one you have or add a new one to your collection.',
  },
  {
    date: '2026-11-25',
    pt: 'Na página do deck, editar, copiar e baixar a lista, imprimir proxies e atualizar o deck ficam juntos no menu "Opções do deck", no canto do topo.',
    en: 'On the deck page, editing, copying and downloading the list, printing proxies and updating the deck are now together in the "Deck options" menu, at the top corner.',
  },
  {
    date: '2026-11-25',
    pt: 'Nova trilha "Aprender a jogar" (no rodapé): sete lições curtas para quem nunca jogou Magic, com o progresso salvo na conta e três conquistas para quem fizer a trilha.',
    en: 'New "Learn to play" path (in the footer): seven short lessons for anyone new to Magic, with progress saved to your account and three achievements for completing it.',
  },
  {
    date: '2026-11-25',
    pt: 'Novo bloco "Commander para iniciantes" em "Aprender a jogar": comandante, identidade de cor, a mesa com várias pessoas, Rule 0 e brackets, com uma conquista para quem concluir.',
    en: 'New "Commander for beginners" part in "Learn to play": the commander, color identity, the multiplayer table, Rule 0 and brackets, with an achievement for completing it.',
  },
  {
    date: '2026-11-25',
    pt: 'Glossário de palavras-chave em "Aprender a jogar", com busca em português ou inglês. No modo mesa, ele abre pelo botão do centro, sem sair da partida.',
    en: 'Keyword glossary in "Learn to play", searchable in English or Portuguese. In table mode it opens from the centre button, without leaving the game.',
  },
  {
    date: '2026-11-25',
    pt: 'No modo mesa, decks com dois comandantes (parceiros) têm o dano de cada comandante contado à parte, com o nome dele, no site e no app.',
    en: 'In table mode, decks with two commanders (partners) now track each commander’s damage separately, by name, on the website and in the app.',
  },
  {
    date: '2026-11-25',
    pt: 'Na análise do deck, em "Mão inicial", o botão "Sortear mão inicial" abre o teste da mão: compre 7, faça mulligan escolhendo as cartas do fundo e veja as próximas compras.',
    en: 'In the deck analysis, under "Opening hand", the "Draw a sample hand" button opens the hand test: draw 7, mulligan by choosing the bottom cards and see the next draws.',
  },
  {
    date: '2026-11-25',
    pt: 'Deck em rascunho agora é sempre privado. Ao publicar, você escolhe quem vê: só você, o grupo ou qualquer pessoa com o link.',
    en: 'Draft decks are now always private. When you publish, you choose who sees it: only you, the group or anyone with the link.',
  },
  {
    date: '2026-11-25',
    pt: 'A análise do deck agora fica num card só, com abas: visão geral, mana, mão inicial, funções e bracket. Nada fica escondido em "mais detalhes".',
    en: 'The deck analysis now lives in a single card with tabs: overview, mana, opening hand, roles and bracket. Nothing is hidden under "more details".',
  },
  {
    date: '2026-11-25',
    pt: 'No Commander, a busca de "Adicionar carta" mostra só cartas da identidade do comandante, e o ArcanaKin avisa antes de pôr uma carta fora dela, com as cores que quebram a regra.',
    en: 'In Commander, "Add card" search shows only cards in the commander’s identity, and ArcanaKin warns before adding a card outside it, with the colors that break the rule.',
  },
  {
    date: '2026-11-25',
    pt: 'Desafios em "Aprender a jogar": situações de mesa com uma pergunta e a resposta comentada, com uma conquista para quem acertar todos.',
    en: 'Challenges in "Learn to play": table situations with a question and an explained answer, plus an achievement for getting them all right.',
  },
  {
    date: '2026-11-25',
    pt: 'O convite do grupo agora oferece "Aprender a jogar", e quem conclui o básico e ainda não jogou aparece no grupo como pronto para a primeira mesa.',
    en: 'Group invites now offer "Learn to play", and whoever completes the basics and hasn’t played yet shows up in the group as ready for the first table.',
  },
  {
    date: '2026-11-26',
    pt: 'No iPhone, tocar num campo não dá mais zoom na página: o site deixava de caber na tela e ficava cortado à direita.',
    en: 'On iPhone, tapping a field no longer zooms the page in: the site used to stop fitting the screen and got cut off on the right.',
  },
  {
    date: '2026-11-26',
    pt: 'Mesa de testes: jogue turnos de mentira com o seu deck (mão inicial, terrenos, mana disponível, fichas e desfazer) para ver se ele gira bem. Fica em "Opções do deck" → "Testar o deck".',
    en: 'Playtest table: play fake turns with your deck (opening hand, lands, available mana, tokens and undo) to see if it runs well. It\u2019s in "Deck options" → "Playtest the deck".',
  },
  {
    date: '2026-11-26',
    pt: 'Na mesa de testes, "Ver carta" explica as palavras-chave da carta e leva ao glossário e à lição; a trilha "Aprender a jogar" termina com um convite para praticar sozinho.',
    en: 'On the playtest table, "View card" explains the card\u2019s keywords and links to the glossary and the lesson; the "Learn to play" path ends with an invitation to practice on your own.',
  },
  {
    date: '2026-11-26',
    pt: 'Página inicial nova: mostra o app de verdade e responde às dúvidas mais comuns. A metodologia da análise ganhou página própria.',
    en: 'A new home page: it shows the real app and answers common questions. The analysis methodology has its own page.',
  },
  {
    date: '2026-11-26',
    pt: 'No encontro, quem vai aparece com foto, ao lado das partidas. No ranking, os três primeiros ganham medalha.',
    en: 'On a game night, who is coming shows with photos, next to the games. In the ranking, the top three get medals.',
  },
  {
    date: '2026-11-26',
    pt: 'Na coleção, as cartas aparecem já na primeira tela. No celular, as abas do topo mostram quando há mais para o lado.',
    en: 'In your collection, the cards show up on the first screen. On phones, the top tabs show when there are more to the side.',
  },
  {
    date: '2026-11-26',
    pt: 'No app, quem está na lateral do modo mesa pode deslizar no próprio cartão sem fechar a mesa sem querer. Para sair, use "Sair" no botão do centro.',
    en: 'In the app, players on the sides of table mode can swipe on their own area without closing the table by accident. To leave, use "Leave" in the center button.',
  },
  {
    date: '2026-11-26',
    pt: 'No app, o visual acompanha o site novo: no encontro, quem vai aparece com foto; no ranking, os três primeiros ganham medalha.',
    en: 'The app now matches the new site: on a game night, who is coming shows with photos; in the ranking, the top three get medals.',
  },
  {
    date: '2026-11-26',
    pt: 'Inscrições de torneio: a pessoa escolhida para inscrever não some mais se você escolher logo depois de "Me inscrever".',
    en: 'Tournament sign-ups: the person you pick no longer disappears if you pick right after "Enter myself".',
  },
  {
    date: '2026-11-26',
    pt: 'Ranking explicado: o botão ⓘ ao lado do título mostra como os pontos são contados e como funciona o desempate (site e app).',
    en: 'The ranking explained: the ⓘ button next to the title shows how points are counted and how ties are broken (site and app).',
  },
  {
    date: '2026-11-26',
    pt: 'Modo mesa: ao sortear quem começa, o menu fecha e a área do sorteado brilha como carta foil. O dano de comandante e os marcadores ficaram maiores e mostram só o nome do comandante.',
    en: 'Table mode: when you draw who goes first, the menu closes and that player\u2019s area glows like a foil card. Commander damage and counters are bigger and show just the commander\u2019s name.',
  },
  {
    date: '2026-11-26',
    pt: 'Modo mesa: "Saiu do jogo" nas opções de cada jogador, para quem morreu por outro motivo (deck vazio, efeito de carta) ou concedeu.',
    en: 'Table mode: "Out of the game" in each player\u2019s options, for a player who died another way (empty library, a card effect) or conceded.',
  },
  {
    date: '2026-11-26',
    pt: 'Mão inicial mais legível: as cartas ficaram bem maiores e tocar numa carta mostra ela grande para ler o texto.',
    en: 'A more readable opening hand: cards are much bigger, and tapping a card shows it large so you can read the text.',
  },
  {
    date: '2026-11-27',
    pt: 'Nova trilha "Além do básico" em Aprender a jogar, para quem já joga: prioridade, combate avançado, habilidades, ações baseadas em estado, vantagem de cartas e Commander a fundo.',
    en: 'New "Beyond the basics" path in Learn to play, for players who already play: priority, advanced combat, abilities, state-based actions, card advantage and Commander in depth.',
  },
  {
    date: '2026-11-27',
    pt: 'Sete desafios novos para quem já joga e três conquistas: "Além do básico", "Desafios de quem já joga" e "Mestre da trilha".',
    en: 'Seven new challenges for players who already play and three achievements: "Beyond the basics", "Challenges for players" and "Path master".',
  },
  {
    date: '2026-11-27',
    pt: 'No app, o deck mostra a base de mana e as chances da mão inicial, como no site, e as conquistas novas da trilha aparecem no perfil.',
    en: 'In the app, decks show the mana base and opening hand odds, like on the site, and the new learning path achievements show on profiles.',
  },
  {
    date: '2026-11-27',
    pt: 'No app, o ranking ganhou as estatísticas do site: destaques, sequências de vitórias, confronto direto, decks e comandantes mais jogados, com os mesmos filtros.',
    en: 'In the app, the ranking now has the site\u2019s stats: highlights, win streaks, head to head, most played decks and commanders, with the same filters.',
  },
  {
    date: '2026-11-27',
    pt: 'No app, o deck mostra a comparação com outros decks do mesmo comandante e, em cada função, as alternativas para trocar, como no site.',
    en: 'In the app, decks show the comparison with other decks of the same commander and, for each role, alternatives to swap in, like on the site.',
  },
  {
    date: '2026-11-27',
    pt: '"Aprender a jogar" chegou ao app (aba Conta): as mesmas lições e desafios do site, com o progresso compartilhado.',
    en: '"Learn to play" is now in the app (Account tab): the same lessons and challenges as the site, with shared progress.',
  },
];

/** Entradas depois do dia `after` (exclusive) até `until` (inclusive), em AAAA-MM-DD. */
export function changelogSince(
  entries: readonly ChangelogEntry[],
  after: string,
  until: string,
): ChangelogEntry[] {
  return entries.filter((e) => e.date > after && e.date <= until);
}

/** Título e texto do rascunho (texto simples, uma novidade por linha). */
export function changelogDraft(
  entries: readonly ChangelogEntry[],
  locale: 'pt-BR' | 'en' = 'pt-BR',
) {
  return {
    title: locale === 'en' ? 'This week’s news' : 'Novidades da semana',
    body: entries.map((e) => `• ${locale === 'en' ? e.en : e.pt}`).join('\n'),
  };
}
