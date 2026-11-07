import { palette } from '@boramarcar/tokens';
import 'server-only';
import QRCode from 'qrcode';
import { getBaseUrl } from '@/env';

export const inviteUrl = (inviteCode: string) => `${getBaseUrl()}/convite/${inviteCode}`;

/** QR Code do link de convite em SVG (para exibir) e PNG (para baixar e imprimir). */
export async function inviteQrCode(url: string) {
  const options = { errorCorrectionLevel: 'M' as const, margin: 2 };
  const [svg, png] = await Promise.all([
    QRCode.toString(url, {
      ...options,
      type: 'svg',
      color: { dark: palette.noite, light: '#ffffff' },
    }),
    QRCode.toDataURL(url, { ...options, width: 1024 }),
  ]);
  return { svg, png };
}
