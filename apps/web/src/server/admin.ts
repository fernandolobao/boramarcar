import 'server-only';
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
