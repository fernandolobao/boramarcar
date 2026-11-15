/**
 * Dados fictícios das capturas da página inicial. Nada aqui é de gente de verdade: nomes, e-mails
 * (@showcase.test) e grupo são inventados. As listas de deck usam cartas reais (o import busca no
 * Scryfall), para as imagens e a análise saírem como no produto.
 */
export const SHOWCASE_GROUP = {
  id: 'showcase-group',
  name: 'Mesa de Quinta',
  inviteCode: 'MESA5QUI',
};

export const SHOWCASE_USERS = [
  { id: 'sc-ana', name: 'Ana Lima', email: 'ana@showcase.test' },
  { id: 'sc-bruno', name: 'Bruno Rocha', email: 'bruno@showcase.test' },
  { id: 'sc-carla', name: 'Carla Mendes', email: 'carla@showcase.test' },
  { id: 'sc-diego', name: 'Diego Souza', email: 'diego@showcase.test' },
  { id: 'sc-elisa', name: 'Elisa Prado', email: 'elisa@showcase.test' },
  { id: 'sc-felipe', name: 'Felipe Nunes', email: 'felipe@showcase.test' },
] as const;
export type ShowcaseUserId = (typeof SHOWCASE_USERS)[number]['id'];

/** Quem captura as telas (a "visão" da página). */
export const SHOWCASE_VIEWER: ShowcaseUserId = 'sc-ana';

const basics = (name: string, n: number) => `${n} ${name}`;

/** Deck principal da Ana: lista completa (99 + comandante), para a análise sair completa. */
const EZURI = `Commander
1 Ezuri, Renegade Leader

Deck
${[
  'Llanowar Elves',
  'Elvish Mystic',
  'Fyndhorn Elves',
  'Priest of Titania',
  'Elvish Archdruid',
  'Elvish Visionary',
  'Heritage Druid',
  'Nettle Sentinel',
  'Elvish Warmaster',
  "Dwynen's Elite",
  'Elvish Champion',
  'Elvish Clancaller',
  'Lys Alana Huntmaster',
  'Wellwisher',
  'Imperious Perfect',
  'Elvish Harbinger',
  'Elvish Promenade',
  'Joraga Warcaller',
  'Quirion Ranger',
  'Wirewood Symbiote',
  'Timberwatch Elf',
  "Ezuri's Brigade",
  'Marwyn, the Nurturer',
  'Llanowar Tribe',
  'Elvish Piper',
  'Sol Ring',
  'Arcane Signet',
  'Cultivate',
  "Kodama's Reach",
  'Rampant Growth',
  "Nature's Lore",
  'Three Visits',
  'Harmonize',
  'Beast Whisperer',
  'Guardian Project',
  'Craterhoof Behemoth',
  'Overwhelming Stampede',
  'Beastmaster Ascension',
  'Shamanic Revelation',
  'Return of the Wildspeaker',
  'Heroic Intervention',
  'Beast Within',
  'Krosan Grip',
  "Nature's Claim",
  'Reclamation Sage',
  'Eternal Witness',
  'Regrowth',
  'Worldly Tutor',
  'Chord of Calling',
  "Green Sun's Zenith",
  'Natural Order',
  'Skyshroud Claim',
  'Explosive Vegetation',
  "Lifecrafter's Bestiary",
  'Garruk Wildspeaker',
  'Seedborn Muse',
  'Sylvan Library',
  'Evolutionary Leap',
  'Lightning Greaves',
  'Swiftfoot Boots',
  'Coat of Arms',
  'Steely Resolve',
  'Elvish Rejuvenator',
]
  .map((c) => `1 ${c}`)
  .join('\n')}
1 Gaea's Cradle
1 Nykthos, Shrine to Nyx
${basics('Forest', 34)}`;

/** Decks dos outros: o comandante e o coração do deck (aparecem no ranking e nas partidas). */
const short = (commander: string, cards: string[], basic: string) =>
  `Commander\n1 ${commander}\n\nDeck\n${cards.map((c) => `1 ${c}`).join('\n')}\n${basics(basic, 30)}`;

export const SHOWCASE_DECKS: {
  owner: ShowcaseUserId;
  name: string;
  list: string;
  proxies?: string[];
}[] = [
  { owner: 'sc-ana', name: 'Ezuri Elfos', list: EZURI, proxies: ["Gaea's Cradle"] },
  {
    owner: 'sc-bruno',
    name: 'Krenko Goblins',
    list: short(
      'Krenko, Mob Boss',
      [
        'Goblin Chieftain',
        'Goblin Warchief',
        'Skirk Prospector',
        'Impact Tremors',
        'Goblin Bombardment',
        'Purphoros, God of the Forge',
        'Sol Ring',
        'Arcane Signet',
        'Goblin Matron',
        'Muxus, Goblin Grandee',
      ],
      'Mountain',
    ),
  },
  {
    owner: 'sc-carla',
    name: 'Talrand Mágicas',
    list: short(
      'Talrand, Sky Summoner',
      [
        'Counterspell',
        'Brainstorm',
        'Ponder',
        'Rhystic Study',
        'Mystic Remora',
        'Cyclonic Rift',
        'Sol Ring',
        'Arcane Signet',
        'Opt',
        'Preordain',
      ],
      'Island',
    ),
  },
  {
    owner: 'sc-diego',
    name: 'Meren Cemitério',
    list: short(
      'Meren of Clan Nel Toth',
      [
        'Sakura-Tribe Elder',
        'Eternal Witness',
        'Viscera Seer',
        'Spore Frog',
        'Sol Ring',
        'Arcane Signet',
        'Golgari Signet',
        'Grim Haruspex',
        'Pernicious Deed',
        'Reanimate',
      ],
      'Swamp',
    ),
  },
  {
    owner: 'sc-elisa',
    name: 'Light-Paws Auras',
    list: short(
      "Light-Paws, Emperor's Voice",
      [
        'Ethereal Armor',
        "Sentinel's Eyes",
        'Rancor',
        'Sol Ring',
        'Swords to Plowshares',
        'Path to Exile',
        'Kor Spiritdancer',
        'Sram, Senior Edificer',
        'Spirit Mantle',
        'Arcane Signet',
      ],
      'Plains',
    ),
  },
  {
    owner: 'sc-felipe',
    name: 'Lathril Elfos',
    list: short(
      'Lathril, Blade of the Elves',
      [
        'Elvish Mystic',
        'Llanowar Elves',
        'Elvish Archdruid',
        'Sol Ring',
        'Arcane Signet',
        'Golgari Signet',
        'Viscera Seer',
        'Ruthless Winnower',
        'Elvish Warmaster',
        'Poison-Tip Archer',
      ],
      'Forest',
    ),
  },
];

