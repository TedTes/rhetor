import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import type { MainStackParams, RecordSessionContext } from '../../navigation/MainNavigator';
import {
  createSession,
  fetchHomeData,
  type HomeSession,
  type SessionStatus,
  type SessionType,
} from '../../services/home';
import { colors, radii, spacing, typography } from '../../theme';

// ─── Niches ───────────────────────────────────────────────────────────────────

type Niche = {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  iconBg: string;
  focusTags: string[];
  sessionType: SessionType;
  promptTitle: string;
  promptBody: string;
  hints: string[];
};

const NICHES: Niche[] = [
  {
    id: 'interview',
    label: 'Interview Prep',
    description: 'Practice answering behavioral and technical interview questions under pressure.',
    icon: 'briefcase-outline',
    iconColor: '#1D4ED8',
    iconBg: '#EFF6FF',
    focusTags: ['interview', 'clarity', 'confidence'],
    sessionType: 'prompt',
    promptTitle: 'Behavioral Interview Story',
    promptBody:
      'Tell me about a time you faced a difficult challenge at work. Explain the situation, what you did, and the measurable result.',
    hints: ['Use STAR format', 'Include one specific metric', 'End with your key learning'],
  },
  {
    id: 'sales',
    label: 'Sales Pitch',
    description: 'Sharpen your pitch structure, objection handling, and closing technique.',
    icon: 'trending-up-outline',
    iconColor: '#059669',
    iconBg: '#ECFDF5',
    focusTags: ['sales', 'persuasion', 'clarity'],
    sessionType: 'prompt',
    promptTitle: 'One-Minute Product Pitch',
    promptBody:
      'Pitch a product or service to a skeptical buyer. Clarify the core problem, your solution, and why they should act now.',
    hints: ['Lead with customer pain', 'Give one proof point', 'Close with a clear call to action'],
  },
  {
    id: 'presentation',
    label: 'Public Speaking',
    description: 'Build fluency and presence for talks, demos, or keynote-style delivery.',
    icon: 'easel-outline',
    iconColor: '#7C3AED',
    iconBg: '#F5F3FF',
    focusTags: ['presentation', 'pacing', 'structure'],
    sessionType: 'freeform',
    promptTitle: '3-Minute Mini Talk',
    promptBody:
      'Deliver a short presentation on a topic you know well, designed for a mixed audience with little prior context.',
    hints: ['Open with a hook', 'Use 3 clear sections', 'Finish with one takeaway'],
  },
  {
    id: 'negotiation',
    label: 'Negotiation',
    description: 'Practice calm, assertive language for salary talks, deals, and conflict.',
    icon: 'git-merge-outline',
    iconColor: '#D97706',
    iconBg: '#FFFBEB',
    focusTags: ['negotiation', 'assertiveness', 'pacing'],
    sessionType: 'prompt',
    promptTitle: 'Compensation Negotiation',
    promptBody:
      'Practice asking for a better offer using calm, assertive language. Explain your value and propose a specific counter.',
    hints: ['Anchor with evidence', 'State a concrete ask', 'Stay collaborative, not defensive'],
  },
  {
    id: 'networking',
    label: 'Networking',
    description: 'Craft a concise, memorable introduction and keep conversations flowing.',
    icon: 'people-outline',
    iconColor: '#0891B2',
    iconBg: '#ECFEFF',
    focusTags: ['networking', 'confidence', 'conciseness'],
    sessionType: 'freeform',
    promptTitle: 'Networking Introduction',
    promptBody:
      'Introduce yourself to a new professional contact in under 60 seconds. Share who you are, what you do, and what you are looking for.',
    hints: ['Keep it concise', 'Sound natural, not scripted', 'End with an invitation/question'],
  },
  {
    id: 'storytelling',
    label: 'Storytelling',
    description: 'Develop compelling narratives that stick with your audience.',
    icon: 'book-outline',
    iconColor: '#BE185D',
    iconBg: '#FDF2F8',
    focusTags: ['storytelling', 'engagement', 'structure'],
    sessionType: 'freeform',
    promptTitle: 'Personal Story With Insight',
    promptBody:
      'Tell a short story about a real moment that changed your perspective. Make the lesson clear and relevant.',
    hints: ['Set scene quickly', 'Describe turning point', 'Tie to practical insight'],
  },
  {
    id: 'meeting',
    label: 'Team Meetings',
    description: 'Be concise and persuasive in standups, syncs, and cross-functional calls.',
    icon: 'people-circle-outline',
    iconColor: '#64748B',
    iconBg: '#F1F5F9',
    focusTags: ['meeting', 'conciseness', 'clarity'],
    sessionType: 'freeform',
    promptTitle: 'Team Update',
    promptBody:
      'Give a concise team update covering what is done, what is blocked, and what support you need next.',
    hints: ['Use clear status language', 'Mention one blocker', 'End with next step'],
  },
  {
    id: 'flash',
    label: 'Flash Notes',
    description: 'Practice from disappearing AI-generated notes to train memory-independent delivery.',
    icon: 'flash-outline',
    iconColor: '#EA580C',
    iconBg: '#FFF7ED',
    focusTags: ['memory', 'delivery', 'confidence'],
    sessionType: 'flash_notes',
    promptTitle: 'Flash Notes Rehearsal',
    promptBody:
      'Speak from memory using a simple 3-part structure: opening, two key points, and a closing summary.',
    hints: ['Avoid filler words', 'Use transitions', 'Keep steady pace and tone'],
  },
];

