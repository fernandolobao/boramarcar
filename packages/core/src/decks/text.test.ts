import { describe, expect, it } from 'vitest';
import { mergeDuplicates, parseDeckText } from './importers/text';

describe('parseDeckText', () => {
  it('lê quantidade, nome, edição, número e flags', () => {
    const entries = parseDeckText(
      [
        '1 Sol Ring (CMM) 400 *F*',
        '1x Arcane Signet',
        '10 Forest',
        '1 Lightning Greaves #proxy',
      ].join('\n'),
    );
    expect(entries).toEqual([
      {
        name: 'Sol Ring',
        quantity: 1,
        board: 'mainboard',
        setCode: 'cmm',
        collectorNumber: '400',
        isFoil: true,
      },
      { name: 'Arcane Signet', quantity: 1, board: 'mainboard' },
      { name: 'Forest', quantity: 10, board: 'mainboard' },
      { name: 'Lightning Greaves', quantity: 1, board: 'mainboard', isProxy: true },
    ]);
  });

  it('reconhece seções explícitas', () => {
    const entries = parseDeckText(
      [
        'Commander',
        '1 Omnath, Locus of Mana',
        '',
        'Deck',
        '1 Cultivate',
        '',
        '// Sideboard',
        '1 Beast Within',
        'MAYBEBOARD:',
        '1 Harmonize',
      ].join('\n'),
    );
    expect(entries.map((e) => [e.name, e.board])).toEqual([
      ['Omnath, Locus of Mana', 'commander'],
      ['Cultivate', 'mainboard'],
      ['Beast Within', 'sideboard'],
      ['Harmonize', 'maybeboard'],
    ]);
  });

  it('infere o comandante no bloco final separado por linha em branco', () => {
    const entries = parseDeckText('1 Cultivate\n1 Sol Ring\n\n1 Omnath, Locus of Mana');
    expect(entries.find((e) => e.name === 'Omnath, Locus of Mana')?.board).toBe('commander');
    expect(entries.find((e) => e.name === 'Sol Ring')?.board).toBe('mainboard');
  });

  it('lê as exportações do Moxfield ("Copy Plain Text" e "Copy for Moxfield")', () => {
    const plain = parseDeckText(
      '1 Adarkar Wastes\n1 Sol Ring\n1 Wonder\n\n1 Sidar Jabari of Zhalfir\n',
    );
    expect(plain.find((e) => e.name === 'Sidar Jabari of Zhalfir')?.board).toBe('commander');
    expect(plain.filter((e) => e.board === 'mainboard')).toHaveLength(3);

    const moxfield = parseDeckText(
      '1 Sidar Jabari of Zhalfir (MOC) 5\n1 Bojuka Bog (PLST) C18-238\n1 Artifacts (FMSC) 3',
    );
    expect(moxfield[1]).toEqual({
      name: 'Bojuka Bog',
      quantity: 1,
      board: 'mainboard',
      setCode: 'plst',
      collectorNumber: 'C18-238',
    });
  });

  it('ignora o cabeçalho do formato Arena', () => {
    expect(
      parseDeckText(
        'About\nName Meu deck\n\nCommander\n1 Sidar Jabari of Zhalfir\n\nDeck\n1 Sol Ring',
      ),
    ).toEqual([
      { name: 'Sidar Jabari of Zhalfir', quantity: 1, board: 'commander' },
      { name: 'Sol Ring', quantity: 1, board: 'mainboard' },
    ]);
  });

  it('mantém nomes com vírgulas, apóstrofos e dupla face', () => {
    const entries = parseDeckText("1 Jace, Vryn's Prodigy // Jace, Telepath Unbound");
    expect(entries[0]?.name).toBe("Jace, Vryn's Prodigy // Jace, Telepath Unbound");
  });

  it('ignora linhas inválidas e comentários', () => {
    expect(parseDeckText('# comentário\nabc\n0 Sol Ring\n\n')).toEqual([]);
  });

  it('soma linhas repetidas', () => {
    expect(parseDeckText('2 Forest\n3 Forest')).toEqual([
      { name: 'Forest', quantity: 5, board: 'mainboard' },
    ]);
  });
});

describe('mergeDuplicates', () => {
  it('não junta proxy com carta original', () => {
    const merged = mergeDuplicates([
      { name: 'Sol Ring', quantity: 1, board: 'mainboard' },
      { name: 'Sol Ring', quantity: 1, board: 'mainboard', isProxy: true },
    ]);
    expect(merged).toHaveLength(2);
  });
});
