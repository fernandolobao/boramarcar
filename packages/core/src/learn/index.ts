/**
 * Trilha "Aprender a jogar" (12.1): lições curtas com texto **nosso** sobre as regras de Magic,
 * nos dois idiomas, e links para as regras oficiais da Wizards (Política de Conteúdo de Fãs: não
 * copiamos as Regras Abrangentes, só explicamos e linkamos). Fica no core para o site (/aprender)
 * e o app mostrarem o mesmo conteúdo.
 *
 * `{G}`, `{T}` etc. no texto viram símbolos de mana na tela. `cards` são nomes em inglês (os do
 * Scryfall), mostrados como exemplo. Mudou uma lição? Atualize os dois idiomas; o teste confere
 * que as lições e seções batem.
 */

export type LearnLocale = 'pt-BR' | 'en';

export interface LessonSection {
  id: string;
  heading: string;
  paragraphs: string[];
  /** Cartas de exemplo (nome em inglês, como no Scryfall). */
  cards?: string[];
}

export interface Lesson {
  /** Vira o endereço (`/aprender/<id>`) e a chave do progresso. */
  id: LessonId;
  title: string;
  summary: string;
  /** Tempo de leitura, em minutos. */
  minutes: number;
  sections: LessonSection[];
  /** "Para lembrar": o essencial da lição em poucas linhas. */
  remember: string[];
}

export interface LearnContent {
  title: string;
  intro: string;
  official: { title: string; text: string; rules: string; glossary: string };
  lessons: Lesson[];
}

export const LESSON_IDS = [
  'o-que-e-magic',
  'tipos-de-carta',
  'mana-e-terrenos',
  'o-turno',
  'combate',
  'a-pilha',
  'como-se-vence',
] as const;
export type LessonId = (typeof LESSON_IDS)[number];

export const isLessonId = (value: string): value is LessonId =>
  (LESSON_IDS as readonly string[]).includes(value);

/** Páginas oficiais da Wizards: regras (básicas e abrangentes) e glossário de palavras-chave. */
export const OFFICIAL_LINKS: Record<LearnLocale, { rules: string; glossary: string }> = {
  'pt-BR': {
    rules: 'https://magic.wizards.com/pt-BR/rules',
    glossary: 'https://magic.wizards.com/pt-BR/keyword-glossary',
  },
  en: {
    rules: 'https://magic.wizards.com/en/rules',
    glossary: 'https://magic.wizards.com/en/keyword-glossary',
  },
};