// ─── Constants ────────────────────────────────────────────────────────────────

const BYPASS_AUTH = process.env.EXPO_PUBLIC_BYPASS_AUTH === 'true';
const MOCK_API = process.env.EXPO_PUBLIC_MOCK_API === 'true';

const SESSION_TYPE_LABELS: Record<SessionType, string> = {
  prompt: 'Prompt',
  freeform: 'Freeform',
  flash_notes: 'Flash Notes',
};

const STATUS_DOT: Record<SessionStatus, string> = {
  recorded: colors.inkFaint,
  processing: colors.accent,
  ready: colors.success,
  failed: colors.error,
};

const STATUS_LABEL: Record<SessionStatus, string> = {
  recorded: 'Recorded',
  processing: 'Processing…',
  ready: 'Ready',
  failed: 'Failed',
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

function NicheCard({
  niche,
  selected,
  onPress,
}: {
  niche: Niche;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[s.nicheCard, selected && s.nicheCardSelected]}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
    >
      <View style={[s.nicheIcon, { backgroundColor: niche.iconBg }]}>
        <Ionicons name={niche.icon} size={20} color={niche.iconColor} />
      </View>
      <Text style={[s.nicheLabel, selected && s.nicheLabelSelected]}>
        {niche.label}
      </Text>
      <Text style={s.nicheDesc} numberOfLines={2}>
        {niche.description}
      </Text>
      {selected && (
        <View style={s.nicheCheck}>
          <Ionicons name="checkmark-circle" size={18} color={colors.accent} />
        </View>
      )}
    </TouchableOpacity>
  );
}

