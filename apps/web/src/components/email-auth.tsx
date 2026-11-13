'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { authClient } from '@/lib/auth-client';
import { Icon } from './icons';

const withNext = (path: string, next: string) =>
  next === '/painel' ? path : `${path}?para=${encodeURIComponent(next)}`;

function Field({
  id,
  label,
  hint,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { id: string; label: string; hint?: string }) {
  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="input"
        aria-describedby={hint ? `${id}-hint` : undefined}
        {...props}
      />
      {hint && (
        <p id={`${id}-hint`} className="muted mt-1 text-sm">
          {hint}
        </p>
      )}
    </div>
  );
}

/** Mensagem de resultado: erro em `role="alert"`, sucesso em `role="status"` (com foco). */
function Result({ kind, children }: { kind: 'error' | 'ok'; children: ReactNode }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => ref.current?.focus(), [children]);
  return (
    <p
      ref={ref}
      tabIndex={-1}
      role={kind === 'error' ? 'alert' : 'status'}
      className={`text-sm font-medium focus:outline-none ${kind === 'error' ? 'text-danger' : 'text-success'}`}
    >
      {children}
    </p>
  );
}

function useAuthErrors() {
  const t = useTranslations('auth');
  return (code?: string, status?: number) => {
    switch (code) {
      case 'INVALID_EMAIL_OR_PASSWORD':
        return t('errors.invalid');
      case 'EMAIL_NOT_VERIFIED':
        return t('errors.notVerified');
      case 'USER_ALREADY_EXISTS':
      case 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL':
        return t('errors.exists');
      case 'PASSWORD_TOO_SHORT':
        return t('errors.short');
      case 'PASSWORD_TOO_LONG':
        return t('errors.long');
      case 'INVALID_EMAIL':
        return t('errors.email');
      case 'INVALID_TOKEN':
        return t('errors.token');
      default:
        return status === 429 ? t('errors.rateLimited') : t('errors.generic');
    }
  };
}

/** Entrar com e-mail e senha. */
export function SignInForm({ next }: { next: string }) {
  const t = useTranslations('auth');
  const id = useId();
  const router = useRouter();
  const message = useAuthErrors();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="space-y-4"
      aria-label={t('signInTitle')}
      onSubmit={async (e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        setPending(true);
        setError(null);
        const { error } = await authClient.signIn.email({
          email: String(form.get('email')),
          password: String(form.get('password')),
          callbackURL: next,
        });
        setPending(false);
        if (error) return setError(message(error.code, error.status));
        router.push(next);
        router.refresh();
      }}
    >
      <Field
        id={`${id}-email`}
        name="email"
        type="email"
        autoComplete="email"
        required
        label={t('email')}
      />
      <Field
        id={`${id}-password`}
        name="password"
        type="password"
        autoComplete="current-password"
        required
        label={t('password')}
      />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn-primary" disabled={pending}>
          <Icon name="signIn" />
          {pending ? t('signingIn') : t('signInEmail')}
        </button>
        <Link href="/esqueci-senha" className="text-link text-sm underline underline-offset-2">
          {t('forgot')}
        </Link>
      </div>
      {error && <Result kind="error">{error}</Result>}
      <p className="muted text-sm">
        {t('noAccount')}{' '}
        <Link href={withNext('/cadastro', next)} className="text-link underline underline-offset-2">
          {t('createAccount')}
        </Link>
      </p>
    </form>
  );
}

/** Criar conta com e-mail e senha (o e-mail precisa ser confirmado antes de entrar). */
export function SignUpForm({ next }: { next: string }) {
  const t = useTranslations('auth');
  const id = useId();
  const message = useAuthErrors();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  if (sentTo) return <Result kind="ok">{t('checkInbox', { email: sentTo })}</Result>;
  return (
    <form
      className="space-y-4"
      aria-label={t('signUpTitle')}
      onSubmit={async (e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        const email = String(form.get('email')).trim();
        setPending(true);
        setError(null);
        const { error } = await authClient.signUp.email({
          name: String(form.get('name')).trim(),
          email,
          password: String(form.get('password')),
          callbackURL: next,
        });
        setPending(false);
        if (error) return setError(message(error.code, error.status));
        setSentTo(email);
      }}
    >
      <Field
        id={`${id}-name`}
        name="name"
        autoComplete="name"
        required
        maxLength={80}
        label={t('name')}
      />
      <Field
        id={`${id}-email`}
        name="email"
        type="email"
        autoComplete="email"
        required
        label={t('email')}
      />
      <Field
        id={`${id}-password`}
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        maxLength={128}
        label={t('password')}
        hint={t('passwordHint')}
      />
      <button type="submit" className="btn-primary" disabled={pending}>
        <Icon name="join" />
        {pending ? t('creating') : t('createAccount')}
      </button>
      {error && <Result kind="error">{error}</Result>}
      <p className="muted text-sm">
        {t('hasAccount')}{' '}
        <Link href={withNext('/entrar', next)} className="text-link underline underline-offset-2">
          {t('signInLink')}
        </Link>
      </p>
    </form>
  );
}

/** "Esqueci a senha": manda o link (a resposta é a mesma exista ou não a conta). */
export function ForgotPasswordForm() {
  const t = useTranslations('auth');
  const id = useId();
  const message = useAuthErrors();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  if (sent) return <Result kind="ok">{t('resetSent')}</Result>;
  return (
    <form
      className="space-y-4"
      aria-label={t('forgotTitle')}
      onSubmit={async (e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        setPending(true);
        setError(null);
        const { error } = await authClient.requestPasswordReset({
          email: String(form.get('email')).trim(),
          redirectTo: '/redefinir-senha',
        });
        setPending(false);
        if (error) return setError(message(error.code, error.status));
        setSent(true);
      }}
    >
      <Field
        id={`${id}-email`}
        name="email"
        type="email"
        autoComplete="email"
        required
        label={t('email')}
      />
      <button type="submit" className="btn-primary" disabled={pending}>
        <Icon name="email" />
        {pending ? t('sending') : t('sendReset')}
      </button>
      {error && <Result kind="error">{error}</Result>}
    </form>
  );
}

/** Nova senha a partir do link do e-mail. */
export function ResetPasswordForm({ token }: { token: string | null }) {
  const t = useTranslations('auth');
  const id = useId();
  const message = useAuthErrors();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(token ? null : t('errors.token'));
  const [done, setDone] = useState(false);
  if (done)
    return (
      <div className="space-y-3">
        <Result kind="ok">{t('resetDone')}</Result>
        <Link href="/entrar" className="btn-primary">
          {t('signInLink')}
        </Link>
      </div>
    );
  return (
    <form
      className="space-y-4"
      aria-label={t('resetTitle')}
      onSubmit={async (e) => {
        e.preventDefault();
        if (!token) return;
        const form = new FormData(e.currentTarget);
        setPending(true);
        setError(null);
        const { error } = await authClient.resetPassword({
          newPassword: String(form.get('password')),
          token,
        });
        setPending(false);
        if (error) return setError(message(error.code, error.status));
        setDone(true);
      }}
    >
      <Field
        id={`${id}-password`}
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        maxLength={128}
        label={t('newPassword')}
        hint={t('passwordHint')}
      />
      <button type="submit" className="btn-primary" disabled={pending || !token}>
        <Icon name="save" />
        {pending ? t('saving') : t('saveNewPassword')}
      </button>
      {error && <Result kind="error">{error}</Result>}
      {!token && (
        <Link href="/esqueci-senha" className="text-link text-sm underline underline-offset-2">
          {t('forgot')}
        </Link>
      )}
    </form>
  );
}
