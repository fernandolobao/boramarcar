import { searchGlossary } from '@boramarcar/core/learn';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { TextField } from '@/components/fields';
import { learnLocale } from '@/components/learn';
import { ManaText } from '@/components/mana';
import { AppText, Button } from '@/components/ui';
import { t } from '@/lib/i18n';

/**
 * Glossário de palavras-chave (12.3), como no site: busca sem acento, pelo nome nos dois idiomas
 * e pelo texto. `showLessons = false` na mesa (o link para a lição sairia da partida).
 */
export function GlossarySearch({ showLessons = true }: { showLessons?: boolean }) {
  const [query, setQuery] = useState('');
  const entries = searchGlossary(learnLocale, query);
  return (
    <View style={{ gap: 12 }}>
      <TextField
        label={t('glossarySearch')}
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
        autoCapitalize="none"
      />
      <AppText muted accessibilityLiveRegion="polite">
        {t('glossaryCount', { count: entries.length })}
      </AppText>
      {entries.map((e) => (
        <View key={e.id} style={{ gap: 4 }}>
          <AppText style={{ fontWeight: '700' }}>
            {e.term} <AppText muted>({e.otherTerm})</AppText>
            {e.kind === 'keyword' ? (
              <AppText muted style={{ fontSize: 13 }}>
                {'  '}
                {t('glossaryKeyword')}
              </AppText>
            ) : null}
          </AppText>
          <ManaText text={e.text} />
          {showLessons && e.lesson ? (
            <Button
              label={t('glossarySeeLesson')}
              accessibilityLabel={`${t('glossarySeeLesson')} (${e.term})`}
              variant="secondary"
              style={{ alignSelf: 'flex-start', minHeight: 40 }}
              onPress={() =>
                router.push({ pathname: '/aprender/[licao]', params: { licao: e.lesson! } })
              }
            />
          ) : null}
        </View>
      ))}
    </View>
  );
}
