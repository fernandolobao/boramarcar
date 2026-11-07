'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { api } from '@/lib/api';
import { Icon, type IconName } from './icons';
import { FormError, useApiAction } from './use-api-action';

type Role = 'owner' | 'admin' | 'member';

interface Props {
  groupId: string;
  actorId: string;
  actorRole: Role;
  member: { userId: string; name: string; role: Role };
  memberCount: number;
}

/** Botão destrutivo com confirmação em dois cliques (padrão do projeto). */
function ConfirmButton({
  label,
  confirmLabel,
  contextName,
  onConfirm,
  disabled,
  icon,
}: {
  icon: IconName;
  label: string;
  confirmLabel: string;
  contextName: string;
  onConfirm: () => void;
  disabled?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  return (
    <button
      type="button"
      className={confirming ? 'btn-danger border border-red-300 dark:border-red-800' : 'btn-danger'}
      disabled={disabled}
      onBlur={() => setConfirming(false)}
      onClick={() => {
        if (!confirming) return setConfirming(true);
        setConfirming(false);
        onConfirm();
      }}
    >
      <Icon name={icon} />
      {confirming ? confirmLabel : label}
      <span className="sr-only"> ({contextName})</span>
    </button>
  );
}

/** Ações sobre um membro, conforme o papel de quem está vendo. */
export function MemberActions({ groupId, actorId, actorRole, member, memberCount }: Props) {
  const t = useTranslations('group');
  const router = useRouter();
  const { run, error, pending } = useApiAction();
  const isSelf = member.userId === actorId;
  const base = `/api/v1/groups/${groupId}`;

  const canPromote = !isSelf && actorRole !== 'member' && member.role === 'member';
  const canDemote = !isSelf && actorRole === 'owner' && member.role === 'admin';
  const canRemove =
    !isSelf && (actorRole === 'owner' || (actorRole === 'admin' && member.role === 'member'));
  const canTransfer = !isSelf && actorRole === 'owner';
  const ownerMustTransfer = isSelf && actorRole === 'owner' && memberCount > 1;

  const actions = [];
  if (canPromote || canDemote) {
    actions.push(
      <button
        key="role"
        type="button"
        className="btn-secondary"
        disabled={pending}
        onClick={() =>
          void run(() =>
            api(`${base}/members/${member.userId}`, {
              method: 'PATCH',
              body: { role: canPromote ? 'admin' : 'member' },
            }),
          )
        }
      >
        <Icon name={canPromote ? 'makeAdmin' : 'removeAdmin'} />
        {canPromote ? t('makeAdmin') : t('removeAdmin')}
        <span className="sr-only"> ({member.name})</span>
      </button>,
    );
  }
  if (canTransfer) {
    actions.push(
      <ConfirmButton
        key="transfer"
        icon="transfer"
        label={t('transfer')}
        confirmLabel={t('confirmTransfer')}
        contextName={member.name}
        disabled={pending}
        onConfirm={() =>
          void run(() =>
            api(`${base}/transfer`, { method: 'POST', body: { userId: member.userId } }),
          )
        }
      />,
    );
  }
  if (canRemove) {
    actions.push(
      <ConfirmButton
        key="remove"
        icon="removeMember"
        label={t('removeMember')}
        confirmLabel={t('confirmRemove')}
        contextName={member.name}
        disabled={pending}
        onConfirm={() =>
          void run(() => api(`${base}/members/${member.userId}`, { method: 'DELETE' }))
        }
      />,
    );
  }
  if (isSelf) {
    actions.push(
      <ConfirmButton
        key="leave"
        icon="leave"
        label={t('leave')}
        confirmLabel={t('confirmLeave')}
        contextName={member.name}
        disabled={pending || ownerMustTransfer}
        onConfirm={() =>
          void run(
            () => api(`${base}/members/${member.userId}`, { method: 'DELETE' }),
            () => router.push('/grupo'),
          )
        }
      />,
    );
  }

  if (!actions.length) return null;
  return (
    <ManagePanel name={member.name}>
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label={t('memberActions', { name: member.name })}
      >
        {actions}
      </div>
      {isSelf && actorRole === 'owner' && (
        <p className="muted mt-2 text-sm">
          {ownerMustTransfer ? t('leaveOwnerHint') : t('leaveLastHint')}
        </p>
      )}
      <FormError message={error} />
    </ManagePanel>
  );
}

/**
 * "Gerenciar" abre as ações do membro numa linha própria, abaixo do nome — assim os botões
 * não disputam espaço com o nome em telas estreitas nem em idiomas com textos longos.
 */
function ManagePanel({ name, children }: { name: string; children: React.ReactNode }) {
  const t = useTranslations('group');
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <>
      <button
        type="button"
        className="btn-secondary shrink-0 px-3 py-1.5 text-sm"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="settings" />
        {t('manage')}
        <span className="sr-only"> ({name})</span>
        <Icon
          name="chevronDown"
          className={`size-4 shrink-0 transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        id={id}
        hidden={!open}
        className="basis-full rounded-xl bg-ink-50 p-3 dark:bg-ink-800/60"
      >
        {children}
      </div>
    </>
  );
}
