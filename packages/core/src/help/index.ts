/**
 * Ajuda (FAQ): os fluxos do ArcanaKin explicados passo a passo, nos dois idiomas. Texto fixo,
 * sem nenhum dado de pessoa ou grupo: os exemplos usam nomes inventados. Fica no core para o
 * site (/ajuda) e o app (Conta → Ajuda) mostrarem exatamente o mesmo conteúdo.
 *
 * Mudou um fluxo? Atualize os dois idiomas; o teste confere que as seções e perguntas batem.
 */

export type HelpLocale = 'pt-BR' | 'en';

export interface HelpQuestion {
  id: string;
  question: string;
  /** Parágrafos curtos antes dos passos. */
  intro?: string[];
  /** Passos numerados, na ordem em que a pessoa faz. */
  steps?: string[];
  /** Observações depois dos passos. */
  notes?: string[];
}

export interface HelpSection {
  id: string;
  title: string;
  questions: HelpQuestion[];
}

export interface HelpContent {
  title: string;
  intro: string;
  sections: HelpSection[];
}

export const HELP: Record<HelpLocale, HelpContent> = {
  'pt-BR': {
    title: 'Ajuda',
    intro:
      'Como fazer cada coisa no ArcanaKin, passo a passo. Os nomes dos botões são os que você vê no site e no app.',
    sections: [
      {
        id: 'comecar',
        title: 'Começar',
        questions: [
          {
            id: 'entrar-grupo',
            question: 'Como entro no grupo da minha mesa?',
            steps: [
              'Peça o link ou o código de convite para quem organiza o grupo.',
              'Abra o link (ele já leva ao grupo) ou, no app ou no site, toque em "Entrar ou criar grupo" e digite o código.',
              'Entre com a sua conta Google ou com e-mail e senha. Pronto: você já vê os encontros e a disponibilidade do grupo.',
            ],
            notes: [
              'Pode estar em mais de um grupo: o grupo ativo troca na aba Conta (app) ou no menu Grupo (site).',
            ],
          },
          {
            id: 'criar-grupo',
            question: 'Como crio um grupo novo e convido as pessoas?',
            steps: [
              'Toque em "Entrar ou criar grupo" e depois em "Criar grupo". Dê um nome (ex.: "Mesa de Terça").',
              'Abra "Seu grupo" (app) ou o menu Grupo (site): ali estão o link e o código de convite.',
              'Toque em "Compartilhar convite" para mandar pelo WhatsApp ou por onde preferir. No site também há um QR Code para imprimir.',
            ],
            notes: [
              'Quem cria o grupo vira dono(a) e pode promover admins, remover pessoas e passar a posse. Se o link vazar, gere um novo convite: o antigo deixa de funcionar.',
            ],
          },
        ],
      },
      {
        id: 'disponibilidade',
        title: 'Disponibilidade e horários',
        questions: [
          {
            id: 'marcar-disponibilidade',
            question: 'Como digo quando posso jogar?',
            steps: [
              'Abra Disponibilidade.',
              'Escolha "Uma vez" para um dia específico ou "Toda semana" para um horário fixo (ex.: terças das 19h às 23h).',
              'Marque o início e o fim e, se quiser, onde você pode jogar. Salve.',
            ],
            notes: [
              'Numa semana em que você não pode, use "Não posso nesta data" na regra semanal: só aquele dia é pulado.',
              'Os horários valem no seu fuso horário (Configurações).',
            ],
          },
          {
            id: 'mesa-fecha',
            question: 'O que é "a mesa fechou"?',
            intro: [
              'É quando o número mínimo de pessoas do grupo (configurado pelo organizador, por padrão 4) está disponível no mesmo horário. A lista "Horários em que a mesa fecha" mostra esses momentos, e dá para marcar o encontro direto dali com um toque.',
            ],
          },
        ],
      },
      {
        id: 'encontros',
        title: 'Encontros',
        questions: [
          {
            id: 'criar-encontro',
            question: 'Como marco um encontro?',
            steps: [
              'Em Encontros, toque em "Novo encontro" (ou use um horário em que a mesa fecha, na Disponibilidade).',
              'Preencha o título (já vem "Commander"), quando e onde. Marque quem vai participar.',
              'Salve. Todo mundo do grupo recebe um aviso (e-mail ou notificação no celular, conforme a preferência de cada um).',
            ],
          },
          {
            id: 'presenca',
            question: 'Como confirmo presença?',
            steps: [
              'Abra o encontro e, em "Sua presença", escolha "Vou", "Talvez" ou "Não vou".',
              'Mudou de ideia? É só tocar de novo. O organizador vê a lista atualizada.',
            ],
          },
          {
            id: 'cancelar-encontro',
            question: 'Como cancelo ou finalizo um encontro?',
            intro: [
              'Quem criou o encontro, ou um admin do grupo, pode cancelar (o botão pede confirmação em dois toques) ou marcar como finalizado depois do início. Finalizar manda o resumo da noite para o grupo. Um encontro cancelado pode ser reaberto.',
            ],
          },
        ],
      },
      {
        id: 'partidas',
        title: 'Registrar partidas',
        questions: [
          {
            id: 'commander-dois',
            question: 'Como registro uma partida de Commander com duas pessoas?',
            intro: [
              'Commander aceita de 2 a 8 jogadores. A partida sempre fica dentro de um encontro do grupo, e os dois jogadores precisam estar no grupo.',
            ],
            steps: [
              'Marque um encontro (ou abra um já existente) e confirme a presença dos dois.',
              'No encontro, toque em "Registrar partida".',
              'Em "Tipo de jogo", escolha Commander. Em "Jogou", marque os dois jogadores.',
              'Marque "Venceu" em quem ganhou, ou "A partida terminou empatada". Se quiser, escolha o deck de cada um.',
              'Em "Mais detalhes (opcional)": quem começou, turno em que acabou, duração e observações. Toque em "Registrar partida".',
            ],
            notes: [
              'A partida entra no ranking do grupo e nas estatísticas e conquistas de cada jogador. Para corrigir, abra a partida no encontro e edite; para apagar, "Remover partida" (pede confirmação).',
            ],
          },
          {
            id: 'modo-mesa',
            question: 'Como uso o modo mesa (contador de vida) durante o jogo?',
            steps: [
              'No encontro, toque em "Abrir modo mesa".',
              'Escolha o tipo de jogo (a vida inicial já vem certa: 40 no Commander), marque quem está jogando e, se quiser, o deck de cada um. Toque em "Começar".',
              'Deite o celular no meio da mesa: cada área fica virada para quem está daquele lado. Toque para tirar ou somar 1 de vida, segure para 10.',
              'O botão do centro tem dado, moeda, sorteio de quem começa, desfazer e trocar lugares. O botão de cada jogador abre dano de comandante, veneno e outros marcadores.',
              'Quando sobrar um jogador, o app sugere o vencedor. Toque em "Encerrar e registrar", confira e salve.',
            ],
            notes: [
              'A tela fica acesa enquanto a mesa está aberta. No iPhone, para usar a tela toda, adicione o ArcanaKin à tela inicial pelo botão Compartilhar.',
              'A partida fica salva no aparelho até você registrar ou descartar: dá para fechar e voltar depois.',
            ],
          },
          {
            id: 'outros-formatos',
            question: 'E outros formatos (Two-Headed Giant, Standard, Draft)?',
            intro: [
              'Em "Tipo de jogo" há Commander, Brawl, Oathbreaker, Two-Headed Giant (2×2, com times), formatos de 60 cartas, Draft, Selado e "Outro". A tela diz quantos jogadores cada um aceita.',
            ],
          },
        ],
      },
      {
        id: 'decks',
        title: 'Decks',
        questions: [
          {
            id: 'importar-deck',
            question: 'Como trago meu deck do Moxfield ou do Archidekt?',
            steps: [
              'No site, abra Decks e toque em "Importar".',
              'Cole o link do Archidekt ou, no caso do Moxfield (que bloqueia a leitura automática), copie a lista em texto e cole.',
              'Confira o nome e a visibilidade (só você, o grupo ou público) e salve. O app mostra o deck; editar continua no site.',
            ],
          },
          {
            id: 'edicao-carta',
            question: 'Como escolho a edição (impressão) de uma carta?',
            steps: [
              'No deck, no modo Editar, toque em "Edição" na carta.',
              'Filtre pelo código e número ("ltr 268"), por parte do nome da edição ou pelo ilustrador ("tedin"), útil em cartas antigas sem número.',
              'Escolha a impressão e quantas cópias mudam. As outras continuam na edição atual.',
            ],
          },
          {
            id: 'proxies',
            question: 'Como marco e imprimo proxies?',
            intro: [
              'No modo Editar, marque quantas cópias de cada carta são proxy. Em "Imprimir proxies" sai um PDF em tamanho real, só com os proxies ou com o deck todo.',
            ],
          },
        ],
      },
      {
        id: 'ranking',
        title: 'Ranking, temporadas e conquistas',
        questions: [
          {
            id: 'pontos',
            question: 'Como funciona o ranking?',
            intro: [
              'Cada partida registrada dá pontos a quem jogou, com mais para quem venceu. O ranking do grupo soma tudo; os filtros mostram um período, uma temporada ou um tipo de jogo. Temporadas são criadas pelo organizador nas configurações do grupo, e quem termina em 1º ganha o título no perfil.',
            ],
          },
          {
            id: 'conquistas',
            question: 'O que são as conquistas?',
            intro: [
              'Selos que aparecem no perfil conforme você joga: primeira partida, primeira vitória, sequências, vitória rápida, fiel ao deck, campeão da temporada e outros. Abra o perfil (toque no seu nome no ranking) para ver o progresso de cada uma.',
            ],
          },
        ],
      },
      {
        id: 'avisos',
        title: 'Avisos e notificações',
        questions: [
          {
            id: 'avisos-celular',
            question: 'Como recebo avisos no celular?',
            steps: [
              'No app, abra Conta e ligue "Avisos neste celular".',
              'Aceite a permissão do sistema. Você passa a receber encontro novo, mudança, cancelamento, lembrete no dia e "a mesa fechou!".',
            ],
            notes: [
              'Avisos por e-mail ligam e desligam em Configurações. Sair da conta desliga os avisos daquele celular.',
            ],
          },
        ],
      },
      {
        id: 'conta',
        title: 'Conta e privacidade',
        questions: [
          {
            id: 'fuso-idioma',
            question: 'Como mudo fuso horário e idioma?',
            intro: [
              'Em Configurações. O fuso vale para todas as datas e horários que você vê e digita; o idioma vale para o site e os e-mails (o app segue o idioma do aparelho).',
            ],
          },
          {
            id: 'dados',
            question: 'Que dados o ArcanaKin guarda e como apago a minha conta?',
            intro: [
              'Nome, e-mail e foto da conta, seus grupos, disponibilidade, encontros, partidas e decks. Nada é vendido nem compartilhado fora do grupo. Em Configurações (site) ou Conta (app) dá para baixar seus dados e excluir a conta: os dados pessoais somem e as partidas ficam no histórico do grupo como "Jogador removido".',
              'A Política de Privacidade completa está no rodapé.',
            ],
          },
          {
            id: 'feedback',
            question: 'Achei um problema ou tenho uma ideia. Para onde mando?',
            intro: [
              'Use "Feedback" (no rodapé do site ou na aba Conta do app). A mensagem chega direto para quem cuida do projeto.',
            ],
          },
        ],
      },
    ],
  },
  en: {
    title: 'Help',
    intro:
      'How to do each thing in ArcanaKin, step by step. Button names are the ones you see on the website and in the app.',
    sections: [
      {
        id: 'comecar',
        title: 'Getting started',
        questions: [
          {
            id: 'entrar-grupo',
            question: 'How do I join my table’s group?',
            steps: [
              'Ask whoever runs the group for the invite link or code.',
              'Open the link (it takes you straight to the group) or, in the app or on the website, tap "Join or create a group" and type the code.',
              'Sign in with your Google account or with e-mail and password. Done: you can already see the group’s meetups and availability.',
            ],
            notes: [
              'You can be in more than one group: switch the active group in the Account tab (app) or the Group menu (website).',
            ],
          },
          {
            id: 'criar-grupo',
            question: 'How do I create a new group and invite people?',
            steps: [
              'Tap "Join or create a group", then "Create group". Give it a name (e.g. "Tuesday Table").',
              'Open "Your group" (app) or the Group menu (website): the invite link and code are there.',
              'Tap "Share invite" to send it on WhatsApp or wherever you like. The website also has a QR code to print.',
            ],
            notes: [
              'Whoever creates the group becomes the owner and can promote admins, remove people and transfer ownership. If the link leaks, generate a new invite: the old one stops working.',
            ],
          },
        ],
      },
      {
        id: 'disponibilidade',
        title: 'Availability and times',
        questions: [
          {
            id: 'marcar-disponibilidade',
            question: 'How do I say when I can play?',
            steps: [
              'Open Availability.',
              'Choose "Once" for a specific day or "Every week" for a fixed slot (e.g. Tuesdays 7 pm to 11 pm).',
              'Set the start and end and, if you like, where you can play. Save.',
            ],
            notes: [
              'For a week you can’t make it, use "Can’t make this date" on the weekly rule: only that day is skipped.',
              'Times are in your time zone (Settings).',
            ],
          },
          {
            id: 'mesa-fecha',
            question: 'What does "the table fills up" mean?',
            intro: [
              'It’s when the group’s minimum number of people (set by the organizer, 4 by default) is available at the same time. The "Times when the table fills up" list shows those moments, and you can schedule the meetup right from there with one tap.',
            ],
          },
        ],
      },
      {
        id: 'encontros',
        title: 'Meetups',
        questions: [
          {
            id: 'criar-encontro',
            question: 'How do I schedule a meetup?',
            steps: [
              'In Meetups, tap "New meetup" (or use a time when the table fills up, in Availability).',
              'Fill in the title (it defaults to "Commander"), when and where. Mark who is taking part.',
              'Save. Everyone in the group gets a notice (e-mail or phone notification, depending on each person’s preference).',
            ],
          },
          {
            id: 'presenca',
            question: 'How do I RSVP?',
            steps: [
              'Open the meetup and, under "Your RSVP", choose "Going", "Maybe" or "Not going".',
              'Changed your mind? Just tap again. The organizer sees the updated list.',
            ],
          },
          {
            id: 'cancelar-encontro',
            question: 'How do I cancel or finish a meetup?',
            intro: [
              'Whoever created the meetup, or a group admin, can cancel it (the button asks for a two-tap confirmation) or mark it as finished after it starts. Finishing sends the night’s recap to the group. A cancelled meetup can be reopened.',
            ],
          },
        ],
      },
      {
        id: 'partidas',
        title: 'Recording games',
        questions: [
          {
            id: 'commander-dois',
            question: 'How do I record a two-player Commander game?',
            intro: [
              'Commander takes 2 to 8 players. A game always belongs to a group meetup, and both players must be in the group.',
            ],
            steps: [
              'Schedule a meetup (or open an existing one) and confirm both RSVPs.',
              'In the meetup, tap "Record game".',
              'Under "Game type", choose Commander. Under "Played", mark both players.',
              'Mark "Won" on the winner, or "The game ended in a draw". Optionally pick each player’s deck.',
              'Under "More details (optional)": who went first, the turn it ended, duration and notes. Tap "Record game".',
            ],
            notes: [
              'The game counts for the group ranking and each player’s stats and achievements. To fix it, open the game in the meetup and edit; to delete, "Remove game" (asks for confirmation).',
            ],
          },
          {
            id: 'modo-mesa',
            question: 'How do I use table mode (life counter) during the game?',
            steps: [
              'In the meetup, tap "Open table mode".',
              'Choose the game type (starting life is already right: 40 in Commander), mark who is playing and, optionally, each deck. Tap "Start".',
              'Lay the phone in the middle of the table: each area faces the person on that side. Tap to lose or gain 1 life, hold for 10.',
              'The centre button has a die, a coin, a first-player draw, undo and swap seats. Each player’s button opens commander damage, poison and other counters.',
              'When one player is left, the app suggests the winner. Tap "End and record", check and save.',
            ],
            notes: [
              'The screen stays on while the table is open. On iPhone, to use the whole screen, add ArcanaKin to your Home Screen from the Share button.',
              'The game stays saved on the device until you record or discard it: you can close and come back later.',
            ],
          },
          {
            id: 'outros-formatos',
            question: 'What about other formats (Two-Headed Giant, Standard, Draft)?',
            intro: [
              'Under "Game type" there are Commander, Brawl, Oathbreaker, Two-Headed Giant (2×2, with teams), 60-card formats, Draft, Sealed and "Other". The screen says how many players each one takes.',
            ],
          },
        ],
      },
      {
        id: 'decks',
        title: 'Decks',
        questions: [
          {
            id: 'importar-deck',
            question: 'How do I bring my deck from Moxfield or Archidekt?',
            steps: [
              'On the website, open Decks and tap "Import".',
              'Paste the Archidekt link or, for Moxfield (which blocks automatic reading), copy the list as text and paste it.',
              'Check the name and visibility (only you, the group or public) and save. The app shows the deck; editing stays on the website.',
            ],
          },
          {
            id: 'edicao-carta',
            question: 'How do I choose a card’s edition (printing)?',
            steps: [
              'In the deck, in Edit mode, tap "Edition" on the card.',
              'Filter by set code and number ("ltr 268"), by part of the set name or by artist ("tedin"), handy for old cards without a number.',
              'Pick the printing and how many copies change. The rest keep the current edition.',
            ],
          },
          {
            id: 'proxies',
            question: 'How do I mark and print proxies?',
            intro: [
              'In Edit mode, mark how many copies of each card are proxies. "Print proxies" produces a real-size PDF with only the proxies or the whole deck.',
            ],
          },
        ],
      },
      {
        id: 'ranking',
        title: 'Ranking, seasons and achievements',
        questions: [
          {
            id: 'pontos',
            question: 'How does the ranking work?',
            intro: [
              'Each recorded game gives points to everyone who played, with more for the winner. The group ranking adds it all up; filters show a period, a season or a game type. Seasons are created by the organizer in the group settings, and whoever finishes 1st gets the title on their profile.',
            ],
          },
          {
            id: 'conquistas',
            question: 'What are achievements?',
            intro: [
              'Badges that appear on your profile as you play: first game, first win, streaks, lightning win, loyal to the deck, season champion and more. Open a profile (tap a name in the ranking) to see the progress of each one.',
            ],
          },
        ],
      },
      {
        id: 'avisos',
        title: 'Notices and notifications',
        questions: [
          {
            id: 'avisos-celular',
            question: 'How do I get notifications on my phone?',
            steps: [
              'In the app, open Account and turn on "Notifications on this phone".',
              'Accept the system permission. You’ll get new meetup, changes, cancellation, a reminder on the day and "the table filled up!".',
            ],
            notes: [
              'E-mail notices are turned on and off in Settings. Signing out turns off notifications on that phone.',
            ],
          },
        ],
      },
      {
        id: 'conta',
        title: 'Account and privacy',
        questions: [
          {
            id: 'fuso-idioma',
            question: 'How do I change time zone and language?',
            intro: [
              'In Settings. The time zone applies to every date and time you see and type; the language applies to the website and e-mails (the app follows the device language).',
            ],
          },
          {
            id: 'dados',
            question: 'What data does ArcanaKin keep, and how do I delete my account?',
            intro: [
              'Your account name, e-mail and photo, your groups, availability, meetups, games and decks. Nothing is sold or shared outside the group. In Settings (website) or Account (app) you can download your data and delete your account: personal data is erased and games stay in the group history as "Removed player".',
              'The full Privacy Policy is in the footer.',
            ],
          },
          {
            id: 'feedback',
            question: 'I found a problem or have an idea. Where do I send it?',
            intro: [
              'Use "Feedback" (in the website footer or the app’s Account tab). The message goes straight to the people running the project.',
            ],
          },
        ],
      },
    ],
  },
};
