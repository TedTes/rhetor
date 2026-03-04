import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import {
  fetchHomeData,
  type HomeData,
  type HomeSession,
} from '../../services/home';
import { colors, radii, spacing, typography } from '../../theme';

const BYPASS_AUTH = process.env.EXPO_PUBLIC_BYPASS_AUTH === 'true';
const MOCK_API = process.env.EXPO_PUBLIC_MOCK_API === 'true';

// ─── Utilities ────────────────────────────────────────────────────────────────

function formatRelativeDate(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function averageMemoryScore(sessions: HomeSession[]): number | null {
  const flash = sessions.filter(
    (s) => s.session_type === 'flash_notes' && s.memory_score !== null,
  );
  if (!flash.length) return null;
  const avg = flash.reduce((acc, s) => acc + (s.memory_score ?? 0), 0) / flash.length;
  return Math.round(avg * 100);
}

const SESSION_TYPE_LABELS: Record<string, string> = {
  prompt: 'Prompt',
  freeform: 'Freeform',
  flash_notes: 'Flash Notes',
};

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  recorded:   { color: colors.inkFaint, label: 'Recorded' },
  processing: { color: colors.accent,   label: 'Processing' },
  ready:      { color: colors.success,  label: 'Ready' },
  failed:     { color: colors.error,    label: 'Failed' },
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function usePulse(): Animated.Value {
  const opacity = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 900, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);
  return opacity;
}

function SkeletonRect({ w, h, radius = radii.md }: { w: number | `${number}%`; h: number; radius?: number }) {
  const opacity = usePulse();
  return (
    <Animated.View
      style={{ width: w, height: h, borderRadius: radius, backgroundColor: '#C8D5E5', opacity }}
    />
  );
}

