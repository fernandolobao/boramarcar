import type { Member } from '@boramarcar/api-client';
import { Stack, router } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, ScrollView, Share, View } from 'react-native';
import { ConfirmButton } from '@/components/confirm-button';
import { GroupSettingsCard, SeasonsCard } from '@/components/group-settings';
import { TextField } from '@/components/fields';
import { NoGroup } from '@/components/no-group';
import { AppText, Button, Card, ErrorState, Loading, styles } from '@/components/ui';
import { api } from '@/lib/api';
import { authClient } from '@/lib/auth';
import { API_URL } from '@/lib/config';
import { useGroup } from '@/lib/group';
import { t, type MessageKey } from '@/lib/i18n';
import { useAsync } from '@/lib/use-async';

type Role = Member['role'];
const ROLE_LABEL: Record<Role, MessageKey> = {
  owner: 'roleOwner',
  admin: 'roleAdmin',
  member: 'roleMember',
};

/** Link do convite, igual ao do site (`/convite/CODIGO`). */
const inviteUrl = (code: string) => `${API_URL.replace(/\/+$/, '')}/convite/${code}`;

function MemberRow({
  groupId,
  member,
  actorId,
  actorRole,
  memberCount,
  onChanged,
}: {
  groupId: string;
  member: Member;
  actorId: string;
  actorRole: Role;
  memberCount: number;
  onChanged: (left?: boolean) => Promise<void>;
}) {
  const isSelf = member.userId === actorId;
  // Mesmas regras do site (member-actions.tsx): o servidor confere de novo.
  const canPromote = !isSelf && actorRole !== 'member' && member.role === 'member';
  const canDemote = !isSelf && actorRole === 'owner' && member.role === 'admin';
  const canRemove =
    !isSelf && (actorRole === 'owner' || (actorRole === 'admin' && member.role === 'member'));
  const canTransfer = !isSelf && actorRole === 'owner';
  const ownerMustTransfer = isSelf && actorRole === 'owner' && memberCount > 1;
  const [error, setError] = useState('');
  const run = async (action: () => Promise<unknown>, left = false) => {
    setError('');
    try {
      await action();
      await onChanged(left);
    } catch {
      setError(t('loadError'));
    }
  };

  return (
    <View style={{ gap: 8, paddingVertical: 8 }}>
      <Button
        label={`${member.name}${isSelf ? ` (${t('groupYou')})` : ''}`}
        variant="secondary"
        accessibilityLabel={t('profileOpen', { name: member.name })}
        onPress={() => router.push({ pathname: '/jogadores/[id]', params: { id: member.userId } })}
      />
      <AppText muted>{t(ROLE_LABEL[member.role])}</AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {(canPromote || canDemote) && (
          <Button
            label={t(canPromote ? 'groupMakeAdmin' : 'groupRemoveAdmin')}
            variant="secondary"
            accessibilityLabel={`${t(canPromote ? 'groupMakeAdmin' : 'groupRemoveAdmin')}: ${member.name}`}
            onPress={() =>
              void run(() =>
                api.groups.setRole(groupId, member.userId, canPromote ? 'admin' : 'member'),
              )
            }
          />
        )}
        {canTransfer && (
          <ConfirmButton
            label={t('groupTransfer')}
            confirmLabel={t('groupConfirmTransfer')}
            context={member.name}
            onConfirm={() => run(() => api.groups.transfer(groupId, member.userId))}
          />
        )}
        {canRemove && (
          <ConfirmButton
            label={t('groupRemoveMember')}
            confirmLabel={t('groupConfirmRemove')}
            context={member.name}
            onConfirm={() => run(() => api.groups.removeMember(groupId, member.userId))}
          />
        )}
        {isSelf && (
          <ConfirmButton
            label={t('groupLeave')}
            confirmLabel={t('groupConfirmLeave')}
            context={member.name}
            disabled={ownerMustTransfer}
            onConfirm={() => run(() => api.groups.removeMember(groupId, member.userId), true)}
          />
        )}
      </View>
      {isSelf && actorRole === 'owner' && (
        <AppText muted>
          {t(ownerMustTransfer ? 'groupLeaveOwnerHint' : 'groupLeaveLastHint')}
        </AppText>
      )}
      {error && (
        <AppText accessibilityRole="alert" style={{ fontWeight: '600' }}>
          {error}
        </AppText>
      )}
    </View>
  );
}

