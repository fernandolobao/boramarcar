import type { LearnLocale, LessonId } from './index';
import { INTERMEDIATE_CHALLENGES } from './challenges-intermediate';

/**
 * Desafios guiados (12.4): uma situação de mesa (a sua área e a do oponente), uma pergunta e
 * respostas comentadas. Texto **nosso**; as cartas são exemplos reais (nome em inglês, como no
 * Scryfall). Não é um simulador de regras: cada desafio ensina uma ideia da trilha.
 */
export const CHALLENGE_IDS = [
  'desafio-voar',
  'desafio-pilha',
  'desafio-toque-mortifero',
  'desafio-atropelar',
  'desafio-enjoo',
  'desafio-mana',
  'desafio-dano-de-comandante',
  // Além do básico (trilha intermediária).
  'desafio-resposta-a-resposta',
  'desafio-iniciativa',
  'desafio-dois-bloqueadores',
  'desafio-gatilho',
  'desafio-fim-do-turno',
  'desafio-dois-por-um',
  'desafio-parceiros',
] as const;
export type ChallengeId = (typeof CHALLENGE_IDS)[number];

export const isChallengeId = (value: string): value is ChallengeId =>
  (CHALLENGE_IDS as readonly string[]).includes(value);

export interface ChallengeCard {
  /** Nome em inglês (Scryfall). */
  name: string;
  /** Estado na mesa: "virada", "atacando", "entrou neste turno"… */
  note?: string;
}

export interface ChallengeSide {
  life: number;
  cards: ChallengeCard[];
  /** Outras informações da área (mão, mana disponível, dano de comandante…). */
  extra?: string;
}

export interface ChallengeText {
  title: string;
  situation: string;
  question: string;
  you: ChallengeSide;
  opponent: ChallengeSide;
  /** Exatamente uma certa; cada uma com o porquê. */
  options: { text: string; correct: boolean; why: string }[];
}

/** Nível do desafio: o básico (12.4) ou "Além do básico" (trilha intermediária). */
export const CHALLENGE_LEVELS = ['basic', 'intermediate'] as const;
export type ChallengeLevel = (typeof CHALLENGE_LEVELS)[number];

export interface Challenge {
  id: ChallengeId;
  /** Lição que explica o assunto. */
  lesson: LessonId;
  /** Sem valor: básico. */
  level?: ChallengeLevel;
  'pt-BR': ChallengeText;
  en: ChallengeText;
}

