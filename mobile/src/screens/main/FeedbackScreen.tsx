import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../lib/supabase';
import {
  fetchHomeData,
  type HomeData,
  type HomeSession,
  type SessionType,
} from '../../services/home';
import { colors, radii, spacing, typography } from '../../theme';

// ─── Constants ────────────────────────────────────────────────────────────────

const BYPASS_AUTH = process.env.EXPO_PUBLIC_BYPASS_AUTH === 'true';
const MOCK_API = process.env.EXPO_PUBLIC_MOCK_API === 'true';

const SESSION_TYPE_LABELS: Record<SessionType, string> = {
  prompt: 'Prompt',
  freeform: 'Freeform',
  flash_notes: 'Flash Notes',
};

// ─── Utilities ────────────────────────────────────────────────────────────────

function formatRelativeDate(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ReviewQueueCard({ count }: { count: number }) {
  const hasReviews = count > 0;
  return (
    <View style={[s.card, hasReviews && s.cardAlert]}>
      <View style={s.cardHeader}>
        <View style={[s.iconWrap, hasReviews && s.iconWrapAlert]}>
          <Ionicons
            name="create-outline"
            size={22}
            color={hasReviews ? colors.error : colors.accent}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.cardTitle}>Give Reviews</Text>
          <Text style={s.cardSubtitle}>
            {hasReviews
              ? `${count} review${count > 1 ? 's' : ''} waiting — complete before due date`
              : 'No reviews assigned right now'}
          </Text>
        </View>
        {hasReviews && (
          <View style={s.countBadge}>
            <Text style={s.countBadgeText}>{count}</Text>
          </View>
        )}
      </View>
      <Button
        label="Open Review Queue"
        variant={hasReviews ? 'primary' : 'secondary'}
        size="md"
        style={s.cardBtn}
        onPress={() => {
          // TODO: review queue screen
        }}
      />
    </View>
  );
}

