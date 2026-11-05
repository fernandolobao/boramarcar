import { describe, expect, it } from 'vitest';
import { inviteQrCode, inviteUrl } from './invite';

describe('convite', () => {
  it('gera link e QR Code (SVG e PNG)', async () => {
    const url = inviteUrl('ABCD2345');
    expect(url).toBe('http://localhost:3000/convite/ABCD2345');
    const qr = await inviteQrCode(url);
    expect(qr.svg).toMatch(/^<svg[^>]*viewBox/);
    expect(qr.png).toMatch(/^data:image\/png;base64,/);
  });
});
