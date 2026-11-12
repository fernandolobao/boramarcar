import { useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { TextField } from '@/components/fields';
import { AppText, Button, Card } from '@/components/ui';
import { api } from '@/lib/api';
import { t } from '@/lib/i18n';
import { useColors } from '@/lib/theme';

type Kind = 'problem' | 'idea' | 'other';
const KINDS: { kind: Kind; label: () => string }[] = [
  { kind: 'problem', label: () => t('feedbackProblem') },
  { kind: 'idea', label: () => t('feedbackIdea') },
  { kind: 'other', label: () => t('feedbackOther') },
];

/** Feedback do beta (8.4), pela tela Conta. */
export default function FeedbackScreen() {
  const colors = useColors();
  const [kind, setKind] = useState<Kind>('problem');
  const [message, setMessage] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const send = async () => {
    setState('sending');
    try {
      await api.feedback.send({
        kind,
        message,
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
      });
      setMessage('');
      setState('sent');
    } catch {
      setState('error');
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <AppText muted>{t('feedbackIntro')}</AppText>
      <Card>
        <View style={{ gap: 12 }}>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel={t('feedbackKind')}
            style={{ gap: 8 }}
          >
            <AppText style={{ fontWeight: '600' }}>{t('feedbackKind')}</AppText>
            {KINDS.map((k) => (
              <Button
                key={k.kind}
                label={k.label()}
                variant="secondary"
                accessibilityRole="radio"
                accessibilityState={{ checked: kind === k.kind }}
                selected={kind === k.kind}
                onPress={() => setKind(k.kind)}
              />
            ))}
          </View>
          <TextField
            label={t('feedbackMessage')}
            hint={t('feedbackHint')}
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={2000}
            style={{ minHeight: 120, paddingTop: 12, textAlignVertical: 'top' }}
          />
          <AppText muted>{t('feedbackPrivacy')}</AppText>
          <Button
            label={t('feedbackSend')}
            disabled={state === 'sending' || message.trim().length < 3}
            onPress={() => void send()}
          />
          {state === 'sent' && <AppText accessibilityRole="alert">{t('feedbackSent')}</AppText>}
          {state === 'error' && (
            <AppText accessibilityRole="alert" style={{ color: colors.danger }}>
              {t('feedbackError')}
            </AppText>
          )}
        </View>
      </Card>
    </ScrollView>
  );
}
