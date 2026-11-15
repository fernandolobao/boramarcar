/**
 * As capturas da página inicial apagam e recriam todas as tabelas: só podem rodar num banco local
 * e descartável (nome começando com "showcase"). Qualquer outra URL para antes de escrever.
 */
export function assertDisposableDatabase(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(
      'DATABASE_URL inválida: use um banco local e descartável (ex.: postgres://…@localhost:5433/showcase).',
    );
  }
  const local = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  const name = parsed.pathname.replace(/^\//, '');
  if (!local || !name.startsWith('showcase')) {
    throw new Error(
      `Recusado: as capturas só rodam num banco local e descartável chamado "showcase…" (recebido ${parsed.hostname}/${name}).`,
    );
  }
}
