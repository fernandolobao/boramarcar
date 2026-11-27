import { challengeLevel, isChallengeId, type ChallengeSide } from '@boramarcar/core/learn';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Choices } from '@/components/ds/choices';
import { Icon } from '@/components/icons';
import {
  CHALLENGES,
  ExampleCards,
  learnContent,
  learnLocale,
  useLearnProgress,
} from '@/components/learn';
import { ManaText } from '@/components/mana';
import { AppText, Button, Card, styles } from '@/components/ui';
import { t } from '@/lib/i18n';
import { useLayout } from '@/lib/layout';
import { useColors } from '@/lib/theme';

/** A área de um lado da mesa: vida, cartas (com o estado) e o extra (mão, mana…). */
function Area({ label, side }: { label: string; side: ChallengeSide }) {
  return (
    <Card style={{ gap: 6 }}>
      <AppText accessibilityRole="header" style={{ fontWeight: '700' }}>
        {label} · {t('learnLife', { life: side.life })}
      </AppText>
      {side.cards.length > 0 && <ExampleCards names={side.cards.map((c) => c.name)} />}
      {side.cards
        .filter((c) => c.note)
        .map((c) => (
          <AppText key={c.name} muted>
            {c.name}: {c.note}
          </AppText>
        ))}
      {side.extra ? <ManaText text={side.extra} /> : null}
    </Card>
  );
}

/** Um desafio guiado (12.4), como no site: a mesa, a pergunta e as respostas comentadas. */
export default function ChallengeScreen() {
  const layout = useLayout();
  const colors = useColors();
  const { desafio } = useLocalSearchParams<{ desafio: string }>();
  const { mark } = useLearnProgress();
  const [choice, setChoice] = useState('');
  const [answered, setAnswered] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const challenge = isChallengeId(desafio) ? CHALLENGES.find((c) => c.id === desafio) : undefined;
  if (!challenge) {
    return <AppText style={[styles.center, { textAlign: 'center' }]}>{t('learnNotFound')}</AppText>;
  }
  const text = challenge[learnLocale];
  const level = CHALLENGES.filter((c) => challengeLevel(c) === challengeLevel(challenge));
  const index = level.indexOf(challenge);
  const next = level[index + 1];
  const right = answered !== null && text.options[answered]!.correct;
  const lesson = learnContent.lessons.find((l) => l.id === challenge.lesson);

  const answer = () => {
    if (choice === '') return;
    const i = Number(choice);
    setAnswered(i);
    if (text.options[i]!.correct) {
      void mark(challenge.id, true)
        .then(() => setSaved(true))
        .catch(() => setSaved(false));
    }
  };

  return (
    <ScrollView contentContainerStyle={[layout.readableStyle, { gap: 16 }]}>
      <Stack.Screen options={{ title: text.title }} />
      <AppText muted>
        {t(challengeLevel(challenge) === 'basic' ? 'learnLevelBasic' : 'learnLevelIntermediate')} ·{' '}
        {t('learnChallengeOf', { n: index + 1, total: level.length })}
      </AppText>
      <AppText accessibilityRole="header" style={styles.title}>
        {text.title}
      </AppText>
      <ManaText text={text.situation} />

      <Area label={t('learnOpponent')} side={text.opponent} />
      <Area label={t('learnYou')} side={text.you} />

      <Choices
        label={text.question}
        orientation="vertical"
        value={choice}
        onChange={(v) => {
          setChoice(v);
          setAnswered(null);
        }}
        options={text.options.map((o, i) => ({ value: String(i), label: o.text }))}
      />
      <Button label={t('learnAnswer')} icon="done" disabled={choice === ''} onPress={answer} />

      <View accessibilityLiveRegion="polite" style={{ gap: 8 }}>
        {answered !== null && (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon
                name={right ? 'ok' : 'warning'}
                color={right ? colors.success : colors.danger}
              />
              <AppText style={{ fontWeight: '700', color: right ? colors.success : colors.danger }}>
                {right ? t('learnRight') : t('learnWrong')}
              </AppText>
            </View>
            {text.options.map((o, i) =>
              i === answered || (right && o.correct) ? (
                <Card key={i} style={{ gap: 4 }}>
                  <AppText style={{ fontWeight: '600' }}>
                    {o.correct ? t('learnCorrectAnswer') : t('learnYourAnswer')}: {o.text}
                  </AppText>
                  <ManaText text={o.why} />
                </Card>
              ) : null,
            )}
            {right && saved && <AppText muted>{t('learnChallengeSaved')}</AppText>}
            {!right && <AppText>{t('learnTryAgain')}</AppText>}
          </>
        )}
      </View>

      <View style={{ gap: 8 }}>
        {lesson && (
          <Button
            label={t('learnReview', { lesson: lesson.title })}
            variant="secondary"
            onPress={() =>
              router.push({ pathname: '/aprender/[licao]', params: { licao: lesson.id } })
            }
          />
        )}
        {next ? (
          <Button
            label={t('learnNext', { title: next[learnLocale].title })}
            variant="secondary"
            icon="next"
            onPress={() =>
              router.replace({
                pathname: '/aprender/desafios/[desafio]',
                params: { desafio: next.id },
              })
            }
          />
        ) : (
          <Button
            label={t('learnAll')}
            variant="secondary"
            onPress={() => router.replace('/aprender')}
          />
        )}
      </View>
    </ScrollView>
  );
}
