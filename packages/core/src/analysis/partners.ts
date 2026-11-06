import type { CardData } from '../decks/types';

type PairCard = Pick<CardData, 'name' | 'typeLine' | 'oracleText'>;

interface PairingAbilities {
  partner: boolean;
  /** "Partner with X": nome do parceiro (minúsculas). */
  partnerWith: string | null;
  /** "Partner—Character select", "Friends forever"… (minúsculas): só pareia com o mesmo grupo. */
  group: string | null;
  chooseBackground: boolean;
  background: boolean;
  doctorsCompanion: boolean;
  timeLordDoctor: boolean;
}

const lines = (card: PairCard) =>
  (card.oracleText ?? '')
    .split('\n')
    .map((l) => l.replace(/\s*\(.*\)\s*$/, '').trim())
    .filter(Boolean);

/** Lê no texto de regras as habilidades que permitem dois comandantes. */
export function pairingAbilities(card: PairCard): PairingAbilities {
  const result: PairingAbilities = {
    partner: false,
    partnerWith: null,
    group: null,
    chooseBackground: false,
    background: /\bBackground\b/.test(card.typeLine),
    doctorsCompanion: false,
    timeLordDoctor: /\bTime Lord Doctor\b/.test(card.typeLine),
  };
  for (const line of lines(card)) {
    const lower = line.toLowerCase();
    const withMatch = /^partner with (.+)$/i.exec(line);
    const groupMatch = /^partner\s*[—–-]\s*(.+)$/i.exec(line);
    if (withMatch) result.partnerWith = withMatch[1]!.trim().toLowerCase();
    else if (groupMatch) result.group = groupMatch[1]!.trim().toLowerCase();
    else if (lower === 'partner') result.partner = true;
    else if (lower === 'friends forever') result.group = 'friends forever';
    else if (lower === 'choose a background') result.chooseBackground = true;
    else if (lower === "doctor's companion") result.doctorsCompanion = true;
  }
  return result;
}

const sameName = (wanted: string, card: PairCard) => {
  const name = card.name.toLowerCase();
  return name === wanted || name.split(' // ')[0] === wanted;
};

/**
 * Dois comandantes podem jogar juntos? Partner (os dois), "Partner with" (um nomeia o outro),
 * "Partner—<grupo>" e Friends forever (mesmo grupo, ex.: "Character select"), "Choose a
 * Background" + um Antecedente, "Doctor's companion" + um Time Lord Doctor.
 */
export function canPairCommanders(a: PairCard, b: PairCard): boolean {
  const x = pairingAbilities(a);
  const y = pairingAbilities(b);
  if (x.partner && y.partner) return true;
  if (x.partnerWith && y.partnerWith && sameName(x.partnerWith, b) && sameName(y.partnerWith, a))
    return true;
  if (x.group && x.group === y.group) return true;
  if ((x.chooseBackground && y.background) || (y.chooseBackground && x.background)) return true;
  if ((x.doctorsCompanion && y.timeLordDoctor) || (y.doctorsCompanion && x.timeLordDoctor))
    return true;
  return false;
}
