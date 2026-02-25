import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../lib/supabase';
import { GOAL_TAG_LABELS, type GoalTag } from '../../types/onboarding';
import { colors, radii, shadows, spacing, typography } from '../../theme';
import {
  createSession,
  fetchHomeData,
  type CreatedSession,
  type HomeData,
  type HomeSession,
  type SessionStatus,
  type SessionType,
} from '../../services/home';

// ─── Constants ───────────────────────────────────────────────────────────────

const BYPASS_AUTH = process.env.EXPO_PUBLIC_BYPASS_AUTH === 'true';
const MOCK_API = process.env.EXPO_PUBLIC_MOCK_API === 'true';

const SESSION_TYPE_LABELS: Record<SessionType, string> = {
  prompt: 'Prompt',
  freeform: 'Freeform',
  flash_notes: 'Flash Notes',
};

const STATUS_CONFIG: Record<SessionStatus, { label: string; bg: string; text: string }> = {
  recorded: { label: 'Recorded', bg: colors.surfaceAlt, text: colors.inkLight },
  processing: { label: 'Processing', bg: colors.accentSurface, text: colors.accent },
  ready: { label: 'Ready', bg: colors.successBg, text: colors.success },
  failed: { label: 'Failed', bg: colors.errorBg, text: colors.error },
};

// ─── Utilities ────────────────────────────────────────────────────────────────

function formatRelativeDate(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getRecommendedStep(data: HomeData): string {
  if (data.profile.credits < 2) {
    return 'Complete a peer review to earn 2 credits before your next session.';
  }
  if (data.pendingReviewCount > 0) {
    const n = data.pendingReviewCount;
    return `You have ${n} review${n > 1 ? 's' : ''} due. Complete ${n > 1 ? 'one' : 'it'} to grow your reputation.`;
  }
  if (data.recentSessions.length === 0) {
    return 'Record your first practice session to start the feedback loop.';
  }
  if (data.sessionsAwaitingFeedback > 0) {
    return 'Your sessions are collecting feedback. Stay active and record another.';
  }
  return "You're on a roll. Record another session to keep improving.";
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function usePulse(): Animated.Value {
  const opacity = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 900, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);
  return opacity;
}

function SkeletonBox({
  width,
  height,
  style,
}: {
  width?: number | `${number}%`;
  height: number;
  style?: ViewStyle;
}) {
  const opacity = usePulse();
  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radii.md, backgroundColor: colors.border, opacity },
        style,
      ]}
    />
  );
}