const BASIC_CHALLENGES: readonly Challenge[] = [
  {
    id: 'desafio-voar',
    lesson: 'combate',
    'pt-BR': {
      title: 'Um anjo no ar',
      situation: 'É o turno do oponente. Ele ataca você com Serra Angel (4/4, voar).',
      question: 'O que você faz?',
      you: { life: 20, cards: [{ name: 'Grizzly Bears', note: 'desvirada' }] },
      opponent: { life: 20, cards: [{ name: 'Serra Angel', note: 'atacando' }] },
      options: [
        {
          text: 'Bloqueio com Grizzly Bears.',
          correct: false,
          why: 'Não dá: criatura com voar só pode ser bloqueada por quem tem voar ou alcance, e os Ursos não têm nenhum dos dois.',
        },
        {
          text: 'Não bloqueio e perco 4 de vida.',
          correct: true,
          why: 'Isso. Sem voar ou alcance, não há como bloquear o anjo: você fica com 16 de vida e os Ursos continuam vivos para atacar depois.',
        },
        {
          text: 'Viro os Ursos para o anjo não causar dano.',
          correct: false,
          why: 'Virar uma criatura não impede dano; criatura virada nem pode bloquear.',
        },
      ],
    },
    en: {
      title: 'An angel in the air',
      situation: "It's your opponent's turn. They attack you with Serra Angel (4/4, flying).",
      question: 'What do you do?',
      you: { life: 20, cards: [{ name: 'Grizzly Bears', note: 'untapped' }] },
      opponent: { life: 20, cards: [{ name: 'Serra Angel', note: 'attacking' }] },
      options: [
        {
          text: 'I block with Grizzly Bears.',
          correct: false,
          why: "You can't: a creature with flying can only be blocked by creatures with flying or reach, and the Bears have neither.",
        },
        {
          text: "I don't block and lose 4 life.",
          correct: true,
          why: "Right. Without flying or reach there's no way to block the angel: you go to 16 life and the Bears stay alive to attack later.",
        },
        {
          text: 'I tap the Bears so the angel deals no damage.',
          correct: false,
          why: "Tapping a creature doesn't prevent damage; a tapped creature can't even block.",
        },
      ],
    },
  },
  {
    id: 'desafio-pilha',
    lesson: 'a-pilha',
    'pt-BR': {
      title: 'Raio nos Ursos',
      situation:
        'O oponente lança Lightning Bolt (3 de dano) nos seus Grizzly Bears (2/2). Você tem Giant Growth na mão (+3/+3 até o fim do turno, mágica instantânea) e uma Forest desvirada.',
      question: 'Como salvar os Ursos?',
      you: {
        life: 20,
        cards: [{ name: 'Grizzly Bears' }, { name: 'Forest', note: 'desvirada' }],
        extra: 'Na mão: Giant Growth',
      },
      opponent: { life: 20, cards: [{ name: 'Lightning Bolt', note: 'na pilha' }] },
      options: [
        {
          text: 'Espero o Raio resolver e depois lanço Giant Growth.',
          correct: false,
          why: 'Tarde demais: quando o Raio resolve, os Ursos recebem 3 de dano e vão para o cemitério antes de você poder fazer qualquer coisa.',
        },
        {
          text: 'Em resposta, lanço Giant Growth nos Ursos.',
          correct: true,
          why: 'Isso. Giant Growth entra na pilha por cima do Raio e resolve primeiro: os Ursos viram 5/5, e 3 de dano não bastam.',
        },
        {
          text: 'Não dá para fazer nada no turno do oponente.',
          correct: false,
          why: 'Dá sim: mágicas instantâneas podem ser lançadas no turno de qualquer pessoa, inclusive em resposta a outra mágica.',
        },
      ],
    },
    en: {
      title: 'Bolt on the Bears',
      situation:
        'Your opponent casts Lightning Bolt (3 damage) at your Grizzly Bears (2/2). You have Giant Growth in hand (+3/+3 until end of turn, instant) and an untapped Forest.',
      question: 'How do you save the Bears?',
      you: {
        life: 20,
        cards: [{ name: 'Grizzly Bears' }, { name: 'Forest', note: 'untapped' }],
        extra: 'In hand: Giant Growth',
      },
      opponent: { life: 20, cards: [{ name: 'Lightning Bolt', note: 'on the stack' }] },
      options: [
        {
          text: 'I wait for the Bolt to resolve and then cast Giant Growth.',
          correct: false,
          why: 'Too late: when the Bolt resolves, the Bears take 3 damage and go to the graveyard before you can do anything.',
        },
        {
          text: 'In response, I cast Giant Growth on the Bears.',
          correct: true,
          why: 'Right. Giant Growth goes on the stack above the Bolt and resolves first: the Bears become 5/5, and 3 damage is not enough.',
        },
        {
          text: "There's nothing I can do on my opponent's turn.",
          correct: false,
          why: "Yes there is: instants can be cast on anyone's turn, even in response to another spell.",
        },
      ],
    },
  },
  {
    id: 'desafio-toque-mortifero',
    lesson: 'combate',
    'pt-BR': {
      title: 'Um rato perigoso',
      situation:
        'O oponente ataca com Typhoid Rats (1/1, toque mortífero). Você tem Craw Wurm (6/4) e Llanowar Elves (1/1), os dois desvirados.',
      question: 'Qual o melhor bloqueio?',
      you: {
        life: 20,
        cards: [
          { name: 'Craw Wurm', note: 'desvirada' },
          { name: 'Llanowar Elves', note: 'desvirada' },
        ],
      },
      opponent: { life: 20, cards: [{ name: 'Typhoid Rats', note: 'atacando' }] },
      options: [
        {
          text: 'Bloqueio com Craw Wurm: ele é muito maior.',
          correct: false,
          why: 'Com toque mortífero, 1 de dano já destrói. Os dois morrem, e você troca uma criatura de 6 manas por uma de 1.',
        },
        {
          text: 'Bloqueio com Llanowar Elves.',
          correct: true,
          why: 'Boa troca: os Elfos causam 1 de dano e o Rato (1/1) morre; os Elfos também morrem, mas valem bem menos que o Wurm. Não bloquear (perder 1 de vida) também é razoável.',
        },
        {
          text: 'Bloqueio com os dois: assim nada morre.',
          correct: false,
          why: 'O Rato divide o dano: 1 de dano com toque mortífero destrói qualquer um deles. Você ainda perderia uma criatura, talvez o Wurm.',
        },
      ],
    },
    en: {
      title: 'A dangerous rat',
      situation:
        'Your opponent attacks with Typhoid Rats (1/1, deathtouch). You have Craw Wurm (6/4) and Llanowar Elves (1/1), both untapped.',
      question: "What's the best block?",
      you: {
        life: 20,
        cards: [
          { name: 'Craw Wurm', note: 'untapped' },
          { name: 'Llanowar Elves', note: 'untapped' },
        ],
      },
      opponent: { life: 20, cards: [{ name: 'Typhoid Rats', note: 'attacking' }] },
      options: [
        {
          text: "I block with Craw Wurm: it's much bigger.",
          correct: false,
          why: 'With deathtouch, 1 damage is enough to destroy it. Both die, and you trade a 6-mana creature for a 1-mana one.',
        },
        {
          text: 'I block with Llanowar Elves.',
          correct: true,
          why: "Good trade: the Elves deal 1 damage and the Rats (1/1) die; the Elves die too, but they're worth much less than the Wurm. Not blocking (losing 1 life) is also reasonable.",
        },
        {
          text: 'I block with both: that way nothing dies.',
          correct: false,
          why: 'The Rats assign their damage: 1 deathtouch damage destroys either of them. You would still lose a creature, maybe the Wurm.',
        },
      ],
    },
  },
  {
    id: 'desafio-atropelar',
    lesson: 'combate',
    'pt-BR': {
      title: 'Passando por cima',
      situation:
        'Você ataca com Colossal Dreadmaw (6/6, atropelar). O oponente bloqueia com Grizzly Bears (2/2).',
      question: 'Quanto de dano o oponente recebe?',
      you: { life: 20, cards: [{ name: 'Colossal Dreadmaw', note: 'atacando' }] },
      opponent: { life: 20, cards: [{ name: 'Grizzly Bears', note: 'bloqueando' }] },
      options: [
        {
          text: 'Nenhum: a criatura foi bloqueada.',
          correct: false,
          why: 'Sem atropelar seria assim. Com atropelar, o dano que passa do necessário para destruir o bloqueador vai para o jogador.',
        },
        {
          text: '4 de dano.',
          correct: true,
          why: 'Isso. 2 de dano bastam para destruir os Ursos (resistência 2); os outros 4 atropelam e vão para o oponente.',
        },
        {
          text: '6 de dano.',
          correct: false,
          why: 'Você precisa causar ao bloqueador pelo menos o dano que o destrói (2); só o que sobra passa para o jogador.',
        },
      ],
    },
    en: {
      title: 'Running them over',
      situation:
        'You attack with Colossal Dreadmaw (6/6, trample). Your opponent blocks with Grizzly Bears (2/2).',
      question: 'How much damage does your opponent take?',
      you: { life: 20, cards: [{ name: 'Colossal Dreadmaw', note: 'attacking' }] },
      opponent: { life: 20, cards: [{ name: 'Grizzly Bears', note: 'blocking' }] },
      options: [
        {
          text: 'None: the creature was blocked.',
          correct: false,
          why: 'That would be true without trample. With trample, damage beyond what is needed to destroy the blocker goes to the player.',
        },
        {
          text: '4 damage.',
          correct: true,
          why: 'Right. 2 damage is enough to destroy the Bears (toughness 2); the other 4 trample over to your opponent.',
        },
        {
          text: '6 damage.',
          correct: false,
          why: 'You must assign the blocker at least enough damage to destroy it (2); only the rest goes to the player.',
        },
      ],
    },
  },
  {
    id: 'desafio-enjoo',
    lesson: 'combate',
    'pt-BR': {
      title: 'Recém-chegado',
      situation:
        'Na sua primeira fase principal, você lança Grizzly Bears. O oponente não tem criaturas.',
      question: 'Os Ursos podem atacar neste turno?',
      you: { life: 20, cards: [{ name: 'Grizzly Bears', note: 'entrou neste turno' }] },
      opponent: { life: 20, cards: [] },
      options: [
        {
          text: 'Sim, o oponente não tem como bloquear.',
          correct: false,
          why: 'Não depende do oponente: criatura que entrou neste turno tem enjoo de invocação e não pode atacar.',
        },
        {
          text: 'Não, só no próximo turno.',
          correct: true,
          why: 'Isso. A criatura precisa estar sob seu controle desde o início do turno para atacar (a não ser que tenha ímpeto).',
        },
        {
          text: 'Sim, se eu lançar antes do combate.',
          correct: false,
          why: 'Lançar antes do combate não basta: o enjoo de invocação dura o turno inteiro em que ela entrou.',
        },
      ],
    },
    en: {
      title: 'Newcomer',
      situation:
        'In your first main phase, you cast Grizzly Bears. Your opponent has no creatures.',
      question: 'Can the Bears attack this turn?',
      you: { life: 20, cards: [{ name: 'Grizzly Bears', note: 'came in this turn' }] },
      opponent: { life: 20, cards: [] },
      options: [
        {
          text: "Yes, the opponent can't block.",
          correct: false,
          why: "It doesn't depend on the opponent: a creature that came in this turn has summoning sickness and can't attack.",
        },
        {
          text: 'No, only next turn.',
          correct: true,
          why: 'Right. A creature needs to be under your control since the start of the turn to attack (unless it has haste).',
        },
        {
          text: 'Yes, if I cast it before combat.',
          correct: false,
          why: 'Casting it before combat is not enough: summoning sickness lasts the whole turn it came in.',
        },
      ],
    },
  },
  {
    id: 'desafio-mana',
    lesson: 'mana-e-terrenos',
    'pt-BR': {
      title: 'Contando mana',
      situation:
        'Você tem duas Forest e uma Island desviradas e, na mão, Cultivate ({2}{G}), Counterspell ({U}{U}) e Craw Wurm ({4}{G}{G}).',
      question: 'Qual delas você consegue lançar agora?',
      you: {
        life: 20,
        cards: [
          { name: 'Forest', note: 'desvirada' },
          { name: 'Forest', note: 'desvirada' },
          { name: 'Island', note: 'desvirada' },
        ],
        extra: 'Na mão: Cultivate, Counterspell, Craw Wurm',
      },
      opponent: { life: 20, cards: [] },
      options: [
        {
          text: 'Cultivate.',
          correct: true,
          why: 'Isso. {2}{G} pede um verde (uma Forest) e mais dois de qualquer tipo (a outra Forest e a Island).',
        },
        {
          text: 'Counterspell.',
          correct: false,
          why: '{U}{U} pede dois azuis, e você só tem uma Island.',
        },
        {
          text: 'Craw Wurm.',
          correct: false,
          why: '{4}{G}{G} custa 6 de mana no total, e você tem 3.',
        },
      ],
    },
    en: {
      title: 'Counting mana',
      situation:
        'You have two untapped Forests and an untapped Island, and in hand Cultivate ({2}{G}), Counterspell ({U}{U}) and Craw Wurm ({4}{G}{G}).',
      question: 'Which one can you cast right now?',
      you: {
        life: 20,
        cards: [
          { name: 'Forest', note: 'untapped' },
          { name: 'Forest', note: 'untapped' },
          { name: 'Island', note: 'untapped' },
        ],
        extra: 'In hand: Cultivate, Counterspell, Craw Wurm',
      },
      opponent: { life: 20, cards: [] },
      options: [
        {
          text: 'Cultivate.',
          correct: true,
          why: 'Right. {2}{G} asks for one green (a Forest) plus two of any kind (the other Forest and the Island).',
        },
        {
          text: 'Counterspell.',
          correct: false,
          why: '{U}{U} asks for two blue, and you only have one Island.',
        },
        {
          text: 'Craw Wurm.',
          correct: false,
          why: '{4}{G}{G} costs 6 mana in total, and you have 3.',
        },
      ],
    },
  },
  {
    id: 'desafio-dano-de-comandante',
    lesson: 'mesa-de-commander',
    'pt-BR': {
      title: 'O golpe final',
      situation:
        'Commander. O oponente está com 25 de vida e já recebeu 18 de dano de combate do seu comandante, Omnath, Locus of Mana, que agora está 3/3. Ninguém pode bloquear.',
      question: 'O que acontece se o Omnath atacar o oponente?',
      you: {
        life: 31,
        cards: [{ name: 'Omnath, Locus of Mana', note: 'comandante, atacando' }],
      },
      opponent: { life: 25, cards: [], extra: 'Dano do Omnath: 18' },
      options: [
        {
          text: 'Ele cai para 22 de vida e o jogo continua.',
          correct: false,
          why: 'A vida cai para 22, mas o dano de comandante também conta: 18 + 3 = 21.',
        },
        {
          text: 'Ele perde a partida.',
          correct: true,
          why: 'Isso. 21 de dano de combate do mesmo comandante derrubam o jogador, mesmo com vida sobrando.',
        },
        {
          text: 'Nada: dano de comandante só conta se a vida chegar a 0.',
          correct: false,
          why: 'O dano de comandante é um jeito de perder à parte: 21 do mesmo comandante bastam.',
        },
      ],
    },
    en: {
      title: 'The final blow',
      situation:
        'Commander. Your opponent is at 25 life and has already taken 18 combat damage from your commander, Omnath, Locus of Mana, which is now 3/3. Nobody can block.',
      question: 'What happens if Omnath attacks that opponent?',
      you: {
        life: 31,
        cards: [{ name: 'Omnath, Locus of Mana', note: 'commander, attacking' }],
      },
      opponent: { life: 25, cards: [], extra: 'Damage from Omnath: 18' },
      options: [
        {
          text: 'They drop to 22 life and the game goes on.',
          correct: false,
          why: 'Their life drops to 22, but commander damage counts too: 18 + 3 = 21.',
        },
        {
          text: 'They lose the game.',
          correct: true,
          why: 'Right. 21 combat damage from the same commander knocks a player out, even with life left.',
        },
        {
          text: 'Nothing: commander damage only counts if life reaches 0.',
          correct: false,
          why: 'Commander damage is a separate way to lose: 21 from the same commander is enough.',
        },
      ],
    },
  },
];