/** Seu grupo (paridade com /grupo do site): convite, membros e locais do grupo ativo. */
export default function GroupScreen() {
  const { group, groups, loading: loadingGroup, error: groupError, reload } = useGroup();
  const { data: session } = authClient.useSession();
  const members = useAsync(
    () => (group ? api.groups.members(group.id) : Promise.resolve([])),
    [group?.id],
  );
  const locations = useAsync(
    () => (group ? api.locations.list(group.id) : Promise.resolve([])),
    [group?.id],
  );
  const [inviteMessage, setInviteMessage] = useState('');
  const [locationName, setLocationName] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [locationMessage, setLocationMessage] = useState('');
  const [busy, setBusy] = useState(false);

  if (loadingGroup) return <Loading />;
  if (groupError) return <ErrorState error={groupError} onRetry={() => void reload()} />;
  if (!group) return <NoGroup />;
  if (members.error) return <ErrorState error={members.error} onRetry={members.refresh} />;
  const me = session?.user.id ?? '';
  const code = group.inviteCode ?? '';
  const url = inviteUrl(code);
  const canManage = group.role !== 'member';
  const refresh = async () => {
    await Promise.all([members.refresh(), locations.refresh()]);
  };

  const share = () =>
    void Share.share({ message: t('groupInviteText', { group: group.name, url, code }) });
  const regenerate = async () => {
    setInviteMessage('');
    try {
      await api.groups.regenerateInvite(group.id);
      await reload();
      setInviteMessage(t('groupInviteRegenerated'));
    } catch {
      setInviteMessage(t('loadError'));
    }
  };
  const addLocation = async () => {
    const name = locationName.trim();
    if (!name) return setLocationMessage(t('groupInvalid'));
    setBusy(true);
    setLocationMessage('');
    try {
      await api.locations.create(group.id, { name, address: locationAddress.trim() || null });
      setLocationName('');
      setLocationAddress('');
      await locations.refresh();
      setLocationMessage(t('groupLocationAdded'));
    } catch {
      setLocationMessage(t('loadError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 16 }}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl refreshing={members.refreshing} onRefresh={() => void refresh()} />
      }
    >
      <Stack.Screen options={{ title: t('groupTitle') }} />
      <AppText accessibilityRole="header" style={styles.title}>
        {group.name}
      </AppText>

      <Card style={{ gap: 10 }}>
        <AppText accessibilityRole="header" style={{ fontWeight: '700' }}>
          {t('groupInviteTitle')}
        </AppText>
        <AppText muted>{t('groupInviteHint')}</AppText>
        <AppText selectable accessibilityLabel={`${t('groupInviteLink')}: ${url}`}>
          {url}
        </AppText>
        <AppText accessibilityLabel={`${t('groupInviteCode')}: ${code.split('').join(' ')}`}>
          {t('groupInviteCode')}:{' '}
          <AppText style={{ fontWeight: '700', letterSpacing: 2 }}>{code}</AppText>
        </AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Button label={t('groupShareInvite')} onPress={share} />
          {canManage && (
            <ConfirmButton
              label={t('groupRegenerate')}
              confirmLabel={t('groupRegenerateConfirm')}
              context={group.name}
              onConfirm={regenerate}
            />
          )}
        </View>
        <AppText muted accessibilityLiveRegion="polite">
          {inviteMessage}
        </AppText>
      </Card>

      <Card style={{ gap: 4 }}>
        <AppText accessibilityRole="header" style={{ fontWeight: '700' }}>
          {t('groupMembers')} ({members.data?.length ?? 0})
        </AppText>
        {members.loading ? (
          <Loading />
        ) : (
          (members.data ?? []).map((m) => (
            <MemberRow
              key={m.userId}
              groupId={group.id}
              member={m}
              actorId={me}
              actorRole={group.role}
              memberCount={members.data?.length ?? 0}
              onChanged={async (left) => {
                await reload();
                if (left) {
                  if (router.canGoBack()) router.back();
                  return;
                }
                await members.refresh();
              }}
            />
          ))
        )}
      </Card>

      <Card style={{ gap: 10 }}>
        <AppText accessibilityRole="header" style={{ fontWeight: '700' }}>
          {t('groupLocations')}
        </AppText>
        {locations.error ? (
          <ErrorState error={locations.error} onRetry={locations.refresh} />
        ) : (locations.data?.length ?? 0) === 0 ? (
          <AppText muted>{t('groupNoLocations')}</AppText>
        ) : (
          (locations.data ?? []).map((l) => (
            <View
              key={l.id}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}
            >
              <View style={{ flex: 1 }}>
                <AppText style={{ fontWeight: '600' }}>{l.name}</AppText>
                {l.address && <AppText muted>{l.address}</AppText>}
              </View>
              {canManage && (
                <ConfirmButton
                  label={t('groupRemoveLocation')}
                  confirmLabel={t('groupConfirmRemove')}
                  context={l.name}
                  onConfirm={async () => {
                    setLocationMessage('');
                    try {
                      await api.locations.remove(group.id, l.id);
                      await locations.refresh();
                      setLocationMessage(t('groupLocationRemoved', { name: l.name }));
                    } catch {
                      setLocationMessage(t('loadError'));
                    }
                  }}
                />
              )}
            </View>
          ))
        )}
        <TextField
          label={t('groupLocationName')}
          value={locationName}
          onChangeText={setLocationName}
          maxLength={80}
        />
        <TextField
          label={t('groupLocationAddress')}
          value={locationAddress}
          onChangeText={setLocationAddress}
          maxLength={200}
        />
        <Button
          label={busy ? t('groupAddingLocation') : t('groupAddLocation')}
          variant="secondary"
          disabled={busy || !locationName.trim()}
          onPress={() => void addLocation()}
        />
        <AppText muted accessibilityLiveRegion="polite">
          {locationMessage}
        </AppText>
      </Card>

      <GroupSettingsCard groupId={group.id} canManage={canManage} />
      <SeasonsCard groupId={group.id} canManage={canManage} />

      {groups.length > 0 && (
        <Button
          label={t('groupsManage')}
          variant="secondary"
          onPress={() => router.push('/grupos')}
        />
      )}
    </ScrollView>
  );
}
