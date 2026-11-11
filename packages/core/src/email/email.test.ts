import { describe, expect, it, vi } from 'vitest';
import { escapeHtml, sendEmails } from './index';

describe('sendEmails', () => {
  it('envia um e-mail por destinatário, com anexo em base64, e isola falhas', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ id: 'e1' }))
      .mockResolvedValueOnce(
        Response.json(
          { message: 'You can only send testing emails to your own email address' },
          { status: 403 },
        ),
      )
      .mockRejectedValueOnce(new TypeError('network'));
    const results = await sendEmails(
      [
        {
          to: 'a@x.com',
          subject: 'Oi',
          html: '<p>Oi</p>',
          text: 'Oi',
          attachments: [
            { filename: 'e.ics', content: 'BEGIN:VCALENDAR ç', contentType: 'text/calendar' },
          ],
        },
        { to: 'b@x.com', subject: 'Oi', html: '<p>Oi</p>', text: 'Oi' },
        { to: 'c@x.com', subject: 'Oi', html: '<p>Oi</p>', text: 'Oi' },
      ],
      { apiKey: 're_test', from: 'ArcanaKin <onboarding@resend.dev>', fetch: fetchMock },
    );
    expect(results).toEqual([
      { to: 'a@x.com', ok: true, id: 'e1' },
      {
        to: 'b@x.com',
        ok: false,
        error: '403: You can only send testing emails to your own email address',
      },
      { to: 'c@x.com', ok: false, error: 'DomainError: Resend indisponível' },
    ]);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer re_test' });
    const body = JSON.parse(String(init.body));
    expect(body).toMatchObject({
      from: 'ArcanaKin <onboarding@resend.dev>',
      to: ['a@x.com'],
      subject: 'Oi',
    });
    expect(
      new TextDecoder().decode(
        Uint8Array.from(atob(body.attachments[0].content), (c) => c.charCodeAt(0)),
      ),
    ).toBe('BEGIN:VCALENDAR ç');
  });

  it('escapa HTML', () => {
    expect(escapeHtml(`<b>"Ana" & 'Bia'</b>`)).toBe(
      '&lt;b&gt;&quot;Ana&quot; &amp; &#39;Bia&#39;&lt;/b&gt;',
    );
  });
});
