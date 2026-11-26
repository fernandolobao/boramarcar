import type { EventDetail, EventSummary, Ranking } from '@boramarcar/api-client';
import { palette, podium, scales } from '@boramarcar/tokens';
import { Link, router } from 'expo-router';
import { useId } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { AppText, Card } from '@/components/ui';
import { formatDateTime, formatPercent, t } from '@/lib/i18n';
import { useColors } from '@/lib/theme';
import { EmptyState } from '@/components/empty-state';

/**
 * Painel do app com o desenho do site (14.3): destaque roxo com a arte do comandante em alta e o
 * próximo encontro, números em blocos, últimas partidas e pódio em degraus.
 */

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');

/** Destaque do painel: saudação e o próximo encontro, sobre a arte do comandante em alta. */
export function DashboardHero({
  groupName,
  firstName,
  welcome,
  art,
  event,
  detail,
  userId,
}: {
  groupName: string;
  firstName: string;
  /** Boas-vindas de quem entrou há pouco. */
  welcome?: string;
  art: string | null;
  event: EventSummary | undefined;
  detail: EventDetail | null;
  userId: string;
}) {
  const confirmed = detail?.participants.filter((p) => p.rsvp === 'yes') ?? [];
  const maybe = detail?.participants.filter((p) => p.rsvp === 'maybe') ?? [];
  const mine = detail?.participants.find((p) => p.userId === userId)?.rsvp ?? null;
  const rsvpLabel = { yes: t('rsvpYes'), maybe: t('rsvpMaybe'), no: t('rsvpNo') } as const;
  const gold = scales.gold[300];
  const soft = scales.ink[200];
  return (
    <View style={s.hero}>
      {art ? (
        <Image
          source={{ uri: art }}
          accessible={false}
          resizeMode="cover"
          style={[StyleSheet.absoluteFill, { opacity: 0.45 }]}
        />
      ) : null}
      {/* Camada escura: o texto tem contraste com qualquer arte. */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: `${palette.arcano}cc` }]} />
      <AppText style={{ color: gold, fontWeight: '600' }}>{groupName}</AppText>
      <AppText
        accessibilityRole="header"
        style={{ color: palette.pergaminho, fontSize: 34, fontWeight: '700', marginTop: 2 }}
      >
        {t('dashHello', { name: firstName })}
      </AppText>
      {welcome ? (
        <AppText style={{ color: palette.pergaminho, fontSize: 16, marginTop: 6 }}>
          {welcome}
        </AppText>
      ) : null}
      {event ? (
        <View style={{ marginTop: 18, gap: 6 }}>
          <AppText
            style={{ color: gold, fontWeight: '700', letterSpacing: 0.6, fontSize: 13 }}
            accessibilityRole="header"
          >
            {t('dashNextEvent').toUpperCase()}
          </AppText>
          <AppText style={{ color: palette.pergaminho, fontSize: 22, fontWeight: '700' }}>
            {event.title}
          </AppText>
          <AppText style={{ color: soft }}>
            {formatDateTime(event.startsAt)} · {event.locationName ?? t('locationTbd')}
          </AppText>
          {detail && (
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }}
              accessible
              accessibilityLabel={[
                t('dashConfirmed', { count: confirmed.length }),
                maybe.length ? t('dashMaybeCount', { count: maybe.length }) : '',
                confirmed.map((p) => p.name).join(', '),
              ]
                .filter(Boolean)
                .join(', ')}
            >
              {confirmed.length > 0 && (
                <View style={{ flexDirection: 'row' }}>
                  {confirmed.slice(0, 5).map((p, i) => (
                    <View
                      key={p.userId}
                      style={[s.avatar, { marginLeft: i ? -8 : 0, borderColor: palette.arcano }]}
                    >
                      <AppText style={{ color: palette.arcano, fontSize: 12, fontWeight: '700' }}>
                        {initials(p.name)}
                      </AppText>
                    </View>
                  ))}
                </View>
              )}
              <AppText style={{ color: soft, fontSize: 14 }}>
                {t('dashConfirmed', { count: confirmed.length })}
                {maybe.length ? ` · ${t('dashMaybeCount', { count: maybe.length })}` : ''}
              </AppText>
            </View>
          )}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            <Link href={{ pathname: '/encontros/[id]', params: { id: event.id } }} asChild>
              <Pressable
                accessibilityRole="link"
                style={({ pressed }) => [s.cta, { opacity: pressed ? 0.85 : 1 }]}
              >
                <AppText style={{ color: palette.noite, fontWeight: '700', fontSize: 16 }}>
                  {mine ? t('dashOpenEvent') : t('dashAnswerRsvp')}
                </AppText>
              </Pressable>
            </Link>
            {mine && (
              <View style={s.rsvp}>
                <AppText style={{ color: palette.pergaminho, fontSize: 14 }}>
                  {t('dashYourRsvp', { rsvp: rsvpLabel[mine] })}
                </AppText>
              </View>
            )}
          </View>
        </View>
      ) : (
        <View style={{ marginTop: 18, gap: 10 }}>
          <AppText style={{ color: soft, fontSize: 16 }}>{t('dashNoEvents')}</AppText>
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push('/disponibilidade')}
            style={({ pressed }) => [s.cta, { opacity: pressed ? 0.85 : 1 }]}
          >
            <AppText style={{ color: palette.noite, fontWeight: '700', fontSize: 16 }}>
              {t('availTitle')}
            </AppText>
          </Pressable>
        </View>
      )}
    </View>
  );
}

