import { HELP, type HelpQuestion } from '@boramarcar/core/help';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { AppText, Card, styles } from '@/components/ui';
import { locale } from '@/lib/i18n';
import { useColors } from '@/lib/theme';

/** Pergunta que abre e fecha ao toque (estado anunciado pelo leitor de tela). */
function Question({ q }: { q: HelpQuestion }) {
  const colors = useColors();
  const [open, setOpen] = useState(false);
  return (
    <View style={{ borderTopWidth: 1, borderTopColor: colors.line }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((o) => !o)}
        style={({ pressed }) => ({
          minHeight: 44,
          paddingVertical: 10,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <AppText style={{ width: 16, textAlign: 'center' }} accessibilityElementsHidden>
          {open ? '−' : '+'}
        </AppText>
        <AppText style={{ flex: 1, fontWeight: '600' }}>{q.question}</AppText>
      </Pressable>
      {open && (
        <View style={{ gap: 8, paddingBottom: 12, paddingLeft: 26 }}>
          {q.intro?.map((text) => (
            <AppText key={text}>{text}</AppText>
          ))}
          {q.steps?.map((step, i) => (
            <View key={step} style={{ flexDirection: 'row', gap: 8 }}>
              <AppText style={{ fontWeight: '700', minWidth: 20 }}>{i + 1}.</AppText>
              <AppText style={{ flex: 1 }}>{step}</AppText>
            </View>
          ))}
          {q.notes?.map((text) => (
            <AppText key={text} muted>
              {text}
            </AppText>
          ))}
        </View>
      )}
    </View>
  );
}

/** Ajuda (FAQ): o mesmo texto da página /ajuda do site, vindo do core. */
export default function HelpScreen() {
  const h = HELP[locale === 'en' ? 'en' : 'pt-BR'];
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Stack.Screen options={{ title: h.title }} />
      <AppText muted>{h.intro}</AppText>
      {h.sections.map((s) => (
        <Card key={s.id} style={{ gap: 0 }}>
          <AppText accessibilityRole="header" style={[styles.title, { marginBottom: 8 }]}>
            {s.title}
          </AppText>
          {s.questions.map((q) => (
            <Question key={q.id} q={q} />
          ))}
        </Card>
      ))}
    </ScrollView>
  );
}
