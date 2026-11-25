/**
 * "CMM #400": código da edição e número de colecionador — ou `null` quando a edição não é
 * conhecida. Módulo comum (não é componente de cliente): o servidor também usa.
 */
export function printLabel(
  card: { setCode?: string | null; collectorNumber?: string | null } | null | undefined,
) {
  if (!card?.setCode) return null;
  return `${card.setCode.toUpperCase()}${card.collectorNumber ? ` #${card.collectorNumber}` : ''}`;
}