function LoadingSkeleton() {
  return (
    <ScrollView
      contentContainerStyle={skeletonStyles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={skeletonStyles.header}>
        <View style={skeletonStyles.headerLeft}>
          <SkeletonBox width={160} height={14} />
          <SkeletonBox width={200} height={22} style={{ marginTop: spacing[2] }} />
          <SkeletonBox width={240} height={14} style={{ marginTop: spacing[1] }} />
        </View>
        <SkeletonBox width={64} height={52} />
      </View>

      {/* Action card */}
      <View style={[skeletonStyles.card]}>
        <SkeletonBox width="100%" height={50} />
        <SkeletonBox width="100%" height={50} style={{ marginTop: spacing[3] }} />
        <View style={skeletonStyles.statRow}>
          <SkeletonBox width={110} height={36} />
          <SkeletonBox width={110} height={36} />
        </View>
      </View>

      {/* Today */}
      <View style={skeletonStyles.card}>
        <SkeletonBox width={100} height={13} />
        <View style={skeletonStyles.chipRow}>
          {[80, 100, 70].map((w, i) => (
            <SkeletonBox key={i} width={w} height={30} style={{ borderRadius: radii.full }} />
          ))}
        </View>
        <SkeletonBox width="90%" height={13} style={{ marginTop: spacing[3] }} />
        <SkeletonBox width="70%" height={13} style={{ marginTop: spacing[1] }} />
      </View>

      {/* Activity */}
      <View style={skeletonStyles.card}>
        <SkeletonBox width={130} height={13} />
        {[1, 2, 3].map((i) => (
          <View key={i} style={skeletonStyles.sessionSkeleton}>
            <View style={{ flex: 1, gap: spacing[1] }}>
              <SkeletonBox width={120} height={13} />
              <SkeletonBox width={80} height={11} />
            </View>
            <SkeletonBox width={56} height={22} style={{ borderRadius: radii.full }} />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const skeletonStyles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[5],
    paddingBottom: spacing[12],
    gap: spacing[4],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing[3],
  },
  headerLeft: { gap: spacing[1] },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing[5],
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing[3],
  },
  statRow: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[1],
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing[2],
    flexWrap: 'wrap',
  },
  sessionSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});

// ─── Sub-components ───────────────────────────────────────────────────────────

function Banner({ type, message }: { type: 'warning' | 'info'; message: string }) {
  const isWarning = type === 'warning';
  return (
    <View
      style={[bannerStyles.container, isWarning ? bannerStyles.warning : bannerStyles.info]}
      accessibilityRole="alert"
    >
      <Text
        style={[bannerStyles.text, isWarning ? bannerStyles.textWarning : bannerStyles.textInfo]}
      >
        {message}
      </Text>
    </View>
  );
}

const bannerStyles = StyleSheet.create({
  container: {
    borderRadius: radii.md,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderWidth: 1,
  },
  warning: { backgroundColor: colors.errorBg, borderColor: colors.error },
  info: { backgroundColor: colors.accentSurface, borderColor: colors.accentLight },
  text: { fontSize: typography.size.sm, lineHeight: typography.size.sm * typography.lineHeight.normal },
  textWarning: { color: colors.error, fontWeight: typography.weight.medium },
  textInfo: { color: colors.accent, fontWeight: typography.weight.medium },
});

function CreditsBadge({ credits }: { credits: number }) {
  const isLow = credits < 2;
  return (
    <View style={[badgeStyles.container, isLow && badgeStyles.containerLow]}>
      <Text style={[badgeStyles.count, isLow && badgeStyles.countLow]}>{credits}</Text>
      <Text style={[badgeStyles.label, isLow && badgeStyles.labelLow]}>credits</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSurface,
    borderWidth: 1,
    borderColor: colors.accentLight,
    borderRadius: radii.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    minWidth: 60,
  },
  containerLow: { backgroundColor: colors.errorBg, borderColor: colors.error },
  count: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.extrabold,
    color: colors.accent,
    lineHeight: typography.size.xl * typography.lineHeight.tight,
  },
  countLow: { color: colors.error },
  label: { fontSize: typography.size.xs, color: colors.accent, fontWeight: typography.weight.medium },
  labelLow: { color: colors.error },
});

function GoalChip({ goal }: { goal: string }) {
  const label = GOAL_TAG_LABELS[goal as GoalTag] ?? goal;
  return (
    <View style={chipStyles.chip}>
      <Text style={chipStyles.label}>{label}</Text>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    height: 32,
    paddingHorizontal: spacing[3],
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.accentLight,
    backgroundColor: colors.accentSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.accent,
  },
});

function QuickStat({ value, label }: { value: number; label: string }) {
  const hasItems = value > 0;
  return (
    <View style={[statStyles.container, hasItems && statStyles.containerActive]}>
      <Text style={[statStyles.value, hasItems && statStyles.valueActive]}>{value}</Text>
      <Text style={[statStyles.label, hasItems && statStyles.labelActive]}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  containerActive: {
    backgroundColor: colors.accentSurface,
    borderColor: colors.accentLight,
  },
  value: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.extrabold,
    color: colors.inkMid,
    lineHeight: typography.size.xl * typography.lineHeight.tight,
  },
  valueActive: { color: colors.accent },
  label: {
    fontSize: typography.size.xs,
    color: colors.inkFaint,
    fontWeight: typography.weight.medium,
    textAlign: 'center',
    marginTop: 2,
  },
  labelActive: { color: colors.accent },
});

