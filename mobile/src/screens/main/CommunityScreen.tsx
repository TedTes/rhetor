import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radii, spacing, typography } from '../../theme';

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_USER_POD: UserPod | null = null; // set to MOCK_MY_POD to preview "in pod" state

const MOCK_MY_POD: UserPod = {
  name: 'Clarity Crew',
  cohort: 'ESL Professionals',
  focusArea: 'Clarity & Confidence',
  memberCount: 14,
  sessionCountThisWeek: 7,
  activeMembersThisWeek: 9,
};

const MOCK_AVAILABLE_PODS: AvailablePod[] = [
  {
    id: 'p1',
    name: 'Sharp Speakers',
    cohort: 'Interview Prep',
    focusArea: 'Clarity',
    memberCount: 11,
    capacity: 30,
    activeThisWeek: true,
  },
  {
    id: 'p2',
    name: 'Fluency Lab',
    cohort: 'ESL Professionals',
    focusArea: 'Pacing & Fluency',
    memberCount: 18,
    capacity: 30,
    activeThisWeek: true,
  },
  {
    id: 'p3',
    name: 'Pitch Perfect',
    cohort: 'Executive Communication',
    focusArea: 'Persuasion',
    memberCount: 8,
    capacity: 30,
    activeThisWeek: false,
  },
  {
    id: 'p4',
    name: 'Stage Ready',
    cohort: 'Public Speaking',
    focusArea: 'Presence',
    memberCount: 22,
    capacity: 30,
    activeThisWeek: true,
  },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type UserPod = {
  name: string;
  cohort: string;
  focusArea: string;
  memberCount: number;
  sessionCountThisWeek: number;
  activeMembersThisWeek: number;
};

type AvailablePod = {
  id: string;
  name: string;
  cohort: string;
  focusArea: string;
  memberCount: number;
  capacity: number;
  activeThisWeek: boolean;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function MyPodBlock({ pod }: { pod: UserPod }) {
  return (
    <View style={s.myPodCard}>
      <View style={s.myPodTopRow}>
        <View style={s.myPodIconWrap}>
          <Ionicons name="people" size={20} color={colors.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.myPodName}>{pod.name}</Text>
          <Text style={s.myPodCohort}>{pod.cohort} · {pod.focusArea}</Text>
        </View>
        <View style={s.inPodBadge}>
          <Text style={s.inPodBadgeText}>Member</Text>
        </View>
      </View>
      <View style={s.myPodStats}>
        <View style={s.myPodStat}>
          <Text style={s.myPodStatValue}>{pod.memberCount}</Text>
          <Text style={s.myPodStatLabel}>members</Text>
        </View>
        <View style={s.myPodStatDivider} />
        <View style={s.myPodStat}>
          <Text style={s.myPodStatValue}>{pod.activeMembersThisWeek}</Text>
          <Text style={s.myPodStatLabel}>active this week</Text>
        </View>
        <View style={s.myPodStatDivider} />
        <View style={s.myPodStat}>
          <Text style={s.myPodStatValue}>{pod.sessionCountThisWeek}</Text>
          <Text style={s.myPodStatLabel}>sessions</Text>
        </View>
      </View>
    </View>
  );
}

function NoPodBlock() {
  return (
    <View style={s.noPodCard}>
      <View style={s.noPodIconWrap}>
        <Ionicons name="people-outline" size={26} color={colors.inkFaint} />
      </View>
      <Text style={s.noPodTitle}>You're not in a pod yet</Text>
      <Text style={s.noPodBody}>
        Pods are small groups (up to 30) within a cohort. Members record sessions and give each other structured feedback. Join one below to get started.
      </Text>
    </View>
  );
}

function PodRow({
  pod,
  joining,
  onJoin,
}: {
  pod: AvailablePod;
  joining: boolean;
  onJoin: () => void;
}) {
  const spotsLeft = pod.capacity - pod.memberCount;
  const isFull = spotsLeft <= 0;

  return (
    <View style={s.podRow}>
      <View style={s.podRowLeft}>
        <View style={s.podRowTopLine}>
          <Text style={s.podRowName}>{pod.name}</Text>
          {pod.activeThisWeek && (
            <View style={s.activeDot} accessibilityLabel="Active this week" />
          )}
        </View>
        <Text style={s.podRowMeta}>
          {pod.cohort} · {pod.focusArea}
        </Text>
        <Text style={s.podRowCapacity}>
          {pod.memberCount}/{pod.capacity} members
          {!isFull ? `  ·  ${spotsLeft} spots left` : '  · Full'}
        </Text>
      </View>
      <TouchableOpacity
        style={[s.joinBtn, isFull && s.joinBtnDisabled]}
        onPress={onJoin}
        disabled={isFull || joining}
        accessibilityRole="button"
        accessibilityLabel={`Join ${pod.name}`}
        accessibilityState={{ disabled: isFull }}
        activeOpacity={0.75}
      >
        <Text style={[s.joinBtnText, isFull && s.joinBtnTextDisabled]}>
          {joining ? 'Joining…' : isFull ? 'Full' : 'Join'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function CommunityScreen() {
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const userPod = MOCK_USER_POD;

  async function handleJoin(pod: AvailablePod) {
    setJoiningId(pod.id);
    // TODO: call join-pod edge function
    await new Promise<void>((r) => setTimeout(r, 800));
    setJoiningId(null);
  }

  return (
    <SafeAreaView style={s.root} edges={['top', 'left', 'right']}>
      <View style={s.container}>
        <ScrollView
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Header ── */}
          <View style={s.header}>
            <Text style={s.screenTitle}>Pod</Text>
            <Text style={s.screenSubtitle}>
              Find your practice group and build a feedback habit
            </Text>
          </View>

          {/* ── Your Pod state ── */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>YOUR POD</Text>
            {userPod ? <MyPodBlock pod={userPod} /> : <NoPodBlock />}
          </View>

          {/* ── Discover / Join ── */}
          {!userPod && (
            <View style={s.section}>
              <Text style={s.sectionLabel}>AVAILABLE PODS</Text>
              {MOCK_AVAILABLE_PODS.length === 0 ? (
                <View style={s.emptyPods}>
                  <Text style={s.emptyPodsText}>
                    No pods available right now. Tap + to create one.
                  </Text>
                </View>
              ) : (
                <View style={s.podList}>
                  {MOCK_AVAILABLE_PODS.map((pod, index) => (
                    <React.Fragment key={pod.id}>
                      {index > 0 && <View style={s.rowDivider} />}
                      <PodRow
                        pod={pod}
                        joining={joiningId === pod.id}
                        onJoin={() => handleJoin(pod)}
                      />
                    </React.Fragment>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* ── Cohort info ── */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>YOUR COHORT</Text>
            <View style={s.cohortCard}>
              <View style={s.cohortTopRow}>
                <View style={s.cohortIconWrap}>
                  <Ionicons name="business-outline" size={18} color={colors.success} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.cohortName}>ESL Professionals</Text>
                  <Text style={s.cohortFocus}>Focus: Clarity &amp; Confidence</Text>
                </View>
              </View>
              <Text style={s.cohortNote}>
                Pods form within your cohort. Members share similar speaking goals and give
                feedback that's relevant to your context.
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* ── Create Pod FAB ── */}
        {!userPod && (
          <TouchableOpacity
            style={s.fab}
            onPress={() => {
              // TODO: create pod flow
            }}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Create a new pod"
          >
            <Ionicons name="add" size={28} color={colors.white} />
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#E8EDF4',
  },
  container: {
    flex: 1,
    position: 'relative',
  },
  scrollContent: {
    paddingBottom: 100,
  },

  // ── Header ──
  header: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[5],
    paddingBottom: spacing[3],
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
    lineHeight: typography.size.sm * typography.lineHeight.normal,
  },

  // ── Section wrapper ──
  section: {
    marginHorizontal: spacing[5],
    marginTop: spacing[5],
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: typography.weight.extrabold,
    color: colors.inkFaint,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: spacing[3],
  },

  // ── My Pod (active) ──
  myPodCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing[5],
    borderWidth: 1.5,
    borderColor: colors.accentLight,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  myPodTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  myPodIconWrap: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    backgroundColor: colors.accentSurface,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  myPodName: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.ink,
  },
  myPodCohort: {
    fontSize: typography.size.sm,
    color: colors.inkLight,
    marginTop: 1,
  },
  inPodBadge: {
    backgroundColor: colors.accentSurface,
    borderRadius: radii.full,
    paddingHorizontal: spacing[3],
    paddingVertical: 5,
  },
  inPodBadgeText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.accent,
    letterSpacing: 0.3,
  },
  myPodStats: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing[4],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  myPodStat: {
    flex: 1,
    alignItems: 'center',
  },
  myPodStatValue: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.extrabold,
    color: colors.ink,
  },
  myPodStatLabel: {
    fontSize: typography.size.xs,
    color: colors.inkFaint,
    marginTop: 2,
    textAlign: 'center',
  },
  myPodStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
  },

  // ── No Pod ──
  noPodCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing[5],
    alignItems: 'center',
    gap: spacing[2],
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  noPodIconWrap: {
    width: 52,
    height: 52,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[1],
  },
  noPodTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.ink,
    textAlign: 'center',
  },
  noPodBody: {
    fontSize: typography.size.sm,
    color: colors.inkLight,
    textAlign: 'center',
    lineHeight: typography.size.sm * typography.lineHeight.normal,
  },

  // ── Pod list ──
  podList: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: spacing[5],
  },
  podRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    gap: spacing[3],
  },
  podRowLeft: {
    flex: 1,
    gap: 3,
  },
  podRowTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  podRowName: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.ink,
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  podRowMeta: {
    fontSize: typography.size.sm,
    color: colors.inkLight,
  },
  podRowCapacity: {
    fontSize: typography.size.xs,
    color: colors.inkFaint,
    marginTop: 1,
  },
  joinBtn: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingHorizontal: spacing[4],
    paddingVertical: 10,
    flexShrink: 0,
  },
  joinBtnDisabled: {
    backgroundColor: colors.surfaceAlt,
  },
  joinBtnText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.white,
  },
  joinBtnTextDisabled: {
    color: colors.inkFaint,
  },

  // ── Empty pods ──
  emptyPods: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing[6],
    alignItems: 'center',
  },
  emptyPodsText: {
    fontSize: typography.size.sm,
    color: colors.inkFaint,
    textAlign: 'center',
    lineHeight: typography.size.sm * typography.lineHeight.normal,
  },

  // ── Cohort card ──
  cohortCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing[5],
    gap: spacing[3],
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cohortTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  cohortIconWrap: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    backgroundColor: colors.successBg,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cohortName: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.ink,
  },
  cohortFocus: {
    fontSize: typography.size.sm,
    color: colors.inkLight,
    marginTop: 1,
  },
  cohortNote: {
    fontSize: typography.size.sm,
    color: colors.inkLight,
    lineHeight: typography.size.sm * typography.lineHeight.normal,
  },

  // ── FAB ──
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
});