/** Cartas a mais na coleção da Ana (além das que vêm dos decks), com algumas valiosas e foils. */
export const SHOWCASE_COLLECTION: { name: string; quantity: number; foil?: boolean }[] = [
  { name: 'The One Ring', quantity: 1 },
  { name: 'Rhystic Study', quantity: 1, foil: true },
  { name: 'Smothering Tithe', quantity: 1 },
  { name: 'Dockside Extortionist', quantity: 1 },
  { name: 'Cyclonic Rift', quantity: 2 },
  { name: "Thassa's Oracle", quantity: 1 },
  { name: 'Demonic Tutor', quantity: 1 },
  { name: 'Lightning Bolt', quantity: 4 },
  { name: 'Counterspell', quantity: 4 },
  { name: 'Swords to Plowshares', quantity: 3, foil: true },
  { name: 'Command Tower', quantity: 6 },
  { name: 'Arcane Signet', quantity: 5 },
  { name: 'Esper Sentinel', quantity: 1 },
  { name: 'Jeweled Lotus', quantity: 1 },
  { name: "Atraxa, Praetors' Voice", quantity: 1, foil: true },
  { name: "Teferi's Protection", quantity: 1 },
  { name: 'Fierce Guardianship', quantity: 1 },
  { name: 'Ancient Tomb', quantity: 1 },
];

/** Partidas das últimas 12 quintas: [deck dono → resultado], turno e duração. */
export const SHOWCASE_GAMES: {
  week: number;
  players: ShowcaseUserId[];
  winner: ShowcaseUserId | 'draw';
  turn: number;
  minutes: number;
}[] = [
  {
    week: 1,
    players: ['sc-ana', 'sc-bruno', 'sc-carla', 'sc-diego'],
    winner: 'sc-ana',
    turn: 8,
    minutes: 75,
  },
  {
    week: 1,
    players: ['sc-elisa', 'sc-felipe', 'sc-bruno', 'sc-ana'],
    winner: 'sc-elisa',
    turn: 9,
    minutes: 90,
  },
  {
    week: 2,
    players: ['sc-carla', 'sc-diego', 'sc-elisa', 'sc-felipe'],
    winner: 'sc-carla',
    turn: 7,
    minutes: 70,
  },
  {
    week: 3,
    players: ['sc-ana', 'sc-bruno', 'sc-elisa', 'sc-felipe'],
    winner: 'sc-bruno',
    turn: 6,
    minutes: 55,
  },
  {
    week: 3,
    players: ['sc-carla', 'sc-diego', 'sc-ana', 'sc-bruno'],
    winner: 'sc-ana',
    turn: 10,
    minutes: 110,
  },
  {
    week: 4,
    players: ['sc-diego', 'sc-elisa', 'sc-felipe', 'sc-carla'],
    winner: 'sc-diego',
    turn: 9,
    minutes: 95,
  },
  {
    week: 5,
    players: ['sc-ana', 'sc-carla', 'sc-elisa', 'sc-felipe'],
    winner: 'sc-felipe',
    turn: 8,
    minutes: 80,
  },
  {
    week: 6,
    players: ['sc-bruno', 'sc-diego', 'sc-ana', 'sc-elisa'],
    winner: 'sc-ana',
    turn: 7,
    minutes: 65,
  },
  {
    week: 6,
    players: ['sc-carla', 'sc-felipe', 'sc-bruno', 'sc-diego'],
    winner: 'draw',
    turn: 12,
    minutes: 130,
  },
  {
    week: 7,
    players: ['sc-ana', 'sc-bruno', 'sc-carla', 'sc-diego'],
    winner: 'sc-carla',
    turn: 8,
    minutes: 85,
  },
  {
    week: 8,
    players: ['sc-elisa', 'sc-felipe', 'sc-ana', 'sc-bruno'],
    winner: 'sc-bruno',
    turn: 5,
    minutes: 45,
  },
  {
    week: 9,
    players: ['sc-ana', 'sc-diego', 'sc-elisa', 'sc-carla'],
    winner: 'sc-ana',
    turn: 9,
    minutes: 90,
  },
  {
    week: 10,
    players: ['sc-bruno', 'sc-carla', 'sc-felipe', 'sc-ana'],
    winner: 'sc-felipe',
    turn: 7,
    minutes: 70,
  },
  {
    week: 11,
    players: ['sc-ana', 'sc-bruno', 'sc-diego', 'sc-elisa'],
    winner: 'sc-diego',
    turn: 11,
    minutes: 120,
  },
  {
    week: 12,
    players: ['sc-carla', 'sc-elisa', 'sc-felipe', 'sc-ana'],
    winner: 'sc-ana',
    turn: 8,
    minutes: 80,
  },
];