function SessionRow({ session }: { session: HomeSession }) {
  const dotColor = STATUS_DOT[session.status];
  const showMemory = session.session_type === 'flash_notes' && session.memory_score !== null;
  const metaParts: string[] = [formatRelativeDate(session.submitted_at)];
  if (showMemory) metaParts.push(`${Math.round(session.memory_score! * 100)}% memory`);
  metaParts.push(`${session.review_count}/2 reviews`);

  return (
    <View style={s.sessionRow}>
      <View style={s.sessionDotWrap}>
        <View style={[s.sessionDot, { backgroundColor: dotColor }]} />
      </View>
      <View style={s.sessionMain}>
        <Text style={s.sessionType}>{SESSION_TYPE_LABELS[session.session_type]}</Text>
        <Text style={s.sessionMeta}>{metaParts.join(' · ')}</Text>
      </View>
      <Text style={[s.sessionStatusLabel, { color: dotColor }]}>
        {STATUS_LABEL[session.status]}
      </Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function SessionsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParams>>();
  const [sessions, setSessions] = useState<HomeSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

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
      setSessions(result.recentSessions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
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

  async function handleStartForNiche(niche: Niche) {
    if (creating) return;
    setError(null);
    setCreating(true);
    try {
      const created = await createSession({
        session_type: niche.sessionType,
        focus_tags: niche.focusTags,
        audio_ext: 'm4a',
      });
      const context: RecordSessionContext = {
        nicheLabel: niche.label,
        promptTitle: niche.promptTitle,
        promptBody: niche.promptBody,
        hints: niche.hints,
      };
      navigation.navigate('RecordSession', { session: created, context });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session');
    } finally {
      setCreating(false);
    }
  }

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
          <Text style={s.screenTitle}>Record</Text>
          <Text style={s.screenSubtitle}>Pick a niche and start recording</Text>
        </View>

        {/* ── Niche grid ── */}
        <View style={s.nicheSection}>
          <Text style={s.sectionLabel}>CHOOSE A NICHE</Text>
          <View style={s.nicheGrid}>
            {NICHES.map((niche) => (
              <NicheCard
                key={niche.id}
                niche={niche}
                selected={false}
                onPress={() => void handleStartForNiche(niche)}
              />
            ))}
          </View>
        </View>
        {creating && (
          <View style={s.creatingRow}>
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={s.creatingText}>Preparing recording session...</Text>
          </View>
        )}
        {error ? (
          <View style={s.startSection}>
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* ── History ── */}
        <View style={s.historySection}>
          <Text style={s.sectionLabel}>HISTORY</Text>
          {loading && !sessions.length ? (
            <>
              {[1, 2, 3].map((i) => (
                <View key={i} style={s.sessionRowSkeleton} />
              ))}
            </>
          ) : sessions.length === 0 ? (
            <Text style={s.emptyText}>No sessions yet. Pick a niche above and record your first one.</Text>
          ) : (
            sessions.map((session) => (
              <SessionRow key={session.id} session={session} />
            ))
          )}
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
    paddingBottom: 40,
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
  },

  // ── Niche grid ──
  nicheSection: {
    marginTop: spacing[4],
    marginHorizontal: spacing[5],
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: typography.weight.extrabold,
    color: colors.inkFaint,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: spacing[3],
  },
  nicheGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  nicheCard: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing[4],
    borderWidth: 1.5,
    borderColor: 'transparent',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    gap: spacing[2],
    position: 'relative',
  },
  nicheCardSelected: {
    borderColor: colors.accent,
    backgroundColor: '#F0F5FF',
  },
  nicheIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nicheLabel: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.ink,
    marginTop: spacing[1],
  },
  nicheLabelSelected: {
    color: colors.accent,
  },
  nicheDesc: {
    fontSize: typography.size.xs,
    color: colors.inkFaint,
    lineHeight: typography.size.xs * typography.lineHeight.normal,
  },
  nicheCheck: {
    position: 'absolute',
    top: spacing[3],
    right: spacing[3],
  },

  // ── Start ──
  startSection: {
    marginTop: spacing[3],
    marginHorizontal: spacing[5],
    gap: spacing[2],
  },
  creatingRow: {
    marginTop: spacing[3],
    marginHorizontal: spacing[5],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  creatingText: {
    fontSize: typography.size.sm,
    color: colors.inkLight,
    fontWeight: typography.weight.medium,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
  },

  // ── History ──
  historySection: {
    marginTop: spacing[6],
    marginHorizontal: spacing[5],
  },
  sessionRowSkeleton: {
    height: 52,
    borderRadius: radii.md,
    backgroundColor: '#C8D5E5',
    marginBottom: spacing[2],
    opacity: 0.5,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing[4],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: spacing[3],
  },
  sessionDotWrap: {
    paddingTop: 5,
    flexShrink: 0,
  },
  sessionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sessionMain: {
    flex: 1,
    gap: spacing[1],
  },
  sessionType: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.ink,
  },
  sessionMeta: {
    fontSize: typography.size.sm,
    color: colors.inkLight,
    lineHeight: typography.size.sm * typography.lineHeight.snug,
  },
  sessionStatusLabel: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    paddingTop: 2,
    flexShrink: 0,
  },
  emptyText: {
    color: colors.inkLight,
    fontSize: typography.size.sm,
    textAlign: 'center',
    paddingVertical: spacing[6],
    lineHeight: typography.size.sm * typography.lineHeight.normal,
  },
});
