/**
 * Design tokens do ArcanaKin (rebranding, Fase 6).
 *
 * Três camadas:
 * 1. `palette` — as seis cores da marca (fonte: `palette.json`, entregue pelo design).
 * 2. `scales` — escalas 50–950 derivadas da paleta (OKLab), para estados e variações.
 * 3. `themes` — cores por função (fundo, superfície, texto, borda, ação…) no tema claro e no
 *    escuro. Telas usam estas; os testes garantem contraste WCAG 2.2 AA entre os pares usados.
 *
 * Arquivo único e sem imports relativos de propósito: o script `build:css` roda direto no Node
 * (remoção de tipos), e o site e o app importam o mesmo arquivo.
 */

/** A paleta da marca, com os nomes e funções do design. */
export const palette = {
  /** Arcano — roxo profundo, cor primária da marca. */
  arcano: '#3b0d6b',
  /** Éter — violeta, cor secundária e das ações (botões). */
  eter: '#7c3aed',
  /** Dourado — destaque 1 (vitórias, primeiro lugar, chamadas). */
  dourado: '#f6b944',
  /** Mana — destaque 2 (verde-água). */
  mana: '#14b8a6',
  /** Noite — fundo escuro. */
  noite: '#0b0716',
  /** Pergaminho — fundo claro. */
  pergaminho: '#f4ebdb',
} as const;

/** Função de cada cor da paleta, como no `palette.json` (slug). */
export const paletteRoles = {
  primary: 'arcano',
  secondary: 'eter',
  accent1: 'dourado',
  accent2: 'mana',
  dark: 'noite',
  light: 'pergaminho',
} as const satisfies Record<string, keyof typeof palette>;

type Scale = Record<50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950, string>;

/**
 * Escalas derivadas. `brand` é o violeta (600 = Éter, 900 = Arcano); `ink` são os neutros, do
 * Pergaminho (100) à Noite (950); `gold` (400 = Dourado) e `teal` (500 = Mana) são os destaques.
 */
export const scales = {
  brand: {
    50: '#f5f3ff',
    100: '#ede9fe',
    200: '#ddd6fe',
    300: '#c4b5fd',
    400: '#a78bfa',
    500: '#8b5cf6',
    600: palette.eter,
    700: '#6d28d9',
    800: '#5b21b6',
    900: palette.arcano,
    950: '#250847',
  },
  ink: {
    50: '#fffbf3',
    100: palette.pergaminho,
    200: '#e7ded1',
    300: '#d6cec3',
    400: '#a49d99',
    500: '#777174',
    600: '#575259',
    700: '#423d48',
    800: '#292532',
    900: '#181423',
    950: palette.noite,
  },
  gold: {
    50: '#fff9ea',
    100: '#ffefcc',
    200: '#ffde9b',
    300: '#ffca68',
    400: palette.dourado,
    500: '#d8a02e',
    600: '#b3821c',
    700: '#8d6300',
    800: '#6c4c07',
    900: '#543b05',
    950: '#352200',
  },
  teal: {
    50: '#f0fefb',
    100: '#d6f9f2',
    200: '#aff1e5',
    300: '#7ee3d3',
    400: '#4cd0be',
    500: palette.mana,
    600: '#009586',
    700: '#00786b',
    800: '#005e53',
    900: '#004b43',
    950: '#002f29',
  },
} as const satisfies Record<string, Scale>;

const { brand, ink, gold, teal } = scales;

/** Cores por função. Os nomes viram classes no site (`bg-canvas`, `text-fg-muted`…). */
export interface ThemeTokens {
  /** Fundo da página. */
  canvas: string;
  /** Cartões, menus, campos. */
  surface: string;
  /** Superfície em destaque leve (hover, chips, linhas alternadas). */
  surfaceMuted: string;
  /** Texto principal. */
  fg: string;
  /** Texto secundário (≥ 4,5:1 sobre canvas, surface e surfaceMuted). */
  fgMuted: string;
  /** Bordas decorativas (cartões, divisórias). */
  line: string;
  /** Bordas que identificam controles (campos): ≥ 3:1 sobre canvas e surface. */
  lineStrong: string;
  /** Ação principal (botões). */
  primary: string;
  primaryHover: string;
  /** Texto sobre `primary`/`primaryHover`. */
  onPrimary: string;
  /** Links e texto na cor da marca. */
  link: string;
  /** Anel de foco: ≥ 3:1 sobre canvas e surface. */
  focus: string;
  /** Destaque (Dourado) como preenchimento, com `onAccent` por cima. */
  accent: string;
  onAccent: string;
  /** Destaque (Dourado) como texto legível sobre canvas e surface. */
  accentText: string;
  /** Mana (verde-água) como texto legível sobre canvas e surface. */
  manaText: string;
  success: string;
  danger: string;
}

