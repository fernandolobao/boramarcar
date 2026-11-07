/** Gera apps/web/src/styles/tokens.css a partir dos tokens (rodar depois de mudar src/index.ts). */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderCss } from '../src/index.ts';

const target = fileURLToPath(new URL('../../../apps/web/src/styles/tokens.css', import.meta.url));
writeFileSync(target, renderCss());
process.stdout.write(`tokens.css atualizado: ${target}\n`);