function ReceivedFeedbackRow({ session }: { session: HomeSession }) {
  const reviewsReceived = session.review_count;
  const reviewsRemaining = Math.max(0, 2 - reviewsReceived);
  const isComplete = reviewsRemaining === 0;

  return (
    <View style={s.feedbackRow}>
      <View style={s.feedbackMain}>
        <Text style={s.feedbackType}>{SESSION_TYPE_LABELS[session.session_type]}</Text>
        <Text style={s.feedbackMeta}>{formatRelativeDate(session.submitted_at)}</Text>
      </View>
      <View style={s.feedbackRight}>
        <Text style={[s.reviewCount, isComplete && s.reviewCountComplete]}>
          {reviewsReceived}/2
        </Text>
        <Text style={s.reviewLabel}>reviews</Text>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function FeedbackScreen() {
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
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  const load = useCallback(async (uid: string, isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const result = await fetchHomeData(uid);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feedback');
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

  const sessionsMissingFeedback = data?.recentSessions.filter((s) => s.review_count < 2) ?? [];
  const sessionsWithFeedback = data?.recentSessions.filter((s) => s.review_count >= 2) ?? [];

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
          <Text style={s.screenTitle}>Reviews</Text>
          <Text style={s.screenSubtitle}>Give and receive structured peer reviews</Text>
        </View>

        {/* ── Review Queue Card ── */}
        <View style={s.section}>
          {loading ? (
            <View style={[s.card, s.cardLoading]}>
              <Text style={s.loadingText}>Loading…</Text>
            </View>
          ) : (
            <ReviewQueueCard count={data?.pendingReviewCount ?? 0} />
          )}
        </View>

        {/* ── Received: Awaiting ── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>AWAITING FEEDBACK</Text>
          {loading ? (
            <Text style={s.emptyText}>Loading…</Text>
          ) : sessionsMissingFeedback.length === 0 ? (
            <View style={s.emptyCard}>
              <Ionicons name="checkmark-circle-outline" size={28} color={colors.success} />
              <Text style={s.emptyCardText}>All your sessions have received feedback</Text>
            </View>
          ) : (
            sessionsMissingFeedback.map((session) => (
              <ReceivedFeedbackRow key={session.id} session={session} />
            ))
          )}
        </View>

        {/* ── Received: Complete ── */}
        {sessionsWithFeedback.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>FEEDBACK RECEIVED</Text>
            {sessionsWithFeedback.map((session) => (
              <ReceivedFeedbackRow key={session.id} session={session} />
            ))}
          </View>
        )}

        {error ? (
          <View style={s.section}>
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* ── How it works ── */}
        <View style={s.howItWorksSection}>
          <Text style={s.sectionLabel}>HOW IT WORKS</Text>
          <View style={s.howStepRow}>
            <View style={s.howStepNum}><Text style={s.howStepNumText}>1</Text></View>
            <Text style={s.howStepText}>Record a session — it costs 2 credits to submit</Text>
          </View>
          <View style={s.howStepRow}>
            <View style={s.howStepNum}><Text style={s.howStepNumText}>2</Text></View>
            <Text style={s.howStepText}>3 pod members are assigned to review your session within 48h</Text>
          </View>
          <View style={s.howStepRow}>
            <View style={s.howStepNum}><Text style={s.howStepNumText}>3</Text></View>
            <Text style={s.howStepText}>Complete reviews to earn credits (+2 each, +1 bonus)</Text>
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
    paddingBottom: 32,
  },

  // ── Header ──
  header: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[5],
    paddingBottom: spacing[4],
    gap: spacing[1],
  },
  screenTitle: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.extrabold,
    color: colors.ink,
    letterSpacing: -0.3,
  },
  screenSubtitle: {
    fontSize: typography.size.sm,
    color: colors.inkLight,
  },

  // ── Section ──
  section: {
    marginHorizontal: spacing[5],
    marginTop: spacing[4],
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: typography.weight.extrabold,
    color: colors.inkFaint,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: spacing[3],
  },

  // ── Review Queue Card ──
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing[5],
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  cardAlert: {
    borderColor: colors.error,
    backgroundColor: '#FFF8F8',
  },
  cardLoading: {
    alignItems: 'center',
    paddingVertical: spacing[8],
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.accentSurface,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconWrapAlert: {
    backgroundColor: colors.errorBg,
  },
  cardTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.ink,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: typography.size.sm,
    color: colors.inkLight,
    lineHeight: typography.size.sm * typography.lineHeight.normal,
  },
  countBadge: {
    backgroundColor: colors.error,
    borderRadius: radii.full,
    minWidth: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[2],
    flexShrink: 0,
  },
  countBadgeText: {
    color: '#FFF',
    fontSize: typography.size.sm,
    fontWeight: typography.weight.extrabold,
  },
  cardBtn: {
    width: '100%',
  },
  loadingText: {
    color: colors.inkFaint,
    fontSize: typography.size.sm,
  },

  // ── Received feedback rows ──
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[4],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: spacing[3],
  },
  feedbackMain: {
    flex: 1,
    gap: spacing[1],
  },
  feedbackType: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.ink,
  },
  feedbackMeta: {
    fontSize: typography.size.sm,
    color: colors.inkLight,
  },
  feedbackRight: {
    alignItems: 'flex-end',
  },
  reviewCount: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.extrabold,
    color: colors.inkLight,
  },
  reviewCountComplete: {
    color: colors.success,
  },
  reviewLabel: {
    fontSize: typography.size.xs,
    color: colors.inkFaint,
  },

  // ── Empty card ──
  emptyCard: {
    backgroundColor: colors.successBg,
    borderRadius: radii.lg,
    padding: spacing[5],
    alignItems: 'center',
    gap: spacing[2],
  },
  emptyCardText: {
    fontSize: typography.size.sm,
    color: colors.success,
    fontWeight: typography.weight.medium,
    textAlign: 'center',
  },
  emptyText: {
    color: colors.inkLight,
    fontSize: typography.size.sm,
    textAlign: 'center',
    paddingVertical: spacing[4],
  },

  // ── How it works ──
  howItWorksSection: {
    marginHorizontal: spacing[5],
    marginTop: spacing[6],
  },
  howStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    paddingVertical: spacing[3],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  howStepNum: {
    width: 22,
    height: 22,
    borderRadius: radii.full,
    backgroundColor: colors.accentSurface,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  howStepNumText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.extrabold,
    color: colors.accent,
  },
  howStepText: {
    flex: 1,
    fontSize: typography.size.sm,
    color: colors.inkMid,
    lineHeight: typography.size.sm * typography.lineHeight.normal,
  },

  // ── Error ──
  errorText: {
    color: colors.error,
    fontSize: typography.size.sm,
    textAlign: 'center',
  },
});
