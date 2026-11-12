import 'server-only';
import { DomainError } from '@boramarcar/core';
import { notFound } from 'next/navigation';
import { adminEmails } from '@/env';
import { requireUser } from './current-user';

/** Quem está em `ADMIN_EMAILS` (dono do projeto). */
export const isAdmin = (email: string) => adminEmails().includes(email.trim().toLowerCase());

/** Páginas de administração: para quem não é admin, a página simplesmente não existe (404). */
export async function requireAdmin() {
  const user = await requireUser();
  if (!isAdmin(user.email)) notFound();
  return user;
}

/** Rotas de administração na API: para quem não é admin, 404 (a rota "não existe"). */
export function assertAdmin(email: string) {
  if (!isAdmin(email)) throw new DomainError('not_found', 'Não encontrado');
}
