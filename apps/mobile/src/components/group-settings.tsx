import type { GroupSettings, Season } from '@boramarcar/api-client';
import { ApiError } from '@boramarcar/api-client';
import { GAME_FORMATS, type GameFormat } from '@boramarcar/core/games';
import { zonedLocalToUtc } from '@boramarcar/core/time';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { ConfirmButton } from '@/components/confirm-button';
import { TextField } from '@/components/fields';
import { formatLabel } from '@/components/table/labels';
import { AppText, Button, Card, Loading, styles } from '@/components/ui';
import { api } from '@/lib/api';
import { addDays, deviceTimeZone, localDate } from '@/lib/dates';
import { formatDateMedium, t } from '@/lib/i18n';
import { useAsync } from '@/lib/use-async';
import { NumberField } from '@/components/ds/number-field';
import { DateField } from '@/components/ds/date-field';
import { Select } from '@/components/ds/select';
import { EmptyState } from '@/components/empty-state';

const isFormat = (v: string): v is GameFormat => (GAME_FORMATS as readonly string[]).includes(v);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Configurações do grupo (paridade com o site): mesa, duração mínima, pontos e tipo de jogo padrão. */
export function GroupSettingsCard({ groupId, canManage }: { groupId: string; canManage: boolean }) {
  const settings = useAsync(() => api.groups.settings(groupId), [groupId]);
  const [form, setForm] = useState<GroupSettings | null>(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (settings.data) setForm(settings.data);
  }, [settings.data]);
  if (settings.loading || !form) return <Loading />;
  if (settings.error) return null;
  const saved = settings.data!;
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  const pointsOk = form.pointsWin > form.pointsDraw && form.pointsDraw >= form.pointsLoss;
  const set = <K extends keyof GroupSettings>(key: K, value: GroupSettings[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  return (
    <Card style={{ gap: 12 }}>
      <AppText accessibilityRole="header" style={styles.sectionTitle}>
        {t('groupSettingsTitle')}
      </AppText>
      {!canManage && <AppText muted>{t('groupSettingsReadOnly')}</AppText>}
      <NumberField
        label={t('groupSettingsTableSize')}
        value={form.tableSize}
        min={2}
        max={8}
        disabled={!canManage}
        onChange={(v) => v !== null && set('tableSize', v)}
      />
      <AppText muted>{t('groupSettingsTableSizeHint')}</AppText>
      <NumberField
        label={t('groupSettingsMinDuration')}
        value={form.minDurationMinutes}
        min={30}
        max={720}
        step={30}
        disabled={!canManage}
        onChange={(v) => v !== null && set('minDurationMinutes', v)}
      />
      <Select
        label={t('groupSettingsDefaultFormat')}
        value={isFormat(form.defaultFormat) ? form.defaultFormat : null}
        disabled={!canManage}
        onChange={(f) => set('defaultFormat', f)}
        options={GAME_FORMATS.map((f) => ({ value: f, label: formatLabel(f) }))}
      />
      <AppText style={{ fontWeight: '600' }}>{t('groupSettingsPoints')}</AppText>
      <AppText muted>{t('groupSettingsPointsHint')}</AppText>
      <NumberField
        label={t('groupSettingsPointsWin')}
        value={form.pointsWin}
        min={0}
        max={20}
        disabled={!canManage}
        onChange={(v) => v !== null && set('pointsWin', v)}
      />
      <NumberField
        label={t('groupSettingsPointsDraw')}
        value={form.pointsDraw}
        min={0}
        max={20}
        disabled={!canManage}
        onChange={(v) => v !== null && set('pointsDraw', v)}
      />
      <NumberField
        label={t('groupSettingsPointsLoss')}
        value={form.pointsLoss}
        min={-20}
        max={20}
        disabled={!canManage}
        onChange={(v) => v !== null && set('pointsLoss', v)}
      />
      {canManage && (
        <Button
          label={saving ? t('settingsSaving') : t('settingsSave')}
          disabled={saving || !dirty || !pointsOk}
          onPress={async () => {
            setSaving(true);
            setMessage('');
            try {
              const next = await api.groups.updateSettings(groupId, {
                ...form,
                defaultFormat: isFormat(form.defaultFormat) ? form.defaultFormat : 'commander',
              });
              settings.setData(next);
              setMessage(t('groupSettingsSaved'));
            } catch (e) {
              setMessage(e instanceof ApiError ? e.message : t('loadError'));
            } finally {
              setSaving(false);
            }
          }}
        />
      )}
      <AppText muted accessibilityLiveRegion="polite">
        {message}
      </AppText>
    </Card>
  );
}

/** Temporadas do ranking: lista (com remover) e criar, com datas digitadas (AAAA-MM-DD). */
export function SeasonsCard({ groupId, canManage }: { groupId: string; canManage: boolean }) {
  const timeZone = deviceTimeZone();
  const seasons = useAsync(() => api.seasons.list(groupId), [groupId]);
  const today = localDate(new Date(), timeZone);
  const [name, setName] = useState('');
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(addDays(today, 90));
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const valid = name.trim().length >= 2 && DATE_RE.test(start) && DATE_RE.test(end) && start <= end;

  const create = async () => {
    setBusy(true);
    setMessage('');
    try {
      await api.seasons.create(groupId, {
        name: name.trim(),
        startsAt: zonedLocalToUtc(`${start}T00:00`, timeZone),
        // Fim exclusivo: o dia seguinte ao último dia, 00:00.
        endsAt: zonedLocalToUtc(`${addDays(end, 1)}T00:00`, timeZone),
      });
      setName('');
      await seasons.refresh();
      setMessage(t('seasonCreated'));
    } catch (e) {
      setMessage(e instanceof ApiError ? e.message : t('loadError'));
    } finally {
      setBusy(false);
    }
  };
  const range = (s: Season) =>
    t('seasonRange', {
      start: formatDateMedium(s.startsAt),
      end: formatDateMedium(new Date(s.endsAt.getTime() - 1)),
    });

  return (
    <Card style={{ gap: 10 }}>
      <AppText accessibilityRole="header" style={styles.sectionTitle}>
        {t('seasonsTitle')}
      </AppText>
      <AppText muted>{t('seasonsHint')}</AppText>
      {seasons.loading ? (
        <Loading />
      ) : (seasons.data?.length ?? 0) === 0 ? (
        <EmptyState>{t('seasonsEmpty')}</EmptyState>
      ) : (
        (seasons.data ?? []).map((s) => (
          <View key={s.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <AppText style={{ fontWeight: '600' }}>{s.name}</AppText>
              <AppText muted>{range(s)}</AppText>
            </View>
            {canManage && (
              <ConfirmButton
                label={t('seasonRemove')}
                confirmLabel={t('groupConfirmRemove')}
                context={s.name}
                onConfirm={async () => {
                  try {
                    await api.seasons.remove(s.id);
                    await seasons.refresh();
                    setMessage(t('seasonRemoved', { name: s.name }));
                  } catch {
                    setMessage(t('loadError'));
                  }
                }}
              />
            )}
          </View>
        ))
      )}
      {canManage && (
        <>
          <TextField label={t('seasonName')} value={name} onChangeText={setName} maxLength={60} />
          <DateField label={t('seasonStart')} value={start} onChange={setStart} />
          <DateField label={t('seasonEnd')} value={end} onChange={setEnd} min={start} />
          <Button
            label={busy ? t('settingsSaving') : t('seasonCreate')}
            variant="secondary"
            disabled={busy || !valid}
            onPress={() => void create()}
          />
        </>
      )}
      <AppText muted accessibilityLiveRegion="polite">
        {message}
      </AppText>
    </Card>
  );
}
