import type { Challenge } from './challenges';

/**
 * Desafios do bloco "Além do básico": uma ideia de cada lição intermediária. Mesmo formato dos
 * desafios básicos (texto nosso, cartas reais como exemplo, uma resposta certa comentada).
 */
export const INTERMEDIATE_CHALLENGES: readonly Challenge[] = [
  {
    id: 'desafio-resposta-a-resposta',
    lesson: 'prioridade-e-respostas',
    level: 'intermediate',
    'pt-BR': {
      title: 'Resposta à resposta',
      situation:
        'O oponente lança Lightning Bolt nos seus Grizzly Bears (2/2). Em resposta, você lança Giant Growth nos Ursos. O oponente responde com Counterspell no seu Giant Growth.',
      question: 'O que acontece com os Ursos?',
      you: {
        life: 20,
        cards: [{ name: 'Grizzly Bears' }, { name: 'Giant Growth', note: 'na pilha' }],
      },
      opponent: {
        life: 20,
        cards: [
          { name: 'Lightning Bolt', note: 'na pilha, embaixo' },
          { name: 'Counterspell', note: 'na pilha, no topo' },
        ],
      },
      options: [
        {
          text: 'Sobrevivem: o Giant Growth foi lançado depois do Raio.',
          correct: false,
          why: 'O Counterspell entrou por último, então resolve primeiro e anula o Giant Growth antes de ele fazer efeito.',
        },
        {
          text: 'Morrem: o Counterspell resolve primeiro, e o Raio resolve sem o bônus.',
          correct: true,
          why: 'Isso. Pilha de cima para baixo: Counterspell anula o Giant Growth; depois o Raio causa 3 de dano a um 2/2.',
        },
        {
          text: 'O Counterspell não pode mirar o Giant Growth, que já está na pilha.',
          correct: false,
          why: 'Pode sim: anular uma mágica é justamente mirar algo que está na pilha.',
        },
      ],
    },
    en: {
      title: 'Responding to a response',
      situation:
        'Your opponent casts Lightning Bolt at your Grizzly Bears (2/2). In response, you cast Giant Growth on the Bears. Your opponent responds with Counterspell targeting your Giant Growth.',
      question: 'What happens to the Bears?',
      you: {
        life: 20,
        cards: [{ name: 'Grizzly Bears' }, { name: 'Giant Growth', note: 'on the stack' }],
      },
      opponent: {
        life: 20,
        cards: [
          { name: 'Lightning Bolt', note: 'on the stack, bottom' },
          { name: 'Counterspell', note: 'on the stack, top' },
        ],
      },
      options: [
        {
          text: 'They survive: Giant Growth was cast after the Bolt.',
          correct: false,
          why: 'Counterspell went on last, so it resolves first and counters Giant Growth before it does anything.',
        },
        {
          text: 'They die: Counterspell resolves first, and the Bolt resolves without the bonus.',
          correct: true,
          why: 'Right. Top to bottom: Counterspell counters Giant Growth; then the Bolt deals 3 damage to a 2/2.',
        },
        {
          text: "Counterspell can't target Giant Growth, which is already on the stack.",
          correct: false,
          why: 'Yes it can: countering a spell means targeting something on the stack.',
        },
      ],
    },
  },
  {
    id: 'desafio-iniciativa',
    lesson: 'combate-avancado',
    level: 'intermediate',
    'pt-BR': {
      title: 'Primeiro golpe',
      situation:
        'O oponente ataca com Grizzly Bears (2/2). Você bloqueia com White Knight (2/2, iniciativa).',
      question: 'Como termina o combate?',
      you: { life: 20, cards: [{ name: 'White Knight', note: 'bloqueando' }] },
      opponent: { life: 20, cards: [{ name: 'Grizzly Bears', note: 'atacando' }] },
      options: [
        {
          text: 'Os dois morrem: 2 de dano em cada um.',
          correct: false,
          why: 'Seria assim sem iniciativa. Com ela, o Cavaleiro causa dano antes, numa etapa própria.',
        },
        {
          text: 'Só os Ursos morrem.',
          correct: true,
          why: 'Isso. O Cavaleiro causa 2 de dano primeiro; os Ursos morrem antes da etapa de dano normal e não causam dano nenhum.',
        },
        {
          text: 'Nada morre: o dano é cancelado.',
          correct: false,
          why: 'Iniciativa não cancela dano; ela só faz quem a tem causar dano antes.',
        },
      ],
    },
    en: {
      title: 'Striking first',
      situation:
        'Your opponent attacks with Grizzly Bears (2/2). You block with White Knight (2/2, first strike).',
      question: 'How does combat end?',
      you: { life: 20, cards: [{ name: 'White Knight', note: 'blocking' }] },
      opponent: { life: 20, cards: [{ name: 'Grizzly Bears', note: 'attacking' }] },
      options: [
        {
          text: 'Both die: 2 damage to each.',
          correct: false,
          why: 'That would happen without first strike. With it, the Knight deals damage earlier, in its own step.',
        },
        {
          text: 'Only the Bears die.',
          correct: true,
          why: 'Right. The Knight deals 2 damage first; the Bears die before the regular damage step and deal no damage at all.',
        },
        {
          text: 'Nothing dies: the damage is canceled.',
          correct: false,
          why: "First strike doesn't cancel damage; it just makes that creature deal damage earlier.",
        },
      ],
    },
  },
  {
    id: 'desafio-dois-bloqueadores',
    lesson: 'combate-avancado',
    level: 'intermediate',
    'pt-BR': {
      title: 'Dois na frente do Wurm',
      situation:
        'Você ataca com Colossal Dreadmaw (6/6, atropelar). O oponente bloqueia com Grizzly Bears (2/2) e Typhoid Rats (1/1, toque mortífero).',
      question: 'Qual o máximo de dano que passa para o oponente?',
      you: { life: 20, cards: [{ name: 'Colossal Dreadmaw', note: 'atacando' }] },
      opponent: {
        life: 20,
        cards: [
          { name: 'Grizzly Bears', note: 'bloqueando' },
          { name: 'Typhoid Rats', note: 'bloqueando' },
        ],
      },
      options: [
        {
          text: 'Nenhum: com dois bloqueadores, atropelar não funciona.',
          correct: false,
          why: 'Funciona sim: basta causar dano letal a cada bloqueadora e o resto passa.',
        },
        {
          text: '3: 2 nos Ursos, 1 no Rato e 3 no oponente.',
          correct: true,
          why: 'Isso. Dano letal é 2 para os Ursos e 1 para o Rato; os outros 3 atropelam. O Wurm morre pelo toque mortífero do Rato.',
        },
        {
          text: '4: o Rato não precisa de dano porque morre de qualquer jeito.',
          correct: false,
          why: 'Para atropelar, cada bloqueadora precisa receber dano letal, inclusive o Rato (1 de dano).',
        },
      ],
    },
    en: {
      title: 'Two in front of the Dreadmaw',
      situation:
        'You attack with Colossal Dreadmaw (6/6, trample). Your opponent blocks with Grizzly Bears (2/2) and Typhoid Rats (1/1, deathtouch).',
      question: 'What is the most damage that gets through to your opponent?',
      you: { life: 20, cards: [{ name: 'Colossal Dreadmaw', note: 'attacking' }] },
      opponent: {
        life: 20,
        cards: [
          { name: 'Grizzly Bears', note: 'blocking' },
          { name: 'Typhoid Rats', note: 'blocking' },
        ],
      },
      options: [
        {
          text: "None: trample doesn't work with two blockers.",
          correct: false,
          why: 'It does: you just need to deal lethal damage to each blocker, and the rest tramples over.',
        },
        {
          text: '3: 2 to the Bears, 1 to the Rats and 3 to the opponent.',
          correct: true,
          why: "Right. Lethal damage is 2 for the Bears and 1 for the Rats; the other 3 trample over. The Dreadmaw dies to the Rats' deathtouch.",
        },
        {
          text: '4: the Rats need no damage because they die anyway.',
          correct: false,
          why: 'To trample over, each blocker must be assigned lethal damage, the Rats included (1 damage).',
        },
      ],
    },
  },
  {
    id: 'desafio-gatilho',
    lesson: 'habilidades',
    level: 'intermediate',
    'pt-BR': {
      title: 'A guardiã de almas',
      situation:
        'Você controla Soul Warden ("Sempre que outra criatura entrar no campo de batalha, você ganha 1 ponto de vida"). O oponente lança Grizzly Bears, que entra no campo dele.',
      question: 'Você ganha vida?',
      you: { life: 15, cards: [{ name: 'Soul Warden' }] },
      opponent: { life: 20, cards: [{ name: 'Grizzly Bears', note: 'entrando' }] },
      options: [
        {
          text: 'Não: só vale para as minhas criaturas.',
          correct: false,
          why: 'O texto diz "outra criatura", sem dizer de quem: vale para criaturas de qualquer jogador.',
        },
        {
          text: 'Sim: a habilidade dispara e eu ganho 1.',
          correct: true,
          why: 'Isso. A habilidade disparada vai para a pilha e, ao resolver, você vai para 16 de vida.',
        },
        {
          text: 'Quem ganha vida é o oponente, porque a criatura é dele.',
          correct: false,
          why: 'Quem ganha é o controlador da Soul Warden: "você" na carta é sempre quem a controla.',
        },
      ],
    },
    en: {
      title: 'The soul warden',
      situation:
        'You control Soul Warden ("Whenever another creature enters the battlefield, you gain 1 life"). Your opponent casts Grizzly Bears, which enter under their control.',
      question: 'Do you gain life?',
      you: { life: 15, cards: [{ name: 'Soul Warden' }] },
      opponent: { life: 20, cards: [{ name: 'Grizzly Bears', note: 'entering' }] },
      options: [
        {
          text: 'No: it only counts my creatures.',
          correct: false,
          why: 'The text says "another creature" without saying whose: it counts creatures of any player.',
        },
        {
          text: 'Yes: the ability triggers and I gain 1.',
          correct: true,
          why: 'Right. The triggered ability goes on the stack and, when it resolves, you go to 16 life.',
        },
        {
          text: 'Your opponent gains the life, because the creature is theirs.',
          correct: false,
          why: 'The Soul Warden’s controller gains it: "you" on a card always means whoever controls it.',
        },
      ],
    },
  },
  {
    id: 'desafio-fim-do-turno',
    lesson: 'acoes-de-estado',
    level: 'intermediate',
    'pt-BR': {
      title: 'Quando o bônus acaba',
      situation:
        'No seu turno, você lançou Giant Growth nos seus Grizzly Bears (viraram 5/5) e eles receberam 3 de dano em combate. O turno vai terminar.',
      question: 'Os Ursos sobrevivem ao fim do turno, quando voltam a ser 2/2?',
      you: {
        life: 20,
        cards: [{ name: 'Grizzly Bears', note: '5/5 até o fim do turno, 3 de dano' }],
      },
      opponent: { life: 20, cards: [] },
      options: [
        {
          text: 'Não: voltam a 2/2 com 3 de dano e morrem.',
          correct: false,
          why: 'O dano não fica: ele some na etapa de limpeza, ao mesmo tempo que o bônus acaba.',
        },
        {
          text: 'Sim: o dano e o bônus terminam juntos, na limpeza.',
          correct: true,
          why: 'Isso. Na etapa de limpeza o dano marcado sai e os efeitos "até o fim do turno" terminam ao mesmo tempo; os Ursos ficam 2/2 sem dano.',
        },
        {
          text: 'Depende de quem tem prioridade no fim do turno.',
          correct: false,
          why: 'Não depende: a limpeza acontece para todos, sem pilha, e tira o dano junto com o bônus.',
        },
      ],
    },
    en: {
      title: 'When the bonus ends',
      situation:
        'On your turn, you cast Giant Growth on your Grizzly Bears (they became 5/5) and they took 3 damage in combat. The turn is about to end.',
      question: 'Do the Bears survive the end of the turn, when they go back to 2/2?',
      you: {
        life: 20,
        cards: [{ name: 'Grizzly Bears', note: '5/5 until end of turn, 3 damage' }],
      },
      opponent: { life: 20, cards: [] },
      options: [
        {
          text: 'No: they go back to 2/2 with 3 damage and die.',
          correct: false,
          why: "The damage doesn't stay: it wears off in the cleanup step, at the same time the bonus ends.",
        },
        {
          text: 'Yes: the damage and the bonus end together, in cleanup.',
          correct: true,
          why: 'Right. In the cleanup step, marked damage is removed and "until end of turn" effects end at the same time; the Bears are a 2/2 with no damage.',
        },
        {
          text: 'It depends on who has priority at end of turn.',
          correct: false,
          why: "It doesn't: cleanup happens for everyone, without the stack, and removes the damage together with the bonus.",
        },
      ],
    },
  },
  {
    id: 'desafio-dois-por-um',
    lesson: 'vantagem-de-cartas',
    level: 'intermediate',
    'pt-BR': {
      title: 'Qual remoção usar?',
      situation:
        'O oponente tem Serra Angel (4/4, voar) no campo. Na sua mão estão Murder (destrua uma criatura, mágica instantânea) e Ravenous Chupacabra (2/2; quando entra, destrua uma criatura de um oponente). Você tem mana para qualquer uma das duas, no seu turno.',
      question: 'Qual das duas dá vantagem de cartas?',
      you: { life: 20, cards: [], extra: 'Na mão: Murder, Ravenous Chupacabra' },
      opponent: { life: 20, cards: [{ name: 'Serra Angel' }] },
      options: [
        {
          text: 'Murder: é instantânea.',
          correct: false,
          why: 'Ser instantânea dá flexibilidade, não vantagem de cartas: Murder troca uma carta por uma (um por um).',
        },
        {
          text: 'Ravenous Chupacabra: destrói o anjo e deixa uma criatura na mesa.',
          correct: true,
          why: 'Isso. Uma carta resolve a ameaça e ainda fica um 2/2 no seu campo: é um "dois por um".',
        },
        {
          text: 'As duas dão a mesma vantagem, porque destroem a mesma criatura.',
          correct: false,
          why: 'O resultado na mesa é diferente: com o Chupacabra sobra uma criatura sua; com Murder, não.',
        },
      ],
    },
    en: {
      title: 'Which removal to use?',
      situation:
        'Your opponent has Serra Angel (4/4, flying) on the battlefield. In your hand you have Murder (destroy target creature, instant) and Ravenous Chupacabra (2/2; when it enters, destroy target creature an opponent controls). You have mana for either one, on your turn.',
      question: 'Which one gives card advantage?',
      you: { life: 20, cards: [], extra: 'In hand: Murder, Ravenous Chupacabra' },
      opponent: { life: 20, cards: [{ name: 'Serra Angel' }] },
      options: [
        {
          text: "Murder: it's an instant.",
          correct: false,
          why: 'Being an instant gives flexibility, not card advantage: Murder trades one card for one (a one-for-one).',
        },
        {
          text: 'Ravenous Chupacabra: it destroys the angel and leaves a creature on the battlefield.',
          correct: true,
          why: 'Right. One card answers the threat and you still have a 2/2: that is a "two-for-one".',
        },
        {
          text: 'Both give the same advantage, since they destroy the same creature.',
          correct: false,
          why: 'The board ends up different: with the Chupacabra you keep a creature; with Murder, you do not.',
        },
      ],
    },
  },
  {
    id: 'desafio-parceiros',
    lesson: 'commander-a-fundo',
    level: 'intermediate',
    'pt-BR': {
      title: 'Dois comandantes',
      situation:
        'Seu deck tem os parceiros Thrasios, Triton Hero e Tymna the Weaver. Ao longo da partida, um oponente recebeu 12 de dano de combate de Thrasios e 9 de Tymna. Ele está com 19 de vida.',
      question: 'Esse oponente perdeu por dano de comandante?',
      you: {
        life: 30,
        cards: [{ name: 'Thrasios, Triton Hero' }, { name: 'Tymna the Weaver' }],
      },
      opponent: { life: 19, cards: [], extra: 'Dano de comandante: 12 de Thrasios, 9 de Tymna' },
      options: [
        {
          text: 'Sim: 12 + 9 = 21.',
          correct: false,
          why: 'Os 21 precisam vir do mesmo comandante. Parceiros contam separado.',
        },
        {
          text: 'Não: cada comandante conta separado, e ele ainda tem vida.',
          correct: true,
          why: 'Isso. Ele está com 12 de um e 9 do outro (nenhum chegou a 21) e com 19 de vida: continua na mesa.',
        },
        {
          text: 'Não: dano de comandante só conta no Commander de duas pessoas.',
          correct: false,
          why: 'Conta em qualquer partida de Commander; o que não vale é somar comandantes diferentes.',
        },
      ],
    },
    en: {
      title: 'Two commanders',
      situation:
        'Your deck has the partners Thrasios, Triton Hero and Tymna the Weaver. Over the game, an opponent took 12 combat damage from Thrasios and 9 from Tymna. They are at 19 life.',
      question: 'Has this opponent lost to commander damage?',
      you: {
        life: 30,
        cards: [{ name: 'Thrasios, Triton Hero' }, { name: 'Tymna the Weaver' }],
      },
      opponent: {
        life: 19,
        cards: [],
        extra: 'Commander damage: 12 from Thrasios, 9 from Tymna',
      },
      options: [
        {
          text: 'Yes: 12 + 9 = 21.',
          correct: false,
          why: 'The 21 must come from the same commander. Partners count separately.',
        },
        {
          text: 'No: each commander counts separately, and they still have life.',
          correct: true,
          why: 'Right. They have 12 from one and 9 from the other (neither reached 21) and 19 life: they stay in the game.',
        },
        {
          text: 'No: commander damage only counts in two-player Commander.',
          correct: false,
          why: 'It counts in any Commander game; what you cannot do is add up different commanders.',
        },
      ],
    },
  },
];
