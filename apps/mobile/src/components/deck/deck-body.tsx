import type { DeckDetail, DeckLine } from '@boramarcar/api-client';
import type { BracketEstimate } from '@boramarcar/core/analysis';
import { groupEntriesByType } from '@boramarcar/core/decks';
import type { GameFormat } from '@boramarcar/core/games';
import { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { BracketChecklist } from './bracket-checklist';
import { CardViewer } from './card-viewer';
import { AddCardForm, LineEditor, usePrintPicker } from './deck-edit';
import { formatLabel } from '@/components/table/labels';
import { StackSection } from '@/components/stack';
import { AppText, Button, styles } from '@/components/ui';
import { locale, t, type MessageKey } from '@/lib/i18n';
import { useColors } from '@/lib/theme';

const cap = (s: string) =>
  s
    .split('_')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('');
/** Texto de uma chave gerada a partir de um código (ex.: `deckIssue` + `banned`). */
const tKey = (prefix: string, code: string, values: Record<string, string | number> = {}) =>
  t(`${prefix}${cap(code)}` as MessageKey, values);

const CURVE = ['0', '1', '2', '3', '4', '5', '6', '7+'] as const;

/** Seção do deck: cartão da pilha (ao rolar, desliza por cima da anterior). */
/** Servidor antigo pode mandar só o número: a lista precisa dos motivos e da fonte. */
const isBracketEstimate = (
  b: DeckDetail['bracket'],
): b is NonNullable<DeckDetail['bracket']> & {
  minimum: 2 | 3 | 4;
  reasons: BracketEstimate['reasons'];
  source: 'spellbook' | 'local';
} => Boolean(b && Array.isArray(b.reasons) && (b.source === 'spellbook' || b.source === 'local'));

function Section({
  title,
  index,
  children,
}: {
  title: string;
  index: number;
  children: React.ReactNode;
}) {
  return (
    <StackSection index={index} title={title}>
      {children}
    </StackSection>
  );
}

/** Uma linha de carta: toque abre a carta grande (imagem, verso, edição e texto). */
function LineRow({ line, onOpen }: { line: DeckLine; onOpen: () => void }) {
  const colors = useColors();
  const set = line.card?.setCode?.toUpperCase();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[
        t('deckLine', { quantity: line.quantity, name: line.name }),
        set,
        line.proxies ? t('deckProxiesOf', { count: line.proxies }) : '',
      ]
        .filter(Boolean)
        .join(', ')}
      accessibilityHint={t('deckOpenCard', { name: line.name })}
      onPress={onOpen}
      style={({ pressed }) => ({
        minHeight: 44,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 6,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <AppText style={{ minWidth: 28, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
        {line.quantity}
      </AppText>
      <AppText style={{ flex: 1 }} numberOfLines={2}>
        {line.name}
      </AppText>
      {line.proxies > 0 && (
        <AppText
          style={{
            fontSize: 12,
            fontWeight: '700',
            color: colors.onAccent,
            backgroundColor: colors.accent,
            borderRadius: 6,
            paddingHorizontal: 6,
            overflow: 'hidden',
          }}
        >
          {line.proxies < line.quantity
            ? `${line.proxies} ${t('deckProxyTag')}`
            : t('deckProxyTag')}
        </AppText>
      )}
      {set ? (
        <AppText muted style={{ fontSize: 12 }}>
          {set}
        </AppText>
      ) : null}
    </Pressable>
  );
}

/** Conteúdo do deck (5.8): resumo, nota, validação, curva, funções e cartas por tipo. */
export function DeckBody({
  deck,
  onChanged,
}: {
  deck: DeckDetail;
  /** Depois de editar cartas (dono): recarrega o deck. */
  onChanged?: () => Promise<void> | void;
}) {
  const colors = useColors();
  const [open, setOpen] = useState<DeckLine | null>(null);
  const [editing, setEditing] = useState(false);
  const [editMessage, setEditMessage] = useState('');
  const changed = async (message?: string) => {
    if (message) setEditMessage(message);
    await onChanged?.();
  };
  const printPicker = usePrintPicker(deck.id, changed);
  const row = (line: DeckLine) =>
    editing ? (
      <LineEditor
        key={line.key}
        deckId={deck.id}
        line={line}
        onChanged={changed}
        onPickPrint={printPicker.open}
      />
    ) : (
      <LineRow key={line.key} line={line} onOpen={() => setOpen(line)} />
    );
  const a = deck.analysis;
  const commanders = deck.lines.filter((l) => l.board === 'commander');
  const art = commanders.find((l) => l.card?.imageUri)?.card?.imageUri;
  const maxCurve = Math.max(1, ...CURVE.map((b) => a.manaCurve[b] ?? 0));
  const roles = Object.entries(a.roles).filter(([, count]) => count > 0);
  const groups = groupEntriesByType(
    deck.lines.filter((l) => l.board === 'mainboard').map((l) => ({ ...l, isProxy: false })),
  );
  const others = (['sideboard', 'maybeboard'] as const)
    .map((board) => ({ board, lines: deck.lines.filter((l) => l.board === board) }))
    .filter((b) => b.lines.length > 0);
  const count = (lines: readonly DeckLine[]) => lines.reduce((sum, l) => sum + l.quantity, 0);
  // Posição de cada seção na pilha (algumas só aparecem quando há dados).
  let stackIndex = 0;
  const next = () => stackIndex++;

  return (
    <>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
        {art ? (
          <Image
            source={{ uri: art }}
            accessibilityIgnoresInvertColors
            accessible={false}
            style={{ width: 96, aspectRatio: 63 / 88, borderRadius: 8 }}
          />
        ) : null}
        <View style={{ flex: 1, gap: 4 }}>
          <AppText accessibilityRole="header" style={styles.title}>
            {deck.name}
          </AppText>
          <AppText muted>
            {formatLabel(deck.format as GameFormat)} · {t('deckOwner', { name: deck.ownerName })}
          </AppText>
          <AppText muted>
            {t('deckSummary', {
              cards: a.totalCards,
              lands: a.lands,
              cmc: new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(a.averageCmc),
            })}
          </AppText>
          {a.proxies > 0 && <AppText muted>{t('deckProxiesCount', { count: a.proxies })}</AppText>}
        </View>
      </View>

      {(a.score !== null || deck.bracket) && (
        <Section title={t('deckScore')} index={next()}>
          {a.score !== null && (
            <>
              <AppText style={{ fontSize: 28, fontWeight: '800' }}>
                {t('deckScoreValue', { score: a.score })}
              </AppText>
              <View
                accessible={false}
                importantForAccessibility="no-hide-descendants"
                style={{ height: 10, borderRadius: 5, backgroundColor: colors.surfaceMuted }}
              >
                <View
                  style={{
                    width: `${Math.max(0, Math.min(100, a.score))}%`,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: colors.brand,
                  }}
                />
              </View>
            </>
          )}
          {deck.bracket && (
            <AppText>
              {t('deckBracket', {
                bracket:
                  deck.bracket.minimum >= 4
                    ? t('deckBracketPlus', { bracket: 4 })
                    : deck.bracket.minimum,
              })}
            </AppText>
          )}
          {deck.bracket && isBracketEstimate(deck.bracket) && (
            <BracketChecklist bracket={deck.bracket} />
          )}
        </Section>
      )}

      <Section title={t('deckValidation')} index={next()}>
        {a.validation.length === 0 ? (
          <AppText style={{ color: colors.success }}>✓ {t('deckValid')}</AppText>
        ) : (
          a.validation.map((issue, i) => (
            <AppText key={i} style={{ color: colors.danger }}>
              ⚠ {tKey('deckIssue', issue.code, issue as Record<string, string | number>)}
            </AppText>
          ))
        )}
      </Section>

      <Section title={t('deckCurve')} index={next()}>
        {CURVE.map((bucket) => {
          const value = a.manaCurve[bucket] ?? 0;
          return (
            <View
              key={bucket}
              accessible
              accessibilityLabel={t('deckCurveBar', { bucket, count: value })}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
            >
              <AppText style={{ width: 28, fontWeight: '700' }}>{bucket}</AppText>
              <View style={{ flex: 1, height: 14 }}>
                <View
                  style={{
                    width: `${(value / maxCurve) * 100}%`,
                    minWidth: value ? 4 : 0,
                    height: 14,
                    borderRadius: 4,
                    backgroundColor: colors.brand,
                  }}
                />
              </View>
              <AppText style={{ width: 28, textAlign: 'right', fontVariant: ['tabular-nums'] }}>
                {value}
              </AppText>
            </View>
          );
        })}
      </Section>

      {roles.length > 0 && (
        <Section title={t('deckRoles')} index={next()}>
          {roles.map(([role, value]) => (
            <AppText key={role}>
              {t('deckRoleRow', { role: tKey('role', role), count: value })}
            </AppText>
          ))}
        </Section>
      )}

      <Section title={t('deckCardsTitle')} index={next()}>
        {deck.isOwner && onChanged && (
          <View style={{ gap: 8 }}>
            <Button
              label={editing ? t('deckEditDone') : t('deckEditCards')}
              variant="secondary"
              accessibilityState={{ expanded: editing }}
              onPress={() => setEditing((e) => !e)}
              style={{ alignSelf: 'flex-start' }}
            />
            <AppText muted accessibilityLiveRegion="polite">
              {editMessage}
            </AppText>
            {editing && <AddCardForm deckId={deck.id} onChanged={changed} />}
          </View>
        )}
        {commanders.length > 0 && (
          <View>
            <AppText accessibilityRole="header" style={{ fontWeight: '700', marginTop: 4 }}>
              {t('deckGroupCount', {
                group: t('deckBoardCommander'),
                count: count(commanders),
              })}
            </AppText>
            {commanders.map(row)}
          </View>
        )}
        {groups.map(({ group, entries, count: total }) => (
          <View key={group}>
            <AppText accessibilityRole="header" style={{ fontWeight: '700', marginTop: 8 }}>
              {t('deckGroupCount', { group: tKey('deckType', group), count: total })}
            </AppText>
            {entries.map(row)}
          </View>
        ))}
        {others.map(({ board, lines }) => (
          <View key={board}>
            <AppText accessibilityRole="header" style={{ fontWeight: '700', marginTop: 8 }}>
              {t('deckGroupCount', { group: tKey('deckBoard', board), count: count(lines) })}
            </AppText>
            {lines.map(row)}
          </View>
        ))}
      </Section>

      {printPicker.picker}
      <CardViewer line={open} onClose={() => setOpen(null)} />
    </>
  );
}
