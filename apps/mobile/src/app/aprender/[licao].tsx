import { isLessonId } from '@boramarcar/core/learn';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { ExampleCards, learnContent, useLearnProgress } from '@/components/learn';
import { ManaText } from '@/components/mana';
import { AppText, Button, Card, styles } from '@/components/ui';
import { t } from '@/lib/i18n';
import { useLayout } from '@/lib/layout';

/** Uma lição da trilha (12.1), como no site: seções, cartas de exemplo e "Para lembrar". */
export default function LessonScreen() {
  const layout = useLayout();
  const { licao } = useLocalSearchParams<{ licao: string }>();
  const { done, mark } = useLearnProgress();
  const [message, setMessage] = useState('');
  const lessons = learnContent.lessons;
  const index = isLessonId(licao) ? lessons.findIndex((l) => l.id === licao) : -1;
  if (index < 0) {
    return <AppText style={[styles.center, { textAlign: 'center' }]}>{t('learnNotFound')}</AppText>;
  }
  const lesson = lessons[index]!;
  const trackLessons = lessons.filter((l) => l.track === lesson.track);
  const next = lessons[index + 1];
  const completed = done.includes(lesson.id);

  return (
    <ScrollView contentContainerStyle={[layout.readableStyle, { gap: 16 }]}>
      <Stack.Screen options={{ title: lesson.title }} />
      <AppText muted>
        {learnContent.tracks[lesson.track].title} ·{' '}
        {t('learnLessonOf', {
          n: trackLessons.indexOf(lesson) + 1,
          total: trackLessons.length,
        })}{' '}
        · {t('learnMinutes', { count: lesson.minutes })}
      </AppText>
      <AppText accessibilityRole="header" style={styles.title}>
        {lesson.title}
      </AppText>
      <AppText>{lesson.summary}</AppText>

      {lesson.sections.map((section) => (
        <View key={section.id} style={{ gap: 8 }}>
          <AppText accessibilityRole="header" style={styles.sectionTitle}>
            {section.heading}
          </AppText>
          {section.paragraphs.map((p, i) => (
            <ManaText key={i} text={p} />
          ))}
          {section.cards?.length ? <ExampleCards names={section.cards} /> : null}
        </View>
      ))}

      <Card style={{ gap: 6 }}>
        <AppText accessibilityRole="header" style={styles.sectionTitle}>
          {t('learnRemember')}
        </AppText>
        {lesson.remember.map((r, i) => (
          <ManaText key={i} text={`• ${r}`} />
        ))}
      </Card>

      <View style={{ gap: 8 }}>
        <Button
          label={completed ? t('learnCompleted') : t('learnComplete')}
          variant={completed ? 'secondary' : 'primary'}
          icon="done"
          accessibilityState={{ checked: completed }}
          onPress={() => {
            void mark(lesson.id, !completed)
              .then(() => setMessage(completed ? '' : t('learnSaved')))
              .catch(() => setMessage(t('loadError')));
          }}
        />
        {message ? <AppText accessibilityLiveRegion="polite">{message}</AppText> : null}
        {next ? (
          <Button
            label={t('learnNext', { title: next.title })}
            variant="secondary"
            icon="next"
            onPress={() =>
              router.replace({ pathname: '/aprender/[licao]', params: { licao: next.id } })
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
