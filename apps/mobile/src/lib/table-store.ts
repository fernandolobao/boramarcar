import type { TableState } from '@boramarcar/core/table';
import { File, Paths } from 'expo-file-system';

/**
 * A partida em andamento fica salva no aparelho (um arquivo por encontro), para continuar depois
 * de fechar o app ou o sistema encerrá-lo. Some ao registrar ou descartar.
 */
const fileFor = (eventId: string) =>
  new File(Paths.document, `mesa-${eventId.replace(/[^\w-]/g, '_')}.json`);

export function loadTable(eventId: string): TableState | null {
  try {
    const file = fileFor(eventId);
    if (!file.exists) return null;
    const state = JSON.parse(file.textSync()) as TableState;
    return Array.isArray(state.players) && state.players.length >= 2 ? state : null;
  } catch {
    return null;
  }
}

export function saveTable(eventId: string, state: TableState) {
  try {
    const file = fileFor(eventId);
    if (!file.exists) file.create();
    file.writeSync(JSON.stringify(state));
  } catch {
    // Sem espaço ou sem permissão: a partida continua na memória.
  }
}

export function clearTable(eventId: string) {
  try {
    const file = fileFor(eventId);
    if (file.exists) file.delete();
  } catch {
    // nada a fazer
  }
}