function SessionRow({ session }: { session: HomeSession }) {
  const status = STATUS_CONFIG[session.status];
  const isFlashNotes = session.session_type === 'flash_notes';

  return (
    <View style={sessionStyles.row}>
      <View style={sessionStyles.main}>
        <View style={sessionStyles.titleRow}>
          <Text style={sessionStyles.type}>
            {SESSION_TYPE_LABELS[session.session_type]}
          </Text>
          <View style={[sessionStyles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[sessionStyles.statusText, { color: status.text }]}>
              {status.label}
            </Text>
          </View>
        </View>
        <View style={sessionStyles.metaRow}>
          <Text style={sessionStyles.meta}>{formatRelativeDate(session.submitted_at)}</Text>
          {isFlashNotes && session.memory_score !== null && (
            <Text style={sessionStyles.meta}>
              {' · '}
              {Math.round(session.memory_score * 100)}% memory
            </Text>
          )}
          <Text style={sessionStyles.meta}>
            {' · '}{session.review_count}/2 reviews
          </Text>
        </View>
      </View>
    </View>
  );
}

const sessionStyles = StyleSheet.create({
  row: {
    paddingVertical: spacing[4],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  main: { gap: spacing[1] },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  type: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.ink,
  },
  statusBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  statusText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
  },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap' },
  meta: {
    fontSize: typography.size.sm,
    color: colors.inkLight,
  },
});

