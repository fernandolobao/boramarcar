import type { GroupSettings, Season } from '@boramarcar/api-client';
import { ApiError } from '@boramarcar/api-client';
import { GAME_FORMATS, type GameFormat } from '@boramarcar/core/games';
import { zonedLocalToUtc } from '@boramarcar/core/time';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { ConfirmButton } from '@/components/confirm-button';
import { TextField } from '@/components/fields';
import { formatLabel } from '@/components/table/labels';
import { AppText, Button, Card, Loading } from '@/components/ui';
import { api } from '@/lib/api';
import { addDays, deviceTimeZone, localDate } from '@/lib/dates';
import { formatDateMedium, t } from '@/lib/i18n';
import { useAsync } from '@/lib/use-async';

const isFormat = (v: string): v is GameFormat => (GAME_FORMATS as readonly string[]).includes(v);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Número com −/+ (sem teclado), com o valor atual no nome acessível. */
function Stepper({
  label,
  value,
  min,
  max,
  step = 1,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  disabled?: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <AppText style={{ flex: 1, fontWeight: '600' }}>{label}</AppText>
      <Button
        label="−"
        variant="secondary"
        accessibilityLabel={t('stepDown', { label, value })}
        disabled={disabled || value - step < min}
        onPress={() => onChange(value - step)}
        style={{ width: 48, paddingHorizontal: 0 }}
      />
      <AppText
        style={{ minWidth: 48, textAlign: 'center', fontSize: 20, fontWeight: '700' }}
        accessibilityLabel={`${label}: ${value}`}
        accessibilityLiveRegion="polite"
      >
        {value}
      </AppText>
      <Button
        label="+"
        variant="secondary"
        accessibilityLabel={t('stepUp', { label, value })}
        disabled={disabled || value + step > max}
        onPress={() => onChange(value + step)}
        style={{ width: 48, paddingHorizontal: 0 }}
      />
    </View>
  );
}

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
      <AppText accessibilityRole="header" style={{ fontWeight: '700' }}>
        {t('groupSettingsTitle')}
      </AppText>
      {!canManage && <AppText muted>{t('groupSettingsReadOnly')}</AppText>}
      <Stepper
        label={t('groupSettingsTableSize')}
        value={form.tableSize}
        min={2}
        max={8}
        disabled={!canManage}
        onChange={(v) => set('tableSize', v)}
      />
      <AppText muted>{t('groupSettingsTableSizeHint')}</AppText>
      <Stepper
        label={t('groupSettingsMinDuration')}
        value={form.minDurationMinutes}
        min={30}
        max={720}
        step={30}
        disabled={!canManage}
        onChange={(v) => set('minDurationMinutes', v)}
      />
      <View style={{ gap: 6 }}>
        <AppText style={{ fontWeight: '600' }}>{t('groupSettingsDefaultFormat')}</AppText>
        <View
          style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
          accessibilityRole="radiogroup"
          accessibilityLabel={t('groupSettingsDefaultFormat')}
        >
          {GAME_FORMATS.map((f) => (
            <Button
              key={f}
              label={formatLabel(f)}
              variant="secondary"
              accessibilityRole="radio"
              accessibilityState={{ checked: form.defaultFormat === f, disabled: !canManage }}
              selected={form.defaultFormat === f}
              disabled={!canManage}
              onPress={() => set('defaultFormat', f)}
            />
          ))}
        </View>
      </View>
      <AppText style={{ fontWeight: '600' }}>{t('groupSettingsPoints')}</AppText>
      <AppText muted>{t('groupSettingsPointsHint')}</AppText>
      <Stepper
        label={t('groupSettingsPointsWin')}
        value={form.pointsWin}
        min={0}
        max={20}
        disabled={!canManage}
        onChange={(v) => set('pointsWin', v)}
      />
      <Stepper
        label={t('groupSettingsPointsDraw')}
        value={form.pointsDraw}
        min={0}
        max={20}
        disabled={!canManage}
        onChange={(v) => set('pointsDraw', v)}
      />
      <Stepper
        label={t('groupSettingsPointsLoss')}
        value={form.pointsLoss}
        min={-20}
        max={20}
        disabled={!canManage}
        onChange={(v) => set('pointsLoss', v)}
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
      <AppText accessibilityRole="header" style={{ fontWeight: '700' }}>
        {t('seasonsTitle')}
      </AppText>
      <AppText muted>{t('seasonsHint')}</AppText>
      {seasons.loading ? (
        <Loading />
      ) : (seasons.data?.length ?? 0) === 0 ? (
        <AppText muted>{t('seasonsEmpty')}</AppText>
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
          <TextField
            label={t('seasonStart')}
            hint={t('seasonDateHint')}
            value={start}
            onChangeText={setStart}
            autoCorrect={false}
            keyboardType="numbers-and-punctuation"
          />
          <TextField
            label={t('seasonEnd')}
            hint={t('seasonDateHint')}
            value={end}
            onChangeText={setEnd}
            autoCorrect={false}
            keyboardType="numbers-and-punctuation"
          />
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
