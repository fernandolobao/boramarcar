/**
 * Contrato do Checkbox (marcar/desmarcar; vale ao salvar o formulário), site e app. O texto do
 * rótulo é o nome acessível; ao lado dele podem vir detalhes visuais (contagem, selo).
 */
export interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange(checked: boolean): void;
  description?: string;
  disabled?: boolean;
}

/** Contrato do Switch (liga/desliga com efeito imediato, como uma configuração), site e app. */
export type SwitchProps = CheckboxProps;

/** Contrato do Stat (cartão de número: rótulo, valor já formatado e uma dica opcional). */
export interface StatProps {
  label: string;
  value: string;
  hint?: string;
}

/** Marca (`on`) ou desmarca um item numa lista, sem repetir e mantendo a ordem. */
export function toggleIn<T>(list: readonly T[], item: T, on: boolean): T[] {
  const without = list.filter((x) => x !== item);
  return on ? (list.includes(item) ? [...list] : [...list, item]) : without;
}

/** Nome acessível do Stat: "rótulo: valor", com a dica depois. */
export function statLabel(label: string, value: string, hint?: string) {
  return `${label}: ${value}${hint ? `, ${hint}` : ''}`;
}
