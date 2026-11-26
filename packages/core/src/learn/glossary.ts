import type { LearnLocale, LessonId } from './index';

/**
 * Glossário (12.3): palavras-chave e termos do jogo explicados com texto **nosso**, com o nome
 * oficial em português e em inglês (o das cartas em inglês). O glossário oficial completo fica no
 * site da Wizards (`OFFICIAL_LINKS.glossary`). Usado em /aprender/glossario e no modo mesa.
 */
export interface GlossaryText {
  term: string;
  text: string;
}

export interface GlossaryEntry {
  /** Vira a âncora (`/aprender/glossario#voar`). */
  id: string;
  /** Palavra-chave impressa nas cartas ou termo do jogo. */
  kind: 'keyword' | 'term';
  /** Lição da trilha que explica o assunto com mais calma. */
  lesson?: LessonId;
  'pt-BR': GlossaryText;
  en: GlossaryText;
}

export const GLOSSARY: readonly GlossaryEntry[] = [
  // Palavras-chave das criaturas e das cartas.
  {
    id: 'voar',
    kind: 'keyword',
    lesson: 'combate',
    'pt-BR': {
      term: 'Voar',
      text: 'Só pode ser bloqueada por criaturas com voar ou alcance.',
    },
    en: { term: 'Flying', text: 'Can only be blocked by creatures with flying or reach.' },
  },
  {
    id: 'alcance',
    kind: 'keyword',
    lesson: 'combate',
    'pt-BR': { term: 'Alcance', text: 'Pode bloquear criaturas com voar.' },
    en: { term: 'Reach', text: 'Can block creatures with flying.' },
  },
  {
    id: 'atropelar',
    kind: 'keyword',
    lesson: 'combate',
    'pt-BR': {
      term: 'Atropelar',
      text: 'Ao ser bloqueada, o dano que passar do necessário para destruir os bloqueadores vai para o jogador (ou planeswalker) atacado.',
    },
    en: {
      term: 'Trample',
      text: 'When blocked, damage beyond what is needed to destroy the blockers goes to the attacked player (or planeswalker).',
    },
  },
  {
    id: 'toque-mortifero',
    kind: 'keyword',
    lesson: 'combate',
    'pt-BR': {
      term: 'Toque mortífero',
      text: 'Qualquer quantidade de dano que esta fonte causa a uma criatura é suficiente para destruí-la.',
    },
    en: {
      term: 'Deathtouch',
      text: 'Any amount of damage this source deals to a creature is enough to destroy it.',
    },
  },
  {
    id: 'iniciativa',
    kind: 'keyword',
    lesson: 'combate',
    'pt-BR': {
      term: 'Iniciativa',
      text: 'Causa dano de combate antes das criaturas sem iniciativa. Se destruir o oponente do combate, não recebe dano de volta.',
    },
    en: {
      term: 'First strike',
      text: 'Deals combat damage before creatures without first strike. If it destroys its opponent in combat, it takes no damage back.',
    },
  },
  {
    id: 'golpe-duplo',
    kind: 'keyword',
    lesson: 'combate',
    'pt-BR': {
      term: 'Golpe duplo',
      text: 'Causa dano de combate duas vezes: junto com as criaturas com iniciativa e de novo no dano normal.',
    },
    en: {
      term: 'Double strike',
      text: 'Deals combat damage twice: along with first-strike creatures and again in regular damage.',
    },
  },
  {
    id: 'vigilancia',
    kind: 'keyword',
    lesson: 'combate',
    'pt-BR': {
      term: 'Vigilância',
      text: 'Atacar não vira a criatura, então ela continua pronta para bloquear.',
    },
    en: {
      term: 'Vigilance',
      text: "Attacking doesn't tap the creature, so it stays ready to block.",
    },
  },
  {
    id: 'impeto',
    kind: 'keyword',
    lesson: 'combate',
    'pt-BR': {
      term: 'Ímpeto',
      text: 'Pode atacar e usar habilidades com {T} no mesmo turno em que entrou no campo de batalha.',
    },
    en: {
      term: 'Haste',
      text: 'Can attack and use {T} abilities the same turn it came onto the battlefield.',
    },
  },
  {
    id: 'vinculo-com-a-vida',
    kind: 'keyword',
    lesson: 'combate',
    'pt-BR': {
      term: 'Vínculo com a vida',
      text: 'O dano que esta fonte causa também faz você ganhar a mesma quantidade de vida.',
    },
    en: {
      term: 'Lifelink',
      text: 'Damage dealt by this source also makes you gain that much life.',
    },
  },
  {
    id: 'ameacar',
    kind: 'keyword',
    lesson: 'combate',
    'pt-BR': {
      term: 'Ameaçar',
      text: 'Só pode ser bloqueada por duas ou mais criaturas.',
    },
    en: { term: 'Menace', text: 'Can only be blocked by two or more creatures.' },
  },
  {
    id: 'defensor',
    kind: 'keyword',
    'pt-BR': { term: 'Defensor', text: 'Não pode atacar.' },
    en: { term: 'Defender', text: "Can't attack." },
  },
  {
    id: 'indestrutivel',
    kind: 'keyword',
    'pt-BR': {
      term: 'Indestrutível',
      text: 'Não é destruída por dano nem por efeitos que dizem "destruir". Ainda pode ser exilada, sacrificada ou ficar com resistência 0.',
    },
    en: {
      term: 'Indestructible',
      text: 'Isn\'t destroyed by damage or by effects that say "destroy". It can still be exiled, sacrificed or reduced to 0 toughness.',
    },
  },
  {
    id: 'resistencia-a-magia',
    kind: 'keyword',
    'pt-BR': {
      term: 'Resistência a magia',
      text: 'Não pode ser alvo de mágicas nem habilidades que os oponentes controlam. Você ainda pode escolhê-la como alvo.',
    },
    en: {
      term: 'Hexproof',
      text: "Can't be the target of spells or abilities your opponents control. You can still target it.",
    },
  },
  {
    id: 'resguardo',
    kind: 'keyword',
    'pt-BR': {
      term: 'Resguardo',
      text: 'Quando um oponente a escolhe como alvo, a mágica ou habilidade é anulada, a menos que ele pague o custo de resguardo.',
    },
    en: {
      term: 'Ward',
      text: 'When an opponent targets it, the spell or ability is countered unless they pay the ward cost.',
    },
  },
  {
    id: 'protecao',
    kind: 'keyword',
    'pt-BR': {
      term: 'Proteção',
      text: 'Proteção contra uma qualidade (uma cor, por exemplo): não pode ser bloqueada, ser alvo, ser encantada ou equipada, nem receber dano de nada com essa qualidade.',
    },
    en: {
      term: 'Protection',
      text: "Protection from a quality (a color, for example): it can't be blocked, targeted, enchanted or equipped by, or dealt damage by, anything with that quality.",
    },
  },
  {
    id: 'lampejo',
    kind: 'keyword',
    lesson: 'tipos-de-carta',
    'pt-BR': {
      term: 'Lampejo',
      text: 'Pode ser lançada a qualquer momento em que você poderia lançar uma mágica instantânea.',
    },
    en: { term: 'Flash', text: 'You may cast it any time you could cast an instant.' },
  },
  {
    id: 'equipar',
    kind: 'keyword',
    'pt-BR': {
      term: 'Equipar',
      text: 'Pague o custo para prender este Equipamento a uma criatura sua. Só no seu turno, quando você poderia lançar um feitiço.',
    },
    en: {
      term: 'Equip',
      text: 'Pay the cost to attach this Equipment to a creature you control. Only on your turn, when you could cast a sorcery.',
    },
  },
  {
    id: 'encantar',
    kind: 'keyword',
    'pt-BR': {
      term: 'Encantar',
      text: 'Diz a que esta Aura se prende quando entra (por exemplo, "Encantar criatura"). Se aquilo sair do jogo, a Aura vai para o cemitério.',
    },
    en: {
      term: 'Enchant',
      text: 'Says what this Aura attaches to (for example, "Enchant creature"). If that leaves, the Aura goes to the graveyard.',
    },
  },
  {
    id: 'videncia',
    kind: 'keyword',
    'pt-BR': {
      term: 'Vidência',
      text: 'Vidência N: olhe as N cartas do topo do seu grimório e coloque quantas quiser no fundo; as outras voltam ao topo na ordem que você escolher.',
    },
    en: {
      term: 'Scry',
      text: 'Scry N: look at the top N cards of your library and put any number of them on the bottom; the rest go back on top in any order.',
    },
  },
  {
    id: 'recapitular',
    kind: 'keyword',
    'pt-BR': {
      term: 'Recapitular',
      text: 'Você pode lançar esta carta do seu cemitério pagando o custo de recapitular. Depois disso, ela é exilada.',
    },
    en: {
      term: 'Flashback',
      text: "You may cast this card from your graveyard by paying its flashback cost. Then it's exiled.",
    },
  },
  {
    id: 'cascata',
    kind: 'keyword',
    'pt-BR': {
      term: 'Cascata',
      text: 'Ao lançar esta mágica, exile cartas do topo do grimório até achar uma que não seja terreno e custe menos; você pode lançá-la sem pagar. As outras vão para o fundo.',
    },
    en: {
      term: 'Cascade',
      text: 'When you cast this spell, exile cards from the top of your library until you find a nonland card that costs less; you may cast it for free. The rest go to the bottom.',
    },
  },
  // Termos do jogo.
  {
    id: 'virar',
    kind: 'term',
    lesson: 'mana-e-terrenos',
    'pt-BR': {
      term: 'Virar e desvirar',
      text: 'Virar ({T}) é girar a carta de lado para usá-la, como gerar mana ou atacar. Ela desvira no início do seu próximo turno.',
    },
    en: {
      term: 'Tap and untap',
      text: 'Tapping ({T}) is turning the card sideways to use it, like making mana or attacking. It untaps at the start of your next turn.',
    },
  },
  {
    id: 'enjoo-de-invocacao',
    kind: 'term',
    lesson: 'combate',
    'pt-BR': {
      term: 'Enjoo de invocação',
      text: 'Uma criatura que não está sob seu controle desde o início do seu turno não pode atacar nem usar habilidades com {T}.',
    },
    en: {
      term: 'Summoning sickness',
      text: "A creature you haven't controlled since the start of your turn can't attack or use {T} abilities.",
    },
  },
  {
    id: 'pilha',
    kind: 'term',
    lesson: 'a-pilha',
    'pt-BR': {
      term: 'Pilha',
      text: 'Onde mágicas e habilidades esperam para resolver. Todos podem responder; a última a entrar resolve primeiro.',
    },
    en: {
      term: 'Stack',
      text: 'Where spells and abilities wait to resolve. Everyone can respond; the last one in resolves first.',
    },
  },
  {
    id: 'grimorio',
    kind: 'term',
    lesson: 'o-que-e-magic',
    'pt-BR': { term: 'Grimório', text: 'O seu deck durante a partida, virado para baixo.' },
    en: { term: 'Library', text: 'Your deck during the game, face down.' },
  },
  {
    id: 'cemiterio',
    kind: 'term',
    lesson: 'o-que-e-magic',
    'pt-BR': {
      term: 'Cemitério',
      text: 'A pilha de descarte, virada para cima: mágicas usadas, criaturas destruídas e cartas descartadas.',
    },
    en: {
      term: 'Graveyard',
      text: 'The discard pile, face up: used spells, destroyed creatures and discarded cards.',
    },
  },
  {
    id: 'exilio',
    kind: 'term',
    lesson: 'o-que-e-magic',
    'pt-BR': {
      term: 'Exílio',
      text: 'Fora do jogo. Diferente do cemitério, quase nada traz cartas de volta do exílio.',
    },
    en: {
      term: 'Exile',
      text: 'Out of the game. Unlike the graveyard, almost nothing brings cards back from exile.',
    },
  },
  {
    id: 'permanente',
    kind: 'term',
    lesson: 'tipos-de-carta',
    'pt-BR': {
      term: 'Permanente',
      text: 'Tudo que fica no campo de batalha: terrenos, criaturas, artefatos, encantamentos, planeswalkers e fichas.',
    },
    en: {
      term: 'Permanent',
      text: 'Everything that stays on the battlefield: lands, creatures, artifacts, enchantments, planeswalkers and tokens.',
    },
  },
  {
    id: 'ficha',
    kind: 'term',
    'pt-BR': {
      term: 'Ficha',
      text: 'Uma permanente criada por um efeito, sem ser uma carta do deck (por exemplo, uma criatura Soldado 1/1). Se sair do campo de batalha, deixa de existir.',
    },
    en: {
      term: 'Token',
      text: 'A permanent created by an effect rather than a card from the deck (for example, a 1/1 Soldier creature). If it leaves the battlefield, it ceases to exist.',
    },
  },
  {
    id: 'marcador',
    kind: 'term',
    'pt-BR': {
      term: 'Marcador',
      text: 'Algo colocado sobre uma permanente ou um jogador para contar (+1/+1, lealdade, veneno…). Um +1/+1 e um -1/-1 na mesma criatura se anulam.',
    },
    en: {
      term: 'Counter',
      text: 'Something placed on a permanent or player to keep count (+1/+1, loyalty, poison…). A +1/+1 and a -1/-1 counter on the same creature cancel out.',
    },
  },
  {
    id: 'alvo',
    kind: 'term',
    lesson: 'a-pilha',
    'pt-BR': {
      term: 'Alvo',
      text: 'Quando uma carta diz "alvo", você escolhe ao lançar. Se o alvo deixar de ser válido antes de resolver, aquela parte não acontece.',
    },
    en: {
      term: 'Target',
      text: 'When a card says "target", you choose when you cast it. If the target is no longer legal when it resolves, that part does nothing.',
    },
  },
  {
    id: 'sacrificar',
    kind: 'term',
    'pt-BR': {
      term: 'Sacrificar',
      text: 'Colocar uma permanente sua no cemitério. Não é destruir: indestrutível não impede.',
    },
    en: {
      term: 'Sacrifice',
      text: "Putting a permanent you control into the graveyard. It isn't destroying: indestructible doesn't stop it.",
    },
  },
  {
    id: 'lendario',
    kind: 'term',
    lesson: 'commander-o-formato',
    'pt-BR': {
      term: 'Lendário',
      text: 'Você não pode ter duas permanentes lendárias com o mesmo nome; se acontecer, escolha uma e a outra vai para o cemitério.',
    },
    en: {
      term: 'Legendary',
      text: "You can't have two legendary permanents with the same name; if that happens, choose one and the other goes to the graveyard.",
    },
  },
  {
    id: 'habilidade-desencadeada',
    kind: 'term',
    lesson: 'a-pilha',
    'pt-BR': {
      term: 'Habilidade desencadeada',
      text: 'Começa com "quando", "sempre que" ou "no": acontece sozinha quando algo ocorre e vai para a pilha.',
    },
    en: {
      term: 'Triggered ability',
      text: 'Starts with "when", "whenever" or "at": it happens on its own when something occurs and goes on the stack.',
    },
  },
  {
    id: 'habilidade-ativada',
    kind: 'term',
    lesson: 'a-pilha',
    'pt-BR': {
      term: 'Habilidade ativada',
      text: 'Tem o formato "custo: efeito". Você paga o custo quando quiser usá-la, e o efeito vai para a pilha.',
    },
    en: {
      term: 'Activated ability',
      text: 'Has the form "cost: effect". You pay the cost whenever you want to use it, and the effect goes on the stack.',
    },
  },
  {
    id: 'valor-de-mana',
    kind: 'term',
    lesson: 'mana-e-terrenos',
    'pt-BR': {
      term: 'Valor de mana',
      text: 'O total do custo de mana: {2}{G} vale 3. Terrenos valem 0.',
    },
    en: { term: 'Mana value', text: 'The total of the mana cost: {2}{G} is 3. Lands are 0.' },
  },
  {
    id: 'mulligan',
    kind: 'term',
    lesson: 'o-que-e-magic',
    'pt-BR': {
      term: 'Mulligan',
      text: 'Trocar a mão inicial: embaralhe, compre 7 e coloque no fundo uma carta para cada mulligan feito.',
    },
    en: {
      term: 'Mulligan',
      text: 'Swapping your opening hand: shuffle, draw 7 and put one card on the bottom for each mulligan taken.',
    },
  },
  {
    id: 'imposto-do-comandante',
    kind: 'term',
    lesson: 'commander-o-formato',
    'pt-BR': {
      term: 'Imposto do comandante',
      text: 'Cada vez que você lança o comandante da zona de comando, ele custa {2} a mais do que da vez anterior.',
    },
    en: {
      term: 'Commander tax',
      text: 'Each time you cast your commander from the command zone, it costs {2} more than the previous time.',
    },
  },
  {
    id: 'dano-de-comandante',
    kind: 'term',
    lesson: 'mesa-de-commander',
    'pt-BR': {
      term: 'Dano de comandante',
      text: 'Quem recebe 21 de dano de combate de um mesmo comandante perde a partida.',
    },
    en: {
      term: 'Commander damage',
      text: 'A player who takes 21 combat damage from the same commander loses the game.',
    },
  },
];