function EmptySessionsState() {
  return (
    <View style={emptyStyles.container}>
      <Text style={emptyStyles.text}>No sessions yet</Text>
      <Text style={emptyStyles.hint}>
        Record your first session to start building your practice history.
      </Text>
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  container: {
    paddingTop: spacing[6],
    paddingBottom: spacing[2],
    alignItems: 'center',
    gap: spacing[2],
  },
  text: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.inkMid,
  },
  hint: {
    fontSize: typography.size.sm,
    color: colors.inkFaint,
    textAlign: 'center',
    lineHeight: typography.size.sm * typography.lineHeight.normal,
  },
});

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={sectionStyles.container}>
      <Text style={sectionStyles.title}>{title}</Text>
      {children}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    paddingBottom: spacing[5],
    ...shadows.sm,
  },
  title: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.extrabold,
    color: colors.inkFaint,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: spacing[4],
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function HomeScreen() {
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [creatingSession, setCreatingSession] = useState(false);
  const [createdSession, setCreatedSession] = useState<CreatedSession | null>(null);

  useEffect(() => {
    if (BYPASS_AUTH || MOCK_API) {
      setUserId('mock-user-id');
      return;
    }

    supabase.auth
      .getUser()
      .then(({ data: { user }, error: userErr }) => {
        if (userErr) {
          setError(userErr.message);
          setLoading(false);
          return;
        }

        if (user) {
          setUserId(user.id);
        } else {
          setError('Session not found. Please sign in again.');
          setLoading(false);
        }
      })
      .catch(() => {
        setError('Failed to resolve session. Please sign in again.');
        setLoading(false);
      });
  }, []);

  const load = useCallback(
    async (uid: string, isRefresh = false) => {
      if (!isRefresh) setLoading(true);
      setError(null);
      try {
        const result = await fetchHomeData(uid);
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (userId) load(userId);
  }, [userId, load]);

  async function handleRefresh() {
    if (!userId) return;
    setRefreshing(true);
    await load(userId, true);
  }

  async function handleSignOut() {
    const { error: signOutErr } = await supabase.auth.signOut();
    if (signOutErr) {
      setError(signOutErr.message);
    }
  }

  async function handleStartPracticeSession() {
    setError(null);
    setCreatedSession(null);
    setCreatingSession(true);
    try {
      const created = await createSession({
        session_type: 'prompt',
        focus_tags: ['clarity'],
        audio_ext: 'm4a',
      });
      setCreatedSession(created);
      if (userId) {
        await load(userId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session');
    } finally {
      setCreatingSession(false);
    }
  }

  // ── Error state ──
  if (error && !data) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.errorState}>
          <Text style={styles.errorTitle}>Couldn't load your dashboard</Text>
          <Text style={styles.errorBody}>{error}</Text>
          {userId && (
            <Button
              label="Try again"
              onPress={() => load(userId)}
              style={{ marginTop: spacing[4] }}
            />
          )}
        </View>
      </SafeAreaView>
    );
  }

  // ── Loading skeleton ──
  if (loading && !data) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'left', 'right', 'bottom']}>
        <LoadingSkeleton />
      </SafeAreaView>
    );
  }

  const d = data!;
  const recommended = getRecommendedStep(d);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
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
        {/* ── 1. Header ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Hey, {d.profile.pseudonym}</Text>
            <Text style={styles.greetingSubtitle}>Keep your momentum going.</Text>
          </View>
          <CreditsBadge credits={d.profile.credits} />
        </View>

        {/* ── Alert banners ── */}
        {d.profile.credits < 2 && (
          <Banner
            type="warning"
            message="You need credits to submit a new session. Complete a pending review to earn 2 credits."
          />
        )}
        {d.pendingReviewCount > 0 && (
          <Banner
            type="info"
            message={`You have ${d.pendingReviewCount} pending review${d.pendingReviewCount > 1 ? 's' : ''} in your queue.`}
          />
        )}
        {error && <Banner type="warning" message={error} />}
        {createdSession && (
          <Banner
            type="info"
            message={`Session created: ${createdSession.session_id.slice(0, 8)}... Ready for audio upload.`}
          />
        )}

        {/* ── 2. Primary action card ── */}
        <Section title="Actions">
          <Button
            label="Start Practice Session"
            size="lg"
            style={styles.fullWidth}
            loading={creatingSession}
            onPress={handleStartPracticeSession}
          />
          <Button
            label={
              d.pendingReviewCount > 0
                ? `Review Queue (${d.pendingReviewCount})`
                : 'Review Queue'
            }
            variant="secondary"
            size="lg"
            style={[styles.fullWidth, { marginTop: spacing[3] }]}
            onPress={() => {
              // TODO: navigate to review queue
            }}
          />
          <View style={styles.statRow}>
            <QuickStat value={d.pendingReviewCount} label="Pending reviews" />
            <QuickStat value={d.sessionsAwaitingFeedback} label="Awaiting feedback" />
          </View>
        </Section>

        {/* ── 3. Today panel ── */}
        <Section title="Today">
          {d.profile.goals.length > 0 && (
            <View style={styles.focusBlock}>
              <Text style={styles.focusLabel}>Your focus</Text>
              <View style={styles.chipRow}>
                {d.profile.goals.map((g) => (
                  <GoalChip key={g} goal={g} />
                ))}
              </View>
            </View>
          )}
          <View style={styles.recommendedBlock}>
            <Text style={styles.recommendedLabel}>Recommended next step</Text>
            <Text style={styles.recommendedText}>{recommended}</Text>
          </View>
        </Section>

        {/* ── 4. Recent activity ── */}
        <Section title="Recent Sessions">
          {d.recentSessions.length === 0 ? (
            <EmptySessionsState />
          ) : (
            d.recentSessions.map((s) => <SessionRow key={s.id} session={s} />)
          )}
        </Section>

        {/* ── Sign out ── */}
        <TouchableOpacity
          onPress={handleSignOut}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          style={styles.signOut}
        >
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[5],
    paddingBottom: spacing[12],
    gap: spacing[4],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: spacing[2],
  },
  headerLeft: {
    flex: 1,
    gap: spacing[1],
    paddingRight: spacing[4],
  },
  greeting: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.extrabold,
    color: colors.ink,
    letterSpacing: -0.3,
    lineHeight: typography.size['2xl'] * typography.lineHeight.tight,
  },
  greetingSubtitle: {
    fontSize: typography.size.md,
    color: colors.inkLight,
  },
  fullWidth: {
    width: '100%',
  },
  statRow: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[4],
  },
  focusBlock: {
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  focusLabel: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.inkMid,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  recommendedBlock: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    padding: spacing[4],
    gap: spacing[1],
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  recommendedLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.extrabold,
    color: colors.accent,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  recommendedText: {
    fontSize: typography.size.sm,
    color: colors.inkMid,
    lineHeight: typography.size.sm * typography.lineHeight.normal,
  },
  signOut: {
    alignSelf: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[5],
    marginTop: spacing[2],
  },
  signOutText: {
    fontSize: typography.size.sm,
    color: colors.inkFaint,
    fontWeight: typography.weight.medium,
  },
  // Error state
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[8],
    gap: spacing[2],
  },
  errorTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.ink,
    textAlign: 'center',
  },
  errorBody: {
    fontSize: typography.size.sm,
    color: colors.inkLight,
    textAlign: 'center',
    lineHeight: typography.size.sm * typography.lineHeight.normal,
  },
});
