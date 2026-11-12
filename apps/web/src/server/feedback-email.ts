import 'server-only';
import { escapeHtml, type EmailMessage } from '@boramarcar/core/email';
import { adminEmails } from '@/env';
import ptBR from '../../messages/pt-BR.json';
import { deliverEmails } from './email';

const KINDS = ptBR.feedback.kinds;

/** Avisa quem administra o projeto de um feedback novo (o texto vai escapado no HTML). */
export async function emailFeedback(input: {
  kind: keyof typeof KINDS;
  message: string;
  page: string | null;
  platform: string;
  from: { name: string; email: string };
}) {
  const to = adminEmails();
  if (to.length === 0) return [];
  const kind = KINDS[input.kind];
  const lines = [
    `${kind} — ${input.from.name} <${input.from.email}>`,
    `Plataforma: ${input.platform}${input.page ? ` · Página: ${input.page}` : ''}`,
    '',
    input.message,
  ];
  const messages: EmailMessage[] = to.map((address) => ({
    to: address,
    subject: `Feedback (${kind}): ${input.from.name}`,
    text: lines.join('\n'),
    html: `<div style="font-family:system-ui,sans-serif;line-height:1.5">${lines
      .map((line) => (line ? `<p style="margin:0 0 8px">${escapeHtml(line)}</p>` : ''))
      .join('')}</div>`,
  }));
  return deliverEmails(messages);
}
