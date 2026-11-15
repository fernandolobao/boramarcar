export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
  description?: string;
  disabled?: boolean;
}

/** Contrato do Choices (escolha única: chips ou cartões), site e app. */
export interface ChoicesProps<T extends string> {
  label: string;
  /** `null` = nenhuma escolhida ainda. */
  value: T | null;
  onChange(value: T): void;
  options: readonly ChoiceOption<T>[];
  description?: string;
  error?: string;
  orientation?: 'horizontal' | 'vertical';
}

/** Próxima opção habilitada (setas do teclado), dando a volta; sem escolha, a primeira habilitada. */
export function nextChoice<T extends string>(
  options: readonly ChoiceOption<T>[],
  current: T | null,
  delta: 1 | -1,
): T | null {
  const enabled = options.filter((o) => !o.disabled);
  if (enabled.length === 0) return null;
  const index = enabled.findIndex((o) => o.value === current);
  if (index < 0) return enabled[0]!.value;
  return enabled[(index + delta + enabled.length) % enabled.length]!.value;
}