export const themes: { light: ThemeTokens; dark: ThemeTokens } = {
  light: {
    canvas: ink[100],
    surface: ink[50],
    surfaceMuted: ink[200],
    fg: ink[950],
    fgMuted: ink[600],
    line: ink[300],
    lineStrong: ink[500],
    primary: brand[600],
    primaryHover: brand[700],
    onPrimary: '#ffffff',
    link: brand[700],
    focus: brand[600],
    accent: gold[400],
    onAccent: ink[950],
    accentText: gold[800],
    manaText: teal[800],
    success: '#166534',
    danger: '#b91c1c',
  },
  dark: {
    canvas: ink[950],
    surface: ink[900],
    surfaceMuted: ink[800],
    fg: ink[100],
    fgMuted: ink[400],
    line: ink[800],
    lineStrong: ink[500],
    primary: brand[600],
    primaryHover: brand[700],
    onPrimary: '#ffffff',
    link: brand[300],
    focus: brand[400],
    accent: gold[400],
    onAccent: ink[950],
    accentText: gold[400],
    manaText: teal[400],
    success: '#4ade80',
    danger: '#f87171',
  },
};

/**
 * Logotipo (palavra "ArcanaKin"), numa cor só: o site e o app pintam com a cor do texto.
 * Fonte: `logotipo.svg` do design (8 caminhos unidos num só).
 */
export const logo = {
  viewBox: '0 0 489.01 86.973',
  aspectRatio: 5.6225,
  path: 'M329.134 39.179 L320.725 22.165 L312.086 38.985 Z M368.914 58.171 L333.695 58.116 C334.604 56.954 336.173 54.38 335.705 53.262 L331.832 44.024 L309.746 43.955 L305.589 52.859 C305.059 53.992 306.279 56.1 308.17 58.012 L294.026 58.071 C297.393 55.501 299.511 52.93 301.382 49.229 L317.528 17.3 C318.713 14.956 315.949 11.87 313.884 11.121 L325.521 10.681 L347.295 54.389 L351.688 57.035 C352.827 57.721 355.175 54.261 355.178 52.876 L355.248 17.921 C355.26 12.05 353.256 8.35 349.352 4.535 L369.165 11.288 C367.593 12.346 365.632 14.408 365.622 15.747 L365.496 33.479 L383.589 15.992 C384.623 14.993 383.174 12.104 382.248 11.157 L399.374 11.078 C395.849 13.103 392.241 15.147 389.163 17.878 L374.488 30.9 C374.488 30.9 399.043 59.164 402.66 62.781 L413.523 72.426 C419.058 77.342 425.47 80.132 432.183 82.849 C416.566 82.555 403.095 74.604 391.887 63.966 L365.596 35.595 L365.429 52.366 C365.414 53.838 367.494 56.424 368.914 58.171 M218.942 38.876 L210.271 21.496 L201.525 39.108 Z M274.313 44.177 L252.744 23.495 L252.877 51.081 C252.892 54.217 255.525 56.377 258.37 58.048 L223.672 58.135 C225.082 56.517 226.469 53.861 225.784 52.472 L221.679 44.157 L198.984 43.981 L194.647 52.717 C194.028 53.964 195.812 56.437 197.191 58.057 L182.818 58.06 C185.656 55.756 187.798 53.632 189.581 50.249 L206.676 17.803 C207.254 16.708 206.902 13.93 206.124 13.349 L202.661 10.761 L215.571 10.898 L237.958 53.942 C238.81 55.58 241.966 57.207 243.488 56.959 C245.009 56.711 247.163 53.746 247.167 51.979 L247.25 17.708 C247.257 15.049 244.886 12.78 241.941 11.177 L254.637 11.307 L285.849 41.266 L286.046 19.708 C286.075 16.545 284.224 13.339 282.04 11.157 L295.145 11.204 C292.843 13.058 291.024 15.681 291.018 18.775 L290.934 60.026 Z M22.777 59.057 C22.501 59.536 21.922 60.813 21.782 61.74 C21.692 62.334 21.711 63.116 22.559 63.328 C22.559 63.328 23.664 63.728 26.417 64.01 C21.923 65.163 15.181 69.099 15.181 69.099 C10.042 71.487 5.534 74.463 0 76.113 C6.907 70.13 11.881 63.911 16.407 56.138 L43.706 9.257 C43.322 5.679 40.579 2.748 36.804 0 L51.837 0.028 C62.579 23.619 72.72 46.496 84.895 68.876 C89.294 76.963 96.274 82.014 103.239 86.973 C90.033 84.862 76.348 77.998 70.59 65.763 L47.376 16.436 Z M485.027 55.562 C485.01 59.742 486.847 63.245 487.84 67.479 L439.457 21.096 L439.144 51.922 C439.114 54.92 441.65 57.291 444.2 59.039 L429.702 58.509 C431.741 56.225 433.792 53.883 433.793 51.804 L433.817 13.929 C433.819 9.134 430.597 5.512 427.064 2.737 L438.812 5.987 C439.39 6.147 439.921 6.446 440.358 6.857 L479.692 43.944 L479.909 15.759 C479.921 14.159 478.612 12.067 476.88 9.996 C479.981 7.999 484.584 5.821 489.01 4.509 C487.858 7.179 485.21 10.673 485.202 12.781 Z M100.467 35.996 C108.575 35.795 116.477 33.059 116.552 25.385 C116.586 21.924 114.81 17.047 110.707 16.431 C106.574 15.81 102.437 15.857 97.305 15.785 L97.21 52.899 C97.206 54.496 99.743 56.806 101.368 58.153 L83.669 58.167 C85.457 56.225 87.186 54.087 87.199 52.134 L87.408 21.063 C87.437 16.623 86.608 12.887 81.717 11.44 L109.124 11.219 C114.644 11.175 121.067 12.176 124.565 16.164 C128.151 20.251 128.308 25.112 125.83 29.904 C124.1 33.25 120.008 35.396 114.374 37.17 C121.98 45.989 129.283 54.599 138.061 61.825 C142.508 65.485 148.079 66.773 153.716 69.143 C139.68 70.827 126.371 64.954 117.232 54.737 Z M146.19 26.655 C142.984 36.711 146.825 47.321 155.718 51.814 C164.836 56.42 176.079 53.512 182.098 44.784 L179.551 54.532 C162.595 64.042 139.075 58.043 134.767 41.268 C132.303 31.671 135.403 22.172 143.424 16.139 C152.174 9.559 163.603 8.583 174.275 11.86 C175.509 12.239 178.493 11.659 180.11 11.251 L180.722 26.334 C176.973 18.569 170.556 14.371 162.075 14.659 C154.413 14.92 148.664 18.895 146.19 26.655 M422.985 58.186 L405.858 58.04 C407.807 56.576 410.159 54.221 410.169 52.023 L410.32 19.747 C410.335 16.451 408.456 13.143 406.081 11.4 L424.07 11.319 C422.146 12.699 419.99 15.276 419.994 17.714 L420.048 52.115 C420.05 53.465 421.547 55.806 422.985 58.186 M49.941 43.487 C48.577 42.229 46.325 37.437 45.918 36.556 C45.493 37.437 43.144 42.229 41.722 43.487 C40.239 44.798 34.434 46.805 34.434 46.805 C34.434 46.805 40.382 48.888 41.869 50.263 C43.299 51.586 45.506 56.587 45.918 57.539 C46.313 56.587 48.428 51.586 49.8 50.263 C51.226 48.888 56.929 46.805 56.929 46.805 C56.929 46.805 51.363 44.798 49.941 43.487',
} as const;

