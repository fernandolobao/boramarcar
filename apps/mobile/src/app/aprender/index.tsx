import {
  CHALLENGE_LEVELS,
  challengeLevel,
  OFFICIAL_LINKS,
  TRACK_IDS,
} from '@boramarcar/core/learn';
import { router } from 'expo-router';
import { Linking, Pressable, ScrollView, View } from 'react-native';
import { Icon } from '@/components/icons';
import { CHALLENGES, learnContent, learnLocale, useLearnProgress } from '@/components/learn';
import { AppText, Button, Card, styles } from '@/components/ui';
import { t } from '@/lib/i18n';
import { useLayout } from '@/lib/layout';
import { useColors } from '@/lib/theme';

/** Um item da trilha (lição ou desafio): número ou ✓, título e resumo. */
function Item({
  label,
  n,
  title,
  summary,
  done,
  onPress,
}: {
  label: string;
  n: number;
  title: string;
  summary: string;
  done: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${label}: ${title}${done ? `. ${t('learnDone')}` : ''}`}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
    >
      <Card style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: done ? colors.brand : colors.border,
            backgroundColor: done ? colors.brand : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {done ? (
            <Icon name="done" color={colors.brandText} />
          ) : (
            <AppText style={{ fontWeight: '700' }}>{n}</AppText>
          )}
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText style={{ fontWeight: '700' }}>{title}</AppText>
          <AppText muted>{summary}</AppText>
        </View>
      </Card>
    </Pressable>
  );
}

/** "Aprender a jogar" no app (12.1): os mesmos blocos, lições e desafios do site. */
export default function LearnScreen() {
  const layout = useLayout();
  const { done } = useLearnProgress();
  const content = learnContent;
  const links = OFFICIAL_LINKS[learnLocale];

  return (
    <ScrollView contentContainerStyle={[layout.readableStyle, { gap: 16 }]}>
      <AppText accessibilityRole="header" style={styles.title}>
        {content.title}
      </AppText>
      <AppText>{content.intro}</AppText>

      {TRACK_IDS.map((track) => {
        const lessons = content.lessons.filter((l) => l.track === track);
        return (
          <View key={track} style={{ gap: 8 }}>
            <AppText accessibilityRole="header" style={styles.sectionTitle}>
              {content.tracks[track].title}
            </AppText>
            <AppText muted>
              {content.tracks[track].intro}{' '}
              {t('learnProgress', {
                done: lessons.filter((l) => done.includes(l.id)).length,
                total: lessons.length,
              })}
            </AppText>
            {lessons.map((lesson, i) => (
              <Item
                key={lesson.id}
                label={t('learnLessonOf', { n: i + 1, total: lessons.length })}
                n={i + 1}
                title={lesson.title}
                summary={lesson.summary}
                done={done.includes(lesson.id)}
                onPress={() =>
                  router.push({ pathname: '/aprender/[licao]', params: { licao: lesson.id } })
                }
              />
            ))}
          </View>
        );
      })}

      <View style={{ gap: 8 }}>
        <AppText accessibilityRole="header" style={styles.sectionTitle}>
          {t('learnChallenges')}
        </AppText>
        <AppText muted>{t('learnChallengesIntro')}</AppText>
        {CHALLENGE_LEVELS.map((level) => {
          const list = CHALLENGES.filter((c) => challengeLevel(c) === level);
          return (
            <View key={level} style={{ gap: 8 }}>
              <AppText accessibilityRole="header" style={{ fontWeight: '700', marginTop: 4 }}>
                {t(level === 'basic' ? 'learnLevelBasic' : 'learnLevelIntermediate')} ·{' '}
                {t('learnProgress', {
                  done: list.filter((c) => done.includes(c.id)).length,
                  total: list.length,
                })}
              </AppText>
              {list.map((c, i) => (
                <Item
                  key={c.id}
                  label={t('learnChallengeOf', { n: i + 1, total: list.length })}
                  n={i + 1}
                  title={c[learnLocale].title}
                  summary={c[learnLocale].question}
                  done={done.includes(c.id)}
                  onPress={() =>
                    router.push({
                      pathname: '/aprender/desafios/[desafio]',
                      params: { desafio: c.id },
                    })
                  }
                />
              ))}
            </View>
          );
        })}
      </View>

      <Card style={{ gap: 8 }}>
        <AppText accessibilityRole="header" style={styles.sectionTitle}>
          {content.official.title}
        </AppText>
        <AppText>{content.official.text}</AppText>
        <Button
          label={content.official.rules}
          variant="secondary"
          accessibilityHint={t('storeOpensOutside')}
          onPress={() => void Linking.openURL(links.rules)}
        />
        <Button
          label={content.official.glossary}
          variant="secondary"
          accessibilityHint={t('storeOpensOutside')}
          onPress={() => void Linking.openURL(links.glossary)}
        />
      </Card>
    </ScrollView>
  );
}
