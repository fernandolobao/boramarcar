/** Só caminhos internos (evita redirecionar para outro site depois do login). */
export const safeCallback = (value: string | null | undefined, fallback = '/painel') =>
  value && value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\')
    ? value
    : fallback;