/** Todos os desafios, na ordem de `CHALLENGE_IDS`: os básicos e depois os intermediários. */
export const CHALLENGES: readonly Challenge[] = [...BASIC_CHALLENGES, ...INTERMEDIATE_CHALLENGES];

export const challengeLevel = (challenge: Challenge): ChallengeLevel => challenge.level ?? 'basic';

/** Ids dos desafios de um nível (ex.: para a conquista de cada nível). */
export const challengeIdsOf = (level: ChallengeLevel): ChallengeId[] =>
  CHALLENGES.filter((c) => challengeLevel(c) === level).map((c) => c.id);

/** Número de 32 bits a partir do id (FNV-1a), semente da ordem das respostas. */
function seedOf(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Gerador simples e determinístico (mulberry32): a mesma semente dá a mesma sequência. */
function seeded(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Respostas na ordem de exibição. No conteúdo, a certa costuma ser escrita em segundo; aqui elas
 * são embaralhadas por uma ordem fixa de cada desafio (a mesma no site e no app, nos dois idiomas
 * e a cada visita, sem diferença entre o servidor e o navegador).
 */
export function challengeOptions(challenge: Challenge, locale: LearnLocale) {
  const options = challenge[locale].options;
  const order = options.map((_, i) => i);
  const random = seeded(seedOf(challenge.id));
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  return order.map((i) => options[i]!);
}

/** Desafio no idioma pedido, com o id e a lição. */
export const challengeFor = (challenge: Challenge, locale: LearnLocale) => ({
  id: challenge.id,
  lesson: challenge.lesson,
  ...challenge[locale],
});
