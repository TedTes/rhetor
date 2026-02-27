import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/Button';
import { colors, radii, spacing, typography } from '../../theme';

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({
  icon,
  iconColor,
  iconBg,
  title,
  subtitle,
  badge,
  children,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  iconBg: string;
  title: string;
  subtitle: string;
  badge?: string;
  children?: React.ReactNode;
}) {
  return (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <View style={[s.iconWrap, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={22} color={iconColor} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={s.titleRow}>
            <Text style={s.cardTitle}>{title}</Text>
            {badge ? (
              <View style={s.comingSoonBadge}>
                <Text style={s.comingSoonText}>{badge}</Text>
              </View>
            ) : null}
          </View>
          <Text style={s.cardSubtitle}>{subtitle}</Text>
        </View>
      </View>
      {children}
    </View>
  );
}

function StatChip({ value, label }: { value: string | number; label: string }) {
  return (
    <View style={s.statChip}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function CommunityScreen() {
  return (
    <SafeAreaView style={s.root} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={s.header}>
          <Text style={s.screenTitle}>Community</Text>
          <Text style={s.screenSubtitle}>Your pod, cohort, and AI coach</Text>
        </View>

        {/* ── Pod Card ── */}
        <View style={s.section}>
          <SectionCard
            icon="people"
            iconColor={colors.accent}
            iconBg={colors.accentSurface}
            title="Your Pod"
            subtitle="Practice with a small group of peers in your cohort who exchange structured feedback."
          >
            <View style={s.statsRow}>
              <StatChip value="—" label="members" />
              <StatChip value="—" label="active" />
              <StatChip value="—" label="sessions this week" />
            </View>
            <View style={s.podActions}>
              <Button
                label="Create Pod"
                variant="secondary"
                size="md"
                style={{ flex: 1 }}
                onPress={() => {
                  // TODO: create pod flow
                }}
              />
              <Button
                label="Join Pod"
                size="md"
                style={{ flex: 1 }}
                onPress={() => {
                  // TODO: join pod flow
                }}
              />
            </View>
          </SectionCard>
        </View>

        {/* ── AI Communication Coach ── */}
        <View style={s.section}>
          <SectionCard
            icon="sparkles"
            iconColor="#7C3AED"
            iconBg="#F5F3FF"
            title="AI Communication Coach"
            subtitle="Your coach analyzes each session — clarity, confidence, pacing, filler words — and gives personalized recommendations."
            badge="Coming Soon"
          >
            <View style={s.coachPreview}>
              <View style={s.coachInsightRow}>
                <View style={[s.coachDot, { backgroundColor: colors.accent }]} />
                <Text style={s.coachInsightText}>Clarity score will appear after your first session</Text>
              </View>
              <View style={s.coachInsightRow}>
                <View style={[s.coachDot, { backgroundColor: '#7C3AED' }]} />
                <Text style={s.coachInsightText}>Pacing analysis across all sessions over time</Text>
              </View>
              <View style={s.coachInsightRow}>
                <View style={[s.coachDot, { backgroundColor: colors.success }]} />
                <Text style={s.coachInsightText}>Confidence trend from Flash Notes memory scores</Text>
              </View>
            </View>
          </SectionCard>
        </View>

        {/* ── Cohort ── */}
        <View style={s.section}>
          <SectionCard
            icon="business"
            iconColor={colors.success}
            iconBg={colors.successBg}
            title="Your Cohort"
            subtitle="You're part of a larger cohort of speakers with similar goals. Pods form within cohorts."
          >
            <View style={s.cohortInfo}>
              <View style={s.cohortTagRow}>
                <View style={s.cohortTag}>
                  <Text style={s.cohortTagText}>ESL Professionals</Text>
                </View>
                <View style={s.cohortTag}>
                  <Text style={s.cohortTagText}>Clarity</Text>
                </View>
              </View>
              <Text style={s.cohortNote}>
                Cohort membership is assigned during onboarding and cannot be changed.
              </Text>
            </View>
          </SectionCard>
        </View>

        {/* ── Group Activity (placeholder) ── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>POD ACTIVITY</Text>
          <View style={s.activityEmpty}>
            <Ionicons name="chatbubbles-outline" size={32} color={colors.inkFaint} />
            <Text style={s.activityEmptyTitle}>No activity yet</Text>
            <Text style={s.activityEmptyBody}>
              Join or create a pod to start seeing activity from your practice partners.
            </Text>
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

  // ── Card ──
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing[5],
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
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
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: 2,
    flexWrap: 'wrap',
  },
  cardTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.ink,
  },
  cardSubtitle: {
    fontSize: typography.size.sm,
    color: colors.inkLight,
    lineHeight: typography.size.sm * typography.lineHeight.normal,
  },

  // ── Coming soon badge ──
  comingSoonBadge: {
    backgroundColor: '#F5F3FF',
    borderRadius: radii.full,
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
  },
  comingSoonText: {
    fontSize: 10,
    fontWeight: typography.weight.bold,
    color: '#7C3AED',
    letterSpacing: 0.3,
  },

  // ── Pod stats ──
  statsRow: {
    flexDirection: 'row',
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  statChip: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    padding: spacing[3],
    alignItems: 'center',
  },
  statValue: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.extrabold,
    color: colors.ink,
  },
  statLabel: {
    fontSize: typography.size.xs,
    color: colors.inkFaint,
    marginTop: 2,
  },
  podActions: {
    flexDirection: 'row',
    gap: spacing[3],
  },

  // ── AI coach preview ──
  coachPreview: {
    backgroundColor: '#FAF9FF',
    borderRadius: radii.lg,
    padding: spacing[4],
    gap: spacing[3],
  },
  coachInsightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  coachDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
    flexShrink: 0,
  },
  coachInsightText: {
    flex: 1,
    fontSize: typography.size.sm,
    color: colors.inkMid,
    lineHeight: typography.size.sm * typography.lineHeight.normal,
  },

  // ── Cohort ──
  cohortInfo: {
    gap: spacing[3],
  },
  cohortTagRow: {
    flexDirection: 'row',
    gap: spacing[2],
    flexWrap: 'wrap',
  },
  cohortTag: {
    backgroundColor: colors.successBg,
    borderRadius: radii.full,
    paddingHorizontal: spacing[3],
    paddingVertical: 6,
  },
  cohortTagText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.success,
  },
  cohortNote: {
    fontSize: typography.size.xs,
    color: colors.inkFaint,
    lineHeight: typography.size.xs * typography.lineHeight.normal,
  },

  // ── Activity empty ──
  activityEmpty: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing[8],
    alignItems: 'center',
    gap: spacing[2],
  },
  activityEmptyTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.inkLight,
    marginTop: spacing[1],
  },
  activityEmptyBody: {
    fontSize: typography.size.sm,
    color: colors.inkFaint,
    textAlign: 'center',
    lineHeight: typography.size.sm * typography.lineHeight.normal,
  },
});