/** Anel de aproveitamento (decorativo: o número está ao lado). */
function Ring({ value }: { value: number }) {
  const colors = useColors();
  const size = 56;
  const stroke = 7;
  const r = (size - stroke) / 2;
  const length = 2 * Math.PI * r;
  return (
    <Svg width={size} height={size} accessibilityElementsHidden>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={colors.surfaceMuted}
        strokeWidth={stroke}
        fill="none"
      />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={colors.brand}
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${length * Math.max(0, Math.min(1, value))} ${length}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Svg>
  );
}

/** Um bloco de número ("POSIÇÃO NO RANKING · 1º · de 4 jogadores"). */
function Tile({
  label,
  value,
  detail,
  ring,
}: {
  label: string;
  value: string;
  detail?: string;
  ring?: number;
}) {
  return (
    <Card
      style={{ flexBasis: '47%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}
      accessible
      accessibilityLabel={[label, value, detail].filter(Boolean).join(', ')}
    >
      {ring !== undefined && <Ring value={ring} />}
      <View style={{ flex: 1 }}>
        <AppText muted style={{ fontSize: 12, fontWeight: '600', letterSpacing: 0.6 }}>
          {label.toUpperCase()}
        </AppText>
        <AppText style={{ fontSize: 30, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
          {value}
        </AppText>
        {detail ? (
          <AppText muted style={{ fontSize: 13 }}>
            {detail}
          </AppText>
        ) : null}
      </View>
    </Card>
  );
}

/** "Os seus números" em blocos (2 por linha), com o anel no aproveitamento. */
export function NumberTiles({
  me,
  playerCount,
  streak,
  bestStreak,
}: {
  me: Ranking['standings'][number] | null;
  playerCount: number;
  streak: number;
  bestStreak: number;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      <Tile
        label={t('dashPosition')}
        value={me ? `${me.position}º` : '—'}
        detail={me ? t('dashOfPlayers', { count: playerCount }) : t('dashNoGamesYet')}
      />
      <Tile
        label={t('points')}
        value={me ? String(me.points) : '—'}
        detail={
          me ? t('dashRecord', { wins: me.wins, losses: me.losses, draws: me.draws }) : undefined
        }
      />
      <Tile
        label={t('dashWinRate')}
        value={me && me.games ? formatPercent(me.winRate) : '—'}
        detail={me ? t('dashWinsOf', { wins: me.wins, games: me.games }) : undefined}
        ring={me?.winRate ?? 0}
      />
      <Tile
        label={t('dashStreak')}
        value={String(streak)}
        detail={t('dashBestStreak', { count: bestStreak })}
      />
    </View>
  );
}

/** Últimas partidas em selos (V, E, D), como no site. */
export function RecentForm({ recent }: { recent: readonly ('win' | 'loss' | 'draw')[] }) {
  const colors = useColors();
  if (recent.length === 0) return null;
  const count = (r: string) => recent.filter((x) => x === r).length;
  const summary = t('dashFormSummary', {
    wins: count('win'),
    losses: count('loss'),
    draws: count('draw'),
  });
  return (
    <Card
      style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}
      accessible
      accessibilityLabel={`${t('dashForm')}: ${recent.map((r) => t(`dashForm_${r}`)).join(', ')}. ${summary}`}
    >
      <AppText style={{ fontWeight: '700' }}>{t('dashForm')}</AppText>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {recent.map((r, i) => {
          const bg =
            r === 'win' ? colors.brand : r === 'draw' ? colors.accent : colors.surfaceMuted;
          const fg = r === 'win' ? colors.brandText : r === 'draw' ? colors.onAccent : colors.text;
          return (
            <View key={i} style={[s.form, { backgroundColor: bg }]}>
              <AppText style={{ color: fg, fontWeight: '700', fontSize: 14 }}>
                {t(`dashFormShort_${r}`)}
              </AppText>
            </View>
          );
        })}
      </View>
      <AppText muted>{summary}</AppText>
    </Card>
  );
}

/** Degrau metálico do pódio (degradê dos tokens). */
function Step({ place, height }: { place: 1 | 2 | 3; height: number }) {
  const id = `podium${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const stops = place === 1 ? podium.gold : place === 2 ? podium.silver : podium.bronze;
  return (
    <View style={{ width: '100%', height, borderTopLeftRadius: 12, borderTopRightRadius: 12 }}>
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="0.35" y2="1">
            {stops.map((color, i) => (
              <Stop key={i} offset={i / (stops.length - 1)} stopColor={color} />
            ))}
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" rx={12} ry={12} fill={`url(#${id})`} />
        <Rect y="50%" width="100%" height="50%" fill={`url(#${id})`} />
      </Svg>
      <AppText
        style={{
          color: palette.noite,
          fontSize: 28,
          fontWeight: '700',
          textAlign: 'center',
          paddingTop: 6,
        }}
      >
        {place}º
      </AppText>
    </View>
  );
}

/** Pódio em degraus (2º, 1º, 3º), como no site; cada nome abre o perfil. */
export function Podium({ ranking }: { ranking: Ranking | null }) {
  const colors = useColors();
  const top = ranking?.standings.slice(0, 3) ?? [];
  const order = [top[1], top[0], top[2]];
  const heights = { 1: 112, 2: 84, 3: 68 } as const;
  return (
    <Card style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <AppText accessibilityRole="header" style={{ fontWeight: '700', fontSize: 18 }}>
          {t('dashPodium')}
        </AppText>
        <Pressable
          accessibilityRole="link"
          onPress={() => router.push('/ranking')}
          style={{ minHeight: 44, justifyContent: 'center' }}
        >
          <AppText style={{ color: colors.link, fontWeight: '600' }}>
            {t('dashFullRanking')}
          </AppText>
        </Pressable>
      </View>
      {top.length === 0 ? (
        <EmptyState>{t('rankingEmpty')}</EmptyState>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
          {order.map((st, i) => {
            if (!st) return <View key={`empty-${i}`} style={{ flex: 1 }} />;
            const place = Math.min(3, Math.max(1, st.position)) as 1 | 2 | 3;
            return (
              <Pressable
                key={st.userId}
                accessibilityRole="button"
                accessibilityLabel={t('rankingRow', {
                  position: st.position,
                  name: st.name,
                  points: st.points,
                  wins: st.wins,
                  games: st.games,
                })}
                onPress={() =>
                  router.push({ pathname: '/jogadores/[id]', params: { id: st.userId } })
                }
                style={({ pressed }) => ({
                  flex: 1,
                  alignItems: 'center',
                  gap: 4,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                {place === 1 && <AppText style={{ fontSize: 20 }}>👑</AppText>}
                <AppText numberOfLines={1} style={{ fontWeight: '700', fontSize: 14 }}>
                  {st.name}
                </AppText>
                <AppText muted style={{ fontSize: 12 }}>
                  {t('dashPointsShort', { count: st.points })}
                </AppText>
                <Step place={place} height={heights[place]} />
              </Pressable>
            );
          })}
        </View>
      )}
    </Card>
  );
}

const s = StyleSheet.create({
  hero: {
    borderRadius: 24,
    padding: 22,
    overflow: 'hidden',
    backgroundColor: palette.arcano,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    backgroundColor: palette.pergaminho,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cta: {
    minHeight: 48,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: palette.dourado,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rsvp: {
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${palette.pergaminho}40`,
    backgroundColor: `${palette.pergaminho}1a`,
    justifyContent: 'center',
  },
  form: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