/** Entradas no idioma pedido, em ordem alfabética do termo. */
export function glossaryFor(locale: LearnLocale) {
  const collator = new Intl.Collator(locale, { sensitivity: 'base' });
  const other: LearnLocale = locale === 'en' ? 'pt-BR' : 'en';
  return GLOSSARY.map((e) => ({
    id: e.id,
    kind: e.kind,
    lesson: e.lesson,
    ...e[locale],
    /** O nome no outro idioma (o das cartas impressas nele). */
    otherTerm: e[other].term,
    otherLocale: other,
  })).sort((a, b) => collator.compare(a.term, b.term));
}

/** Busca sem acento nem maiúsculas, no termo nos dois idiomas e no texto. */
export function searchGlossary(locale: LearnLocale, query: string) {
  const fold = (s: string) =>
    s
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase();
  const q = fold(query.trim());
  const list = glossaryFor(locale);
  if (!q) return list;
  const byId = new Map(GLOSSARY.map((e) => [e.id, e]));
  return list.filter((e) => {
    const entry = byId.get(e.id)!;
    return [entry['pt-BR'].term, entry.en.term, e.text].some((s) => fold(s).includes(q));
  });
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Palavras-chave do glossário que aparecem no texto de uma carta (mesa de testes): procura o termo
 * em inglês e em português como palavra inteira, sem maiúsculas; devolve na ordem em que aparecem,
 * no idioma pedido. Só as palavras-chave impressas (`kind: 'keyword'`), não os termos do jogo.
 */
export function glossaryKeywordsIn(text: string, locale: LearnLocale) {
  if (!text.trim()) return [];
  const found: { index: number; entry: GlossaryEntry }[] = [];
  for (const entry of GLOSSARY) {
    if (entry.kind !== 'keyword') continue;
    let first = -1;
    for (const term of [entry.en.term, entry['pt-BR'].term]) {
      const match = new RegExp(`(?<!\\p{L})${escapeRegExp(term)}(?!\\p{L})`, 'iu').exec(text);
      if (match && (first < 0 || match.index < first)) first = match.index;
    }
    if (first >= 0) found.push({ index: first, entry });
  }
  return found
    .sort((a, b) => a.index - b.index)
    .map(({ entry }) => ({ id: entry.id, lesson: entry.lesson, ...entry[locale] }));
}
