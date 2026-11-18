/** Opção de uma lista de seleção (o valor vazio `''` serve para "Todos"/"Nenhum"). */
export interface SelectOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
}

/**
 * Contrato do Select (escolha única numa lista; para poucas opções curtas, prefira `Choices`),
 * site e app. `null` = nenhuma escolhida (mostra `placeholder`).
 */
export interface SelectProps<T extends string> {
  label: string;
  value: NoInfer<T> | null;
  onChange(value: NoInfer<T>): void;
  options: readonly SelectOption<T>[];
  placeholder?: string;
  description?: string;
  error?: string;
  disabled?: boolean;
}

/** A opção escolhida, ou `null` (sem escolha ou valor fora da lista). */
export function selectedOption<T extends string>(
  options: readonly SelectOption<T>[],
  value: T | null | undefined,
): SelectOption<T> | null {
  if (value === null || value === undefined) return null;
  return options.find((o) => o.value === value) ?? null;
}