export const LEARN: Record<LearnLocale, LearnContent> = {
  'pt-BR': {
    title: 'Aprender a jogar',
    intro:
      'Sete lições curtas para quem nunca jogou Magic: The Gathering. Em meia hora você entende o jogo e chega pronto para a primeira mesa do grupo.',
    official: {
      title: 'Regras oficiais',
      text: 'Estas lições explicam o jogo com as nossas palavras. As regras completas e o glossário oficial estão no site da Wizards of the Coast.',
      rules: 'Regras do Magic (Wizards of the Coast)',
      glossary: 'Glossário de palavras-chave (Wizards of the Coast)',
    },
    lessons: [
      {
        id: 'o-que-e-magic',
        title: 'O que é Magic',
        summary: 'Um duelo entre magos: cada jogador tem um deck e tenta zerar a vida do outro.',
        minutes: 3,
        sections: [
          {
            id: 'duelo',
            heading: 'Um duelo de magos',
            paragraphs: [
              'Em Magic, cada jogador é um mago que usa cartas para lançar mágicas, invocar criaturas e se defender. Cada um joga com o próprio deck, uma pilha de cartas montada antes da partida.',
              'Você começa com 20 pontos de vida (40 no Commander, o formato mais jogado em grupo). Quem chegar a 0 perde.',
            ],
          },
          {
            id: 'partida',
            heading: 'Como começa uma partida',
            paragraphs: [
              'Cada jogador embaralha o deck, que vira o seu grimório, e compra sete cartas: a mão inicial.',
              'Não gostou da mão? Você pode fazer um mulligan: embaralha a mão de volta, compra sete de novo e coloca uma carta no fundo do grimório para cada mulligan que já fez.',
              'Depois, os jogadores se revezam em turnos. No seu turno você compra uma carta, joga um terreno, lança mágicas e ataca.',
            ],
          },
          {
            id: 'zonas',
            heading: 'Onde ficam as cartas',
            paragraphs: [
              'Grimório: o seu deck, virado para baixo. Mão: as cartas que só você vê. Campo de batalha: a mesa, onde ficam terrenos, criaturas e outras permanentes.',
              'Cemitério: o descarte, virado para cima, para onde vão as mágicas usadas e as criaturas destruídas. Exílio: cartas removidas do jogo.',
            ],
          },
        ],
        remember: [
          'Cada jogador tem o próprio deck.',
          'A vida começa em 20 (40 no Commander).',
          'A mão inicial tem sete cartas; o mulligan troca a mão.',
        ],
      },
      {
        id: 'tipos-de-carta',
        title: 'Tipos de carta',
        summary:
          'Terrenos, criaturas, mágicas instantâneas, feitiços, artefatos, encantamentos e planeswalkers.',
        minutes: 5,
        sections: [
          {
            id: 'ler',
            heading: 'Como ler uma carta',
            paragraphs: [
              'No alto, o nome e o custo de mana (os símbolos no canto). No meio, a linha de tipo diz que tipo de carta é. Embaixo, a caixa de texto explica o que ela faz.',
              'Criaturas têm, no canto de baixo, poder e resistência, como 2/2: o primeiro número é o dano que ela causa, o segundo é quanto dano ela aguenta.',
            ],
            cards: ['Grizzly Bears'],
          },
          {
            id: 'permanentes',
            heading: 'Permanentes: ficam na mesa',
            paragraphs: [
              'Terrenos produzem mana. Criaturas atacam e bloqueiam. Artefatos são objetos mágicos e encantamentos são efeitos duradouros. Planeswalkers são aliados poderosos com habilidades de lealdade.',
              'Tudo isso fica no campo de batalha depois de jogado, por isso se chamam permanentes.',
            ],
            cards: ['Forest', 'Sol Ring', 'Pacifism'],
          },
          {
            id: 'magicas',
            heading: 'Mágicas instantâneas e feitiços: usou, acabou',
            paragraphs: [
              'Mágicas instantâneas e feitiços fazem o efeito e vão para o cemitério.',
              'A diferença é a hora: feitiços só no seu turno, com a pilha vazia, na fase principal. Mágicas instantâneas podem ser lançadas a qualquer momento, até no turno do oponente, como resposta.',
            ],
            cards: ['Lightning Bolt', 'Divination'],
          },
        ],
        remember: [
          'Permanentes ficam na mesa; mágicas instantâneas e feitiços vão para o cemitério.',
          'Feitiço: só no seu turno. Mágica instantânea: a qualquer momento.',
          'Poder/resistência: dano que causa / dano que aguenta.',
        ],
      },
      {
        id: 'mana-e-terrenos',
        title: 'Mana e terrenos',
        summary:
          'As cinco cores, como pagar o custo de uma carta e por que jogar um terreno por turno.',
        minutes: 4,
        sections: [
          {
            id: 'cores',
            heading: 'As cinco cores',
            paragraphs: [
              'Magic tem cinco cores: branco {W}, azul {U}, preto {B}, vermelho {R} e verde {G}. Cada cor tem um jeito de jogar, e cada terreno básico gera mana de uma delas: Planície, Ilha, Pântano, Montanha e Floresta.',
              'Há também mana incolor {C}, que não é de nenhuma cor.',
            ],
            cards: ['Plains', 'Island', 'Swamp', 'Mountain', 'Forest'],
          },
          {
            id: 'custo',
            heading: 'Como pagar um custo',
            paragraphs: [
              'O custo {2}{G} pede um mana verde mais dois de qualquer tipo. O número é mana genérico: qualquer mana serve.',
              'Para gerar mana, você vira o terreno ({T}: gire a carta de lado). Ele desvira no início do seu próximo turno.',
            ],
          },
          {
            id: 'um-por-turno',
            heading: 'Um terreno por turno',
            paragraphs: [
              'Você pode jogar um terreno por turno, só no seu turno, na fase principal. Jogar terreno não usa a pilha e ninguém pode responder.',
              'Por isso um deck costuma ter muitos terrenos (cerca de 40% das cartas): sem eles, a mão trava. Alguns artefatos e criaturas também geram mana e aceleram o jogo.',
            ],
            cards: ['Llanowar Elves', 'Sol Ring'],
          },
        ],
        remember: [
          'Cinco cores: {W} {U} {B} {R} {G}.',
          'Vire um terreno ({T}) para gerar mana.',
          'Um terreno por turno.',
        ],
      },
      {
        id: 'o-turno',
        title: 'O turno',
        summary: 'Início, primeira fase principal, combate, segunda fase principal e final.',
        minutes: 4,
        sections: [
          {
            id: 'inicio',
            heading: 'Fase inicial',
            paragraphs: [
              'Desvirar: desvire todas as suas permanentes. Manutenção: algumas cartas fazem algo nesse momento. Compra: compre uma carta.',
              'Numa partida de dois jogadores, quem começa não compra no primeiro turno.',
            ],
          },
          {
            id: 'principal',
            heading: 'Fases principais',
            paragraphs: [
              'Na primeira fase principal você joga o terreno do turno e lança criaturas, feitiços e outras permanentes.',
              'Depois do combate vem a segunda fase principal, com as mesmas possibilidades. Muitas vezes vale esperar o combate para decidir o que jogar.',
            ],
          },
          {
            id: 'final',
            heading: 'Fase final',
            paragraphs: [
              'Na etapa final, alguns efeitos acontecem. Na limpeza, quem tiver mais de sete cartas na mão descarta até ficar com sete, e o dano nas criaturas some.',
              'Então o turno passa para o próximo jogador.',
            ],
          },
        ],
        remember: [
          'Desvirar, manutenção, compra.',
          'Principal, combate, principal.',
          'No fim do turno, o dano nas criaturas some.',
        ],
      },
      {
        id: 'combate',
        title: 'Combate',
        summary: 'Atacar, bloquear e causar dano, com as habilidades mais comuns.',
        minutes: 5,
        sections: [
          {
            id: 'atacar',
            heading: 'Atacar',
            paragraphs: [
              'Você escolhe quais criaturas atacam e as vira. Cada uma ataca um jogador (ou um planeswalker dele).',
              'Uma criatura que entrou no campo neste turno não pode atacar: é o enjoo de invocação. Criaturas com ímpeto ignoram essa regra.',
            ],
          },
          {
            id: 'bloquear',
            heading: 'Bloquear',
            paragraphs: [
              'O defensor escolhe quais das suas criaturas desviradas bloqueiam, e qual atacante cada uma bloqueia. Várias criaturas podem bloquear o mesmo atacante.',
              'Atacante não bloqueado causa dano ao jogador. Atacante bloqueado e bloqueador causam dano um ao outro. Criatura que recebe dano igual ou maior que a resistência é destruída.',
            ],
            cards: ['Grizzly Bears', 'Serra Angel'],
          },
          {
            id: 'habilidades',
            heading: 'Palavras-chave mais comuns',
            paragraphs: [
              'Voar: só pode ser bloqueada por criaturas com voar ou alcance. Vigilância: atacar não vira a criatura. Atropelar: o dano que passa da resistência do bloqueador vai para o jogador.',
              'Toque mortífero: qualquer dano dessa criatura destrói. Iniciativa: causa dano antes das criaturas sem iniciativa. Vínculo com a vida: o dano que ela causa vira vida para você.',
            ],
            cards: ['Giant Growth'],
          },
        ],
        remember: [
          'Criatura nova não ataca (a não ser com ímpeto).',
          'Quem defende escolhe os bloqueios.',
          'Dano igual à resistência destrói a criatura.',
        ],
      },
      {
        id: 'a-pilha',
        title: 'A pilha e as respostas',
        summary: 'Como responder a uma mágica e por que a última a entrar resolve primeiro.',
        minutes: 4,
        sections: [
          {
            id: 'pilha',
            heading: 'O que é a pilha',
            paragraphs: [
              'Quando você lança uma mágica ou ativa uma habilidade, ela não acontece na hora: vai para a pilha e espera.',
              'Todos os jogadores têm a chance de responder com mágicas instantâneas e habilidades. Quando ninguém mais quer responder, o que está no topo da pilha resolve.',
            ],
          },
          {
            id: 'ordem',
            heading: 'A última resolve primeiro',
            paragraphs: [
              'Exemplo: você ataca com Ursos Pardos (2/2) e o oponente lança um Raio para causar 3 de dano nele. Em resposta, você lança Crescimento Gigante (+3/+3). O Crescimento entrou por último, então resolve primeiro: os Ursos viram 5/5, e o Raio não basta para destruí-los.',
              'Contramágicas usam a pilha para anular outra mágica antes que ela resolva.',
            ],
            cards: ['Lightning Bolt', 'Giant Growth', 'Counterspell'],
          },
        ],
        remember: [
          'Mágicas e habilidades esperam na pilha.',
          'A última a entrar resolve primeiro.',
          'Terreno não usa a pilha.',
        ],
      },
      {
        id: 'como-se-vence',
        title: 'Como se vence',
        summary: 'Vida a zero, grimório vazio, veneno e o que muda no Commander.',
        minutes: 3,
        sections: [
          {
            id: 'vitoria',
            heading: 'Jeitos de perder (e de vencer)',
            paragraphs: [
              'Um jogador perde quando a vida chega a 0, quando precisa comprar uma carta e o grimório está vazio ou quando recebe 10 marcadores de veneno.',
              'Algumas cartas dizem "você vence o jogo": raras, mas existem. Ganha quem sobrar.',
            ],
          },
          {
            id: 'commander',
            heading: 'No Commander',
            paragraphs: [
              'Cada deck tem 100 cartas, uma de cada (exceto terrenos básicos), e um comandante: uma criatura lendária que começa fora do deck, na zona de comando.',
              'A vida começa em 40, e quem recebe 21 de dano de combate do mesmo comandante perde. É o formato mais jogado em grupos, com três ou quatro pessoas na mesa.',
            ],
          },
          {
            id: 'proximo',
            heading: 'E agora?',
            paragraphs: [
              'O melhor jeito de aprender é jogando. Monte um deck no ArcanaKin (ou importe um pronto), teste a mão inicial e marque um encontro com o grupo.',
            ],
          },
        ],
        remember: [
          'Vida 0, grimório vazio ou 10 venenos: derrota.',
          'Commander: 100 cartas, 40 de vida, 21 de dano de comandante.',
        ],
      },
    ],
  },
  en: {
    title: 'Learn to play',
    intro:
      'Seven short lessons for anyone who has never played Magic: The Gathering. In half an hour you understand the game and are ready for your first table with the group.',
    official: {
      title: 'Official rules',
      text: 'These lessons explain the game in our own words. The full rules and the official glossary are on the Wizards of the Coast website.',
      rules: 'Magic rules (Wizards of the Coast)',
      glossary: 'Keyword glossary (Wizards of the Coast)',
    },
    lessons: [
      {
        id: 'o-que-e-magic',
        title: 'What Magic is',
        summary:
          'A duel between wizards: each player has a deck and tries to bring the other to zero life.',
        minutes: 3,
        sections: [
          {
            id: 'duelo',
            heading: 'A duel of wizards',
            paragraphs: [
              'In Magic, each player is a wizard who uses cards to cast spells, summon creatures and defend themselves. Everyone plays with their own deck, a stack of cards built before the game.',
              'You start at 20 life (40 in Commander, the format most played in groups). Whoever reaches 0 loses.',
            ],
          },
          {
            id: 'partida',
            heading: 'How a game starts',
            paragraphs: [
              'Each player shuffles their deck, which becomes their library, and draws seven cards: the opening hand.',
              "Don't like the hand? You can mulligan: shuffle the hand back, draw seven again and put one card on the bottom of your library for each mulligan you have taken.",
              'Then players take turns. On your turn you draw a card, play a land, cast spells and attack.',
            ],
          },
          {
            id: 'zonas',
            heading: 'Where the cards go',
            paragraphs: [
              'Library: your deck, face down. Hand: the cards only you see. Battlefield: the table, where lands, creatures and other permanents stay.',
              'Graveyard: the discard pile, face up, where used spells and destroyed creatures go. Exile: cards removed from the game.',
            ],
          },
        ],
        remember: [
          'Each player has their own deck.',
          'Life starts at 20 (40 in Commander).',
          'The opening hand has seven cards; a mulligan swaps the hand.',
        ],
      },
      {
        id: 'tipos-de-carta',
        title: 'Card types',
        summary:
          'Lands, creatures, instants, sorceries, artifacts, enchantments and planeswalkers.',
        minutes: 5,
        sections: [
          {
            id: 'ler',
            heading: 'How to read a card',
            paragraphs: [
              'At the top, the name and the mana cost (the symbols in the corner). In the middle, the type line says what kind of card it is. Below, the text box explains what it does.',
              'Creatures have power and toughness in the bottom corner, like 2/2: the first number is the damage it deals, the second is how much damage it can take.',
            ],
            cards: ['Grizzly Bears'],
          },
          {
            id: 'permanentes',
            heading: 'Permanents: they stay on the table',
            paragraphs: [
              'Lands make mana. Creatures attack and block. Artifacts are magical objects and enchantments are lasting effects. Planeswalkers are powerful allies with loyalty abilities.',
              "All of these stay on the battlefield once played, which is why they're called permanents.",
            ],
            cards: ['Forest', 'Sol Ring', 'Pacifism'],
          },
          {
            id: 'magicas',
            heading: 'Instants and sorceries: use and done',
            paragraphs: [
              'Instants and sorceries do their effect and go to the graveyard.',
              "The difference is timing: sorceries only on your turn, with an empty stack, in a main phase. Instants can be cast at any time, even on an opponent's turn, as a response.",
            ],
            cards: ['Lightning Bolt', 'Divination'],
          },
        ],
        remember: [
          'Permanents stay on the table; instants and sorceries go to the graveyard.',
          'Sorcery: only on your turn. Instant: any time.',
          'Power/toughness: damage it deals / damage it takes.',
        ],
      },
      {
        id: 'mana-e-terrenos',
        title: 'Mana and lands',
        summary: "The five colors, how to pay a card's cost and why you play one land per turn.",
        minutes: 4,
        sections: [
          {
            id: 'cores',
            heading: 'The five colors',
            paragraphs: [
              'Magic has five colors: white {W}, blue {U}, black {B}, red {R} and green {G}. Each color has its own style, and each basic land makes mana of one of them: Plains, Island, Swamp, Mountain and Forest.',
              'There is also colorless mana {C}, which is no color at all.',
            ],
            cards: ['Plains', 'Island', 'Swamp', 'Mountain', 'Forest'],
          },
          {
            id: 'custo',
            heading: 'How to pay a cost',
            paragraphs: [
              'The cost {2}{G} asks for one green mana plus two of any kind. The number is generic mana: any mana works.',
              'To make mana, you tap the land ({T}: turn the card sideways). It untaps at the start of your next turn.',
            ],
          },
          {
            id: 'um-por-turno',
            heading: 'One land per turn',
            paragraphs: [
              "You can play one land per turn, only on your turn, in a main phase. Playing a land doesn't use the stack and nobody can respond.",
              "That's why a deck usually has many lands (about 40% of the cards): without them, your hand gets stuck. Some artifacts and creatures also make mana and speed up the game.",
            ],
            cards: ['Llanowar Elves', 'Sol Ring'],
          },
        ],
        remember: [
          'Five colors: {W} {U} {B} {R} {G}.',
          'Tap a land ({T}) to make mana.',
          'One land per turn.',
        ],
      },
      {
        id: 'o-turno',
        title: 'The turn',
        summary: 'Beginning, first main phase, combat, second main phase and end.',
        minutes: 4,
        sections: [
          {
            id: 'inicio',
            heading: 'Beginning phase',
            paragraphs: [
              'Untap: untap all your permanents. Upkeep: some cards do something at this moment. Draw: draw a card.',
              "In a two-player game, the player who goes first doesn't draw on their first turn.",
            ],
          },
          {
            id: 'principal',
            heading: 'Main phases',
            paragraphs: [
              "In the first main phase you play the turn's land and cast creatures, sorceries and other permanents.",
              'After combat comes the second main phase, with the same options. Often it pays to wait for combat before deciding what to play.',
            ],
          },
          {
            id: 'final',
            heading: 'Ending phase',
            paragraphs: [
              'In the end step, some effects happen. In cleanup, anyone with more than seven cards in hand discards down to seven, and damage on creatures goes away.',
              'Then the turn passes to the next player.',
            ],
          },
        ],
        remember: [
          'Untap, upkeep, draw.',
          'Main, combat, main.',
          'At the end of the turn, damage on creatures goes away.',
        ],
      },
      {
        id: 'combate',
        title: 'Combat',
        summary: 'Attacking, blocking and dealing damage, with the most common abilities.',
        minutes: 5,
        sections: [
          {
            id: 'atacar',
            heading: 'Attacking',
            paragraphs: [
              'You choose which creatures attack and tap them. Each one attacks a player (or one of their planeswalkers).',
              "A creature that came onto the battlefield this turn can't attack: that's summoning sickness. Creatures with haste ignore this rule.",
            ],
          },
          {
            id: 'bloquear',
            heading: 'Blocking',
            paragraphs: [
              'The defender chooses which of their untapped creatures block, and which attacker each one blocks. Several creatures can block the same attacker.',
              'An unblocked attacker deals damage to the player. A blocked attacker and its blocker deal damage to each other. A creature dealt damage equal to or greater than its toughness is destroyed.',
            ],
            cards: ['Grizzly Bears', 'Serra Angel'],
          },
          {
            id: 'habilidades',
            heading: 'The most common keywords',
            paragraphs: [
              "Flying: can only be blocked by creatures with flying or reach. Vigilance: attacking doesn't tap the creature. Trample: damage beyond the blocker's toughness goes to the player.",
              'Deathtouch: any damage from this creature destroys. First strike: deals damage before creatures without first strike. Lifelink: the damage it deals becomes life for you.',
            ],
            cards: ['Giant Growth'],
          },
        ],
        remember: [
          "A new creature doesn't attack (unless it has haste).",
          'The defender chooses the blocks.',
          'Damage equal to toughness destroys the creature.',
        ],
      },
      {
        id: 'a-pilha',
        title: 'The stack and responses',
        summary: 'How to respond to a spell and why the last one in resolves first.',
        minutes: 4,
        sections: [
          {
            id: 'pilha',
            heading: 'What the stack is',
            paragraphs: [
              "When you cast a spell or activate an ability, it doesn't happen right away: it goes on the stack and waits.",
              'Every player gets a chance to respond with instants and abilities. When nobody wants to respond anymore, the top of the stack resolves.',
            ],
          },
          {
            id: 'ordem',
            heading: 'Last in resolves first',
            paragraphs: [
              'Example: you attack with Grizzly Bears (2/2) and your opponent casts Lightning Bolt to deal 3 damage to it. In response, you cast Giant Growth (+3/+3). Giant Growth went in last, so it resolves first: the Bears become 5/5, and the Bolt is not enough to destroy them.',
              'Counterspells use the stack to cancel another spell before it resolves.',
            ],
            cards: ['Lightning Bolt', 'Giant Growth', 'Counterspell'],
          },
        ],
        remember: [
          'Spells and abilities wait on the stack.',
          'The last one in resolves first.',
          "Lands don't use the stack.",
        ],
      },
      {
        id: 'como-se-vence',
        title: 'How you win',
        summary: 'Zero life, an empty library, poison and what changes in Commander.',
        minutes: 3,
        sections: [
          {
            id: 'vitoria',
            heading: 'Ways to lose (and to win)',
            paragraphs: [
              'A player loses when their life reaches 0, when they have to draw a card from an empty library or when they get 10 poison counters.',
              'Some cards say "you win the game": rare, but they exist. The last player standing wins.',
            ],
          },
          {
            id: 'commander',
            heading: 'In Commander',
            paragraphs: [
              'Each deck has 100 cards, one of each (except basic lands), and a commander: a legendary creature that starts outside the deck, in the command zone.',
              "Life starts at 40, and a player who takes 21 combat damage from the same commander loses. It's the format most played in groups, with three or four people at the table.",
            ],
          },
          {
            id: 'proximo',
            heading: 'What now?',
            paragraphs: [
              'The best way to learn is by playing. Build a deck on ArcanaKin (or import a ready one), test the opening hand and schedule a game with your group.',
            ],
          },
        ],
        remember: [
          'Life 0, empty library or 10 poison: you lose.',
          'Commander: 100 cards, 40 life, 21 commander damage.',
        ],
      },
    ],
  },
};