// ---------------------------------------------------------------------------------------------
// Contraste (WCAG 2.x)

const channel = (value: number) => {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

/** Luminância relativa de uma cor `#rrggbb`. */
export function luminance(hex: string): number {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!match) throw new Error(`Cor inválida: ${hex}`);
  const [r, g, b] = match.slice(1).map((h) => channel(parseInt(h, 16)));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

/** Razão de contraste entre duas cores (1 a 21). */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

// ---------------------------------------------------------------------------------------------
// CSS para o site (Tailwind v4)

const kebab = (name: string) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

const themeVars = (theme: ThemeTokens, indent: string) =>
  Object.entries(theme)
    .map(([name, value]) => `${indent}--ak-${kebab(name)}: ${value};`)
    .join('\n');

/**
 * CSS gerado para `apps/web/src/styles/tokens.css`: escalas e paleta no `@theme` do Tailwind
 * (classes como `bg-brand-600`, `text-ink-600`, `bg-arcano`) e as cores por função como variáveis
 * que mudam com o tema (`bg-canvas`, `text-fg-muted`, `border-line-strong`…).
 */
export function renderCss(): string {
  const lines: string[] = [
    '/*',
    ' * Design tokens do ArcanaKin. GERADO por packages/tokens — não edite à mão.',
    ' * Para mudar: edite packages/tokens/src/index.ts e rode `pnpm --filter @boramarcar/tokens build:css`.',
    ' */',
    '',
    '@theme {',
    '  /* Paleta da marca */',
    ...Object.entries(palette).map(([name, value]) => `  --color-${name}: ${value};`),
    '',
    '  /* Escalas */',
  ];
  for (const [name, scale] of Object.entries(scales)) {
    for (const [step, value] of Object.entries(scale)) {
      lines.push(`  --color-${name}-${step}: ${value};`);
    }
  }
  lines.push('', '  /* Cores por função (mudam com o tema) */');
  for (const name of Object.keys(themes.light)) {
    lines.push(`  --color-${kebab(name)}: var(--ak-${kebab(name)});`);
  }
  lines.push(
    '}',
    '',
    ':root {',
    themeVars(themes.light, '  '),
    '}',
    '',
    '/* Tema escuro: pelo sistema (sem escolha) ou escolhido em Configurações. */',
    '@media (prefers-color-scheme: dark) {',
    "  :root:not([data-theme='light']) {",
    themeVars(themes.dark, '    '),
    '  }',
    '}',
    ":root[data-theme='dark'] {",
    themeVars(themes.dark, '  '),
    '}',
    '',
  );
  return lines.join('\n');
}
