import { DomainError } from '../errors';
import type { FetchLike } from '../decks/types';

export interface EmailAttachment {
  filename: string;
  /** Conteúdo em texto (ex.: .ics); é enviado em base64. */
  content: string;
  contentType?: string;
}

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: EmailAttachment[];
}

export interface EmailSenderOptions {
  apiKey: string;
  from: string;
  fetch: FetchLike;
}

export interface SendResult {
  to: string;
  ok: boolean;
  id?: string;
  error?: string;
}

const toBase64 = (value: string) => {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
};

/**
 * Envia e-mails pela API do Resend (POST /emails), um por destinatário — assim um endereço
 * recusado não derruba os outros e cada pessoa recebe a mensagem no próprio idioma/fuso.
 */
export async function sendEmails(
  messages: readonly EmailMessage[],
  options: EmailSenderOptions,
): Promise<SendResult[]> {
  const results: SendResult[] = [];
  for (const message of messages) {
    try {
      const response = await options.fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${options.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: options.from,
          to: [message.to],
          subject: message.subject,
          html: message.html,
          text: message.text,
          attachments: message.attachments?.map((a) => ({
            filename: a.filename,
            content: toBase64(a.content),
            content_type: a.contentType,
          })),
        }),
      });
      const body = (await response.json().catch(() => ({}))) as { id?: string; message?: string };
      results.push(
        response.ok
          ? { to: message.to, ok: true, id: body.id }
          : { to: message.to, ok: false, error: `${response.status}: ${body.message ?? 'erro'}` },
      );
    } catch (error) {
      results.push({ to: message.to, ok: false, error: String(error) });
    }
  }
  return results;
}

/** Escapa texto para inserir em HTML de e-mail. */
export const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );

export function assertEmailConfig(apiKey: string | undefined): asserts apiKey is string {
  if (!apiKey) throw new DomainError('upstream_error', 'RESEND_API_KEY não configurada');
}
