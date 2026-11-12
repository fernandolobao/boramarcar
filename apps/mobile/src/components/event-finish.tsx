import type { EventDetail } from '@boramarcar/api-client';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Share, View } from 'react-native';
import { AppText, Button, Card } from '@/components/ui';
import { api } from '@/lib/api';
import { API_URL } from '@/lib/config';
import { t } from '@/lib/i18n';
import { useColors } from '@/lib/theme';

/** Página pública do resumo (só primeiros nomes, comandantes e placar). */
export const recapUrl = (eventId: string) => `${API_URL}/resumo/${eventId}`;

/**
 * Fim do encontro (organizador): finalizar manda o resumo da noite para quem jogou. Pede dois
 * toques, como as ações que não dá para desfazer sem querer.
 */
export function FinishEvent({ event, onDone }: { event: EventDetail; onDone: () => void }) {
  const colors = useColors();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const finish = async () => {
    if (!confirm) return setConfirm(true);
    setBusy(true);
    setError('');
    try {
      await api.events.setStatus(event.id, 'finished');
      onDone();
    } catch {
      setError(t('loadError'));
    } finally {
      setBusy(false);
      setConfirm(false);
    }
  };

  return (
    <Card style={{ gap: 10 }}>
      <AppText accessibilityRole="header" style={{ fontWeight: '700' }}>
        {t('finishTitle')}
      </AppText>
      <AppText muted>{event.games.length ? t('finishHint') : t('finishHintNoGames')}</AppText>
      <Button
        label={busy ? t('finishing') : confirm ? t('finishConfirm') : t('finish')}
        variant={confirm ? 'primary' : 'secondary'}
        disabled={busy}
        onPress={() => void finish()}
      />
      {error ? (
        <AppText accessibilityRole="alert" style={{ color: colors.danger }}>
          {error}
        </AppText>
      ) : null}
    </Card>
  );
}

/** Resumo da noite de um encontro finalizado: destaque e botões para mandar no grupo. */
export function EventRecap({ event }: { event: EventDetail }) {
  const wins = new Map<string, number>();
  for (const game of event.games)
    for (const w of game.winners) wins.set(w.name, (wins.get(w.name) ?? 0) + 1);
  const [top] = [...wins.entries()].sort((a, b) => b[1] - a[1]);
  const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;
  const url = recapUrl(event.id);
  const summary = top
    ? t('recapTop', { name: firstName(top[0]), wins: top[1], count: event.games.length })
    : t('recapGames', { count: event.games.length });

  return (
    <Card style={{ gap: 10 }}>
      <AppText accessibilityRole="header" style={{ fontWeight: '700' }}>
        {t('recapTitle')}
      </AppText>
      <AppText>{summary}</AppText>
      <AppText muted>{t('recapPrivacy')}</AppText>
      <View style={{ gap: 8 }}>
        <Button
          label={t('recapShare')}
          onPress={() =>
            void Share.share({ message: t('recapShareText', { title: event.title, summary, url }) })
          }
        />
        <Button
          label={t('recapOpen')}
          variant="secondary"
          onPress={() => void WebBrowser.openBrowserAsync(url)}
        />
      </View>
    </Card>
  );
}
