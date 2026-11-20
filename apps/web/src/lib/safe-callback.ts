const BASE = 'https://arcanakin.invalid';

/**
 * Só caminhos internos (evita redirecionar para outro site depois do login). O navegador ignora
 * tabulação e quebra de linha numa URL e lê `\` como `/`, então `/\t/site.com` viraria `//site.com`:
 * caracteres de controle e barras invertidas (também codificados) são recusados, e o resultado
 * precisa continuar na mesma origem.
 */
export const safeCallback = (value: string | null | undefined, fallback = '/painel') => {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return fallback;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f\\]/.test(value) || /%(?:[01][0-9a-f]|7f|5c)/i.test(value)) {
    return fallback;
  }
  try {
    return new URL(value, BASE).origin === BASE ? value : fallback;
  } catch {
    return fallback;
  }
};
