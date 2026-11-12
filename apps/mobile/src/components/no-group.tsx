import { ApiError } from '@boramarcar/api-client';
import { useState } from 'react';
import { ScrollView } from 'react-native';
import { TextField } from '@/components/fields';
import { AppText, Button, Card, styles } from '@/components/ui';
import { useGroup } from '@/lib/group';
import { t } from '@/lib/i18n';
import { useColors } from '@/lib/theme';

/** Mensagem de erro de entrar/criar grupo (código inválido, limite, sem conexão). */
function errorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.code === 'not_found') return t('groupJoinNotFound');
    if (error.code === 'rate_limited') return t('groupRateLimited');
    if (error.code === 'invalid_input') return t('groupInvalid');
  }
  return t('loadError');
}

/**
 * Sem grupo ainda: entrar pelo código do convite (quem recebeu o link) ou criar um grupo
 * (quem organiza). O grupo novo vira o ativo.
 */
export function NoGroup({
  initialCode = '',
  onDone,
}: {
  initialCode?: string;
  /** Chamado depois de entrar ou criar (ex.: voltar da tela de grupos). */
  onDone?: () => void;
}) {
  const colors = useColors();
  const { join, create } = useGroup();
  const [code, setCode] = useState(initialCode);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState<'join' | 'create' | null>(null);
  const [error, setError] = useState<{ form: 'join' | 'create'; message: string } | null>(null);

  const run = async (form: 'join' | 'create') => {
    setBusy(form);
    setError(null);
    try {
      await (form === 'join' ? join(code) : create(name));
      onDone?.();
    } catch (e) {
      setError({ form, message: errorMessage(e) });
    } finally {
      setBusy(null);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <AppText accessibilityRole="header" style={styles.title}>
        {t('noGroupTitle')}
      </AppText>
      <AppText muted>{t('noGroupIntro')}</AppText>
      <Card style={{ gap: 12 }}>
        <AppText accessibilityRole="header" style={{ fontWeight: '700' }}>
          {t('groupJoinTitle')}
        </AppText>
        <TextField
          label={t('groupJoinCode')}
          hint={t('groupJoinHint')}
          value={code}
          onChangeText={setCode}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={16}
        />
        <Button
          label={busy === 'join' ? t('groupJoining') : t('groupJoin')}
          disabled={busy !== null || code.trim().length < 4}
          onPress={() => void run('join')}
        />
        {error?.form === 'join' && (
          <AppText accessibilityRole="alert" style={{ color: colors.danger }}>
            {error.message}
          </AppText>
        )}
      </Card>
      <Card style={{ gap: 12 }}>
        <AppText accessibilityRole="header" style={{ fontWeight: '700' }}>
          {t('groupCreateTitle')}
        </AppText>
        <TextField
          label={t('groupCreateName')}
          hint={t('groupCreateHint')}
          value={name}
          onChangeText={setName}
          maxLength={80}
        />
        <Button
          label={busy === 'create' ? t('groupCreating') : t('groupCreate')}
          variant="secondary"
          disabled={busy !== null || name.trim().length < 2}
          onPress={() => void run('create')}
        />
        {error?.form === 'create' && (
          <AppText accessibilityRole="alert" style={{ color: colors.danger }}>
            {error.message}
          </AppText>
        )}
      </Card>
    </ScrollView>
  );
}
