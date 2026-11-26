import { describe, expect, it } from 'vitest';
import { nameCandidate, nameSimilarity, readCardText } from './scan';

/** Linhas como o leitor devolve: texto e posição (0 = topo da imagem, 1 = base). */
const lines = (text: string) => {
  const all = text.split('\n');
  return all.map((t, i) => ({ text: t, top: i / all.length }));
};
const read = (text: string, nameZone = 0.22) =>
  readCardText({ text, lines: lines(text), nameZone });

// Textos reais lidos pela câmera de um iPhone (teste de 25/11/2026).
const INFANTARIA = `i DP goa
a BAD
( Infantaria dos Mil Luas Ze ) |
ae
Criatura — Humano Soldado Om
Desvire Infantaria dos Mil Luas durante
2/4 j
038
* PT t Manuet Castahon ™ & © 2023 Wizards
of the Coast Fe`;
const DEVORADO = `Te
PRT The
\\ Devorado por Piranhas Cy
oF f Ys
| Encantamento — Aura <Gi-
vu 00s4 ™ & © 2023 Wizards of the Coast
LCi + PT MAez) HARDING`;
const DOOMWAKE = `4 J
h Doomwake Giant $}
A : rf
a | Enchantment Creature — Giant @)
R 0212 ~~ =
SOC -EN t Key Waxea & © 2026 Wizards of
the Coas .`;
const SOL = `( Sol Ring
Artifact
U 0499
TRC • EN Hector Ortiz ™ & © 2026 Wizards of the Coast`;
const ATRAXA = `( Atraxa, Praetors’ Voice &
Legendary Creature — Phyrexian Angel Horror
190/332 M v& 2XM*+EN % VICTOR ADAME MINGUEZ`;

describe('leitura de carta pela câmera (texto)', () => {
  it('nome: a sequência com cara de nome, com palavras de ligação em português', () => {
    expect(nameCandidate('( Infantaria dos Mil Luas Ze ) |')).toBe('Infantaria dos Mil Luas Ze');
    expect(nameCandidate('\\ Devorado por Piranhas Cy')).toBe('Devorado por Piranhas Cy');
    expect(nameCandidate('PRT SS-g8 ON ROA')).toBe('');
    expect(nameCandidate('Legendary Creature — Angel')).toBe('');
  });

  it('candidatos: mais longos primeiro, com variações sem o lixo do fim; sem tipo nem copyright', () => {
    const r = read(INFANTARIA);
    expect(r.candidates.slice(0, 3)).toEqual([
      'Infantaria dos Mil Luas Ze',
      'Infantaria dos Mil Luas',
      'Infantaria dos Mil',
    ]);
    expect(r.candidates.join(' ')).not.toMatch(/Criatura|Wizards/);
    expect(read(DOOMWAKE).candidates[0]).toBe('Doomwake Giant');
  });

  it('edição, número e língua da linha de colecionador', () => {
    expect(read(SOL)).toMatchObject({ set: 'TRC', number: '499', lang: 'en', strongNumber: true });
    expect(read(DOOMWAKE)).toMatchObject({ set: 'SOC', number: '212', lang: 'en' });
    expect(read(ATRAXA)).toMatchObject({ set: '2XM', number: '190', strongNumber: true });
    // "LCi" em minúsculas vira LCI; o código precisa ter letra ("038" é o número).
    expect(read(DEVORADO)).toMatchObject({ set: 'LCI', lang: 'pt' });
    expect(read(INFANTARIA).set).toBeNull();
  });

  it('ano do copyright não vira número de colecionador', () => {
    expect(read('Sol Ring\n© 2026 TRC • EN')).toMatchObject({ set: 'TRC', number: null });
  });

  it('semelhança entre nomes ignora acentos e maiúsculas', () => {
    expect(nameSimilarity('Lancadora dos Mil Luas', 'Lançadora dos Mil Luas')).toBe(1);
    expect(nameSimilarity('Doomwake Gian', 'Doomwake Giant')).toBeGreaterThan(0.9);
    expect(nameSimilarity('Giant', 'Doomwake Gian')).toBeLessThan(0.6);
  });
});
