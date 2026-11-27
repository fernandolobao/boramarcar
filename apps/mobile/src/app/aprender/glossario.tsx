import { ScrollView } from 'react-native';
import { GlossarySearch } from '@/components/glossary';
import { AppText, styles } from '@/components/ui';
import { t } from '@/lib/i18n';
import { useLayout } from '@/lib/layout';

/** Glossário de palavras-chave (12.3) no app. */
export default function GlossaryScreen() {
  const layout = useLayout();
  return (
    <ScrollView
      contentContainerStyle={[layout.readableStyle, { gap: 12 }]}
      keyboardShouldPersistTaps="handled"
    >
      <AppText accessibilityRole="header" style={styles.title}>
        {t('glossaryTitle')}
      </AppText>
      <AppText muted>{t('glossaryIntro')}</AppText>
      <GlossarySearch />
    </ScrollView>
  );
}