function LoadingSkeleton() {
  return (
    <View style={{ paddingHorizontal: spacing[5], paddingTop: spacing[5], gap: spacing[5] }}>
      {/* Header */}
      <View style={{ gap: spacing[2] }}>
        <SkeletonRect w={120} h={28} />
        <SkeletonRect w={220} h={13} />
      </View>
      {/* Metric row */}
      <View style={{ flexDirection: 'row', gap: spacing[3] }}>
        {[1, 2, 3].map((i) => (
          <View
            key={i}
            style={{
              flex: 1,
              backgroundColor: colors.surface,
              borderRadius: radii.xl,
              padding: spacing[4],
              alignItems: 'center',
              gap: spacing[2],
            }}
          >
            <SkeletonRect w={28} h={28} radius={radii.full} />
            <SkeletonRect w={36} h={22} />
            <SkeletonRect w={52} h={11} />
          </View>
        ))}
      </View>
      {/* Performance section */}
      <View style={{ backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing[5], gap: spacing[4] }}>
        <SkeletonRect w={130} h={11} />
        {[1, 2, 3].map((i) => (
          <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing[3] }}>
            <View style={{ gap: spacing[2] }}>
              <SkeletonRect w={100} h={14} />
              <SkeletonRect w={150} h={11} />
            </View>
            <SkeletonRect w={52} h={22} radius={radii.full} />
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Metric card ──────────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  accent?: boolean;
}) {
  return (
    <View style={[s.metricCard, accent && s.metricCardAccent]}>
      <View style={[s.metricIconWrap, accent && s.metricIconWrapAccent]}>
        <Ionicons name={icon} size={16} color={accent ? colors.white : colors.accent} />
      </View>
      <Text style={[s.metricValue, accent && s.metricValueAccent]}>{value}</Text>
      <Text style={[s.metricLabel, accent && s.metricLabelAccent]}>{label}</Text>
    </View>
  );
}

// ─── Performance row ──────────────────────────────────────────────────────────

function PerformanceRow({ session, isFirst }: { session: HomeSession; isFirst: boolean }) {
  const typeLabel = SESSION_TYPE_LABELS[session.session_type] ?? session.session_type;
  const cfg = STATUS_CONFIG[session.status] ?? { color: colors.inkFaint, label: session.status };
  const showMemory = session.session_type === 'flash_notes' && session.memory_score !== null;

  return (
    <View style={[s.perfRow, !isFirst && s.perfRowBorder]}>
      <View style={s.perfLeft}>
        <Text style={s.perfType}>{typeLabel}</Text>
        <View style={s.perfMetaRow}>
          <Text style={s.perfMeta}>{formatRelativeDate(session.submitted_at)}</Text>
          <View style={s.perfMetaDot} />
          <Text style={s.perfMeta}>{session.review_count}/2 reviews</Text>
          {showMemory && (
            <>
              <View style={s.perfMetaDot} />
              <Text style={s.perfMeta}>{Math.round(session.memory_score! * 100)}% memory</Text>
            </>
          )}
        </View>
      </View>
      <View style={[s.statusPill, { borderColor: cfg.color }]}>
        <View style={[s.statusPillDot, { backgroundColor: cfg.color }]} />
        <Text style={[s.statusPillText, { color: cfg.color }]}>{cfg.label}</Text>
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export function ProgressScreen() {
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (MOCK_API || BYPASS_AUTH) {
      setUserId('mock-user-id');
      return;
    }
    supabase.auth
      .getUser()
      .then(({ data: { user } }) => {
        if (user) {
          setUserId(user.id);
        } else {
          setError('Session not found. Please sign in again.');
          setLoading(false);
        }
      })
      .catch(() => {
        setError('Failed to resolve session.');
        setLoading(false);
      });
  }, []);

  const load = useCallback(async (uid: string, isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const result = await fetchHomeData(uid);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load progress');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (userId) void load(userId);
  }, [userId, load]);

  async function handleRefresh() {
    if (!userId) return;
    setRefreshing(true);
    await load(userId, true);
  }

  const memoryAvg = useMemo(
    () => (data ? averageMemoryScore(data.recentSessions) : null),
    [data],
  );

  // ── Error (full-screen) ──
  if (error && !data) {
    return (
      <SafeAreaView style={s.root} edges={['top', 'left', 'right']}>
        <View style={s.errorFullScreen}>
          <View style={s.errorIconWrap}>
            <Ionicons name="cloud-offline-outline" size={32} color={colors.error} />
          </View>
          <Text style={s.errorFullTitle}>Couldn't load progress</Text>
          <Text style={s.errorFullBody}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Loading skeleton ──
  if (loading && !data) {
    return (
      <SafeAreaView style={s.root} edges={['top', 'left', 'right']}>
        <LoadingSkeleton />
      </SafeAreaView>
    );
  }

  const hasSessions = (data?.recentSessions.length ?? 0) > 0;

  return (
    <SafeAreaView style={s.root} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        {/* ── Header ── */}
        <View style={s.header}>
          <Text style={s.title}>Progress</Text>
          <Text style={s.subtitle}>Track your speaking improvement over time</Text>
        </View>

        {/* ── Soft error (data present but stale) ── */}
        {error && data && (
          <View style={s.inlineBanner}>
            <Ionicons name="warning-outline" size={14} color={colors.error} />
            <Text style={s.inlineBannerText}>{error}</Text>
          </View>
        )}

        {/* ── Metric cards ── */}
        <View style={s.metricsRow}>
          <MetricCard
            label="Sessions"
            value={String(data?.recentSessions.length ?? 0)}
            icon="mic-outline"
            accent={hasSessions}
          />
          <MetricCard
            label="To Review"
            value={String(data?.pendingReviewCount ?? 0)}
            icon="create-outline"
          />
          <MetricCard
            label="Memory Avg"
            value={memoryAvg === null ? '—' : `${memoryAvg}%`}
            icon="flash-outline"
          />
        </View>

        {/* ── Recent performance ── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>RECENT PERFORMANCE</Text>
          {hasSessions ? (
            data!.recentSessions.map((session, i) => (
              <PerformanceRow key={session.id} session={session} isFirst={i === 0} />
            ))
          ) : (
            <View style={s.emptyState}>
              <View style={s.emptyIconWrap}>
                <Ionicons name="mic-off-outline" size={24} color={colors.inkFaint} />
              </View>
              <Text style={s.emptyTitle}>No sessions yet</Text>
              <Text style={s.emptyBody}>
                Record your first session on the Record tab to start tracking your speaking improvement.
              </Text>
            </View>
          )}
        </View>

        {/* ── AI coaching teaser ── */}
        <View style={s.coachSection}>
          <View style={s.coachTopRow}>
            <View style={s.coachIconWrap}>
              <Ionicons name="sparkles" size={16} color="#7C3AED" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={s.coachTitleRow}>
                <Text style={s.coachTitle}>AI Coaching</Text>
                <View style={s.coachBadge}>
                  <Text style={s.coachBadgeText}>Coming Soon</Text>
                </View>
              </View>
              <Text style={s.coachBody}>
                Automatic speech analysis — pacing, filler words, clarity score, and weekly improvement trends.
              </Text>
            </View>
          </View>
          <View style={s.coachHints}>
            {['Pacing & rhythm analysis', 'Filler word detection', 'Weekly clarity trend'].map((hint) => (
              <View key={hint} style={s.coachHintRow}>
                <View style={s.coachHintDot} />
                <Text style={s.coachHintText}>{hint}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#E8EDF4',
  },
  scrollContent: {
    paddingBottom: spacing[10],
  },

  // ── Header ──
  header: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[5],
    paddingBottom: spacing[4],
    gap: spacing[1],
  },
  title: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.extrabold,
    color: colors.ink,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: typography.size.sm,
    color: colors.inkLight,
    lineHeight: typography.size.sm * typography.lineHeight.normal,
  },

  // ── Inline error banner ──
  inlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginHorizontal: spacing[5],
    marginBottom: spacing[3],
    backgroundColor: colors.errorBg,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: radii.md,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
  },
  inlineBannerText: {
    flex: 1,
    color: colors.error,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
  },

  // ── Full-screen error ──
  errorFullScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[8],
    gap: spacing[3],
  },
  errorIconWrap: {
    width: 60,
    height: 60,
    borderRadius: radii.full,
    backgroundColor: colors.errorBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorFullTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.ink,
    textAlign: 'center',
  },
  errorFullBody: {
    fontSize: typography.size.sm,
    color: colors.inkLight,
    textAlign: 'center',
    lineHeight: typography.size.sm * typography.lineHeight.normal,
  },

  // ── Metrics ──
  metricsRow: {
    flexDirection: 'row',
    gap: spacing[3],
    marginHorizontal: spacing[5],
    marginBottom: spacing[5],
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[3],
    alignItems: 'center',
    gap: spacing[2],
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  metricCardAccent: {
    backgroundColor: colors.accent,
  },
  metricIconWrap: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: colors.accentSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricIconWrapAccent: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  metricValue: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.extrabold,
    color: colors.ink,
  },
  metricValueAccent: {
    color: colors.white,
  },
  metricLabel: {
    fontSize: typography.size.xs,
    color: colors.inkFaint,
    textAlign: 'center',
  },
  metricLabelAccent: {
    color: 'rgba(255,255,255,0.7)',
  },

  // ── Section wrapper ──
  section: {
    marginHorizontal: spacing[5],
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    paddingHorizontal: spacing[5],
    paddingTop: spacing[5],
    paddingBottom: spacing[3],
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: typography.weight.extrabold,
    color: colors.inkFaint,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: spacing[2],
  },

  // ── Performance rows ──
  perfRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[4],
    gap: spacing[3],
  },
  perfRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  perfLeft: {
    flex: 1,
    gap: 4,
  },
  perfType: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.ink,
  },
  perfMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 5,
  },
  perfMeta: {
    fontSize: typography.size.xs,
    color: colors.inkLight,
  },
  perfMetaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: radii.full,
    paddingHorizontal: spacing[3],
    paddingVertical: 5,
    flexShrink: 0,
  },
  statusPillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
  },

  // ── Empty state ──
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing[6],
    gap: spacing[2],
  },
  emptyIconWrap: {
    width: 52,
    height: 52,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[1],
  },
  emptyTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.inkLight,
  },
  emptyBody: {
    fontSize: typography.size.sm,
    color: colors.inkFaint,
    textAlign: 'center',
    lineHeight: typography.size.sm * typography.lineHeight.normal,
    paddingHorizontal: spacing[4],
  },

  // ── AI coaching teaser ──
  coachSection: {
    marginHorizontal: spacing[5],
    marginTop: spacing[4],
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing[5],
    gap: spacing[4],
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  coachTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  coachIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  coachTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[1],
    flexWrap: 'wrap',
  },
  coachTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.ink,
  },
  coachBadge: {
    backgroundColor: '#F5F3FF',
    borderRadius: radii.full,
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
  },
  coachBadgeText: {
    fontSize: 10,
    fontWeight: typography.weight.bold,
    color: '#7C3AED',
    letterSpacing: 0.3,
  },
  coachBody: {
    fontSize: typography.size.sm,
    color: colors.inkLight,
    lineHeight: typography.size.sm * typography.lineHeight.normal,
  },
  coachHints: {
    backgroundColor: '#FAF9FF',
    borderRadius: radii.lg,
    padding: spacing[4],
    gap: spacing[3],
  },
  coachHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  coachHintDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#C4B5FD',
    flexShrink: 0,
  },
  coachHintText: {
    fontSize: typography.size.sm,
    color: colors.inkMid,
  },
});
