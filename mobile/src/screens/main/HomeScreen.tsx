import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import {
  createSession,
  fetchHomeData,
  uploadSessionAudio,
  type CreatedSession,
  type HomeData,
  type HomeSession,
  type SessionStatus,
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

type RecordState = 'idle' | 'creating' | 'recording' | 'uploading';

// ─── Utilities ────────────────────────────────────────────────────────────────

function formatElapsed(sec: number): string {
  const mm = Math.floor(sec / 60).toString().padStart(2, '0');
  const ss = (sec % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

function formatRelativeDate(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ─── Pulse animation ──────────────────────────────────────────────────────────

function usePulse(active: boolean, color: string) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      scale.setValue(1);
      opacity.setValue(0);
      return;
    }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, { toValue: 1.65, duration: 850, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 850, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.4, duration: 0, useNativeDriver: true }),
        ]),
      ]),
    );
    opacity.setValue(0.4);
    anim.start();
    return () => anim.stop();
  }, [active, scale, opacity]);

  return { scale, opacity, color };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RecorderSection({
  data,
  dataLoading,
  recordState,
  elapsedSec,
}: {
  data: HomeData | null;
  dataLoading: boolean;
  recordState: RecordState;
  elapsedSec: number;
}) {
  const isRecording = recordState === 'recording';
  const isCreating = recordState === 'creating';
  const isUploading = recordState === 'uploading';
  const lowCredits = data ? data.profile.credits < 2 : false;

  const pulse = usePulse(isRecording, '#EF4444');

  // Mic circle color + icon based on state
  let micBg: string = colors.accentSurface;
  let micBorder: string = colors.accentLight;
  let micIconColor: string = colors.accent;
  let micIconName: React.ComponentProps<typeof Ionicons>['name'] = 'mic-outline';

  if (isRecording) {
    micBg = '#EF4444';
    micBorder = '#EF4444';
    micIconColor = colors.white;
    micIconName = 'stop';
  } else if (isCreating) {
    micBg = colors.accent;
    micBorder = colors.accent;
    micIconColor = colors.white;
    micIconName = 'hourglass-outline';
  } else if (isUploading) {
    micBg = colors.accentSurface;
    micBorder = colors.accentLight;
    micIconColor = colors.accent;
    micIconName = 'cloud-upload-outline';
  }

  return (
    <View style={s.recorderSection}>
      {/* Wordmark + credits */}
      <View style={s.topBar}>
        <Text style={s.wordmark}>RHETOR</Text>
        {data && (
          <View style={[s.creditBadge, lowCredits && s.creditBadgeLow]}>
            <Text style={[s.creditCount, lowCredits && s.creditCountLow]}>
              {data.profile.credits}
            </Text>
            <Text style={[s.creditUnit, lowCredits && s.creditUnitLow]}>credits</Text>
          </View>
        )}
      </View>

      {/* Mic visual */}
      <View style={s.micArea}>
        <Animated.View
          style={[
            s.pulseRing,
            {
              transform: [{ scale: pulse.scale }],
              opacity: pulse.opacity,
              backgroundColor: '#EF4444',
            },
          ]}
        />
        <View style={[s.micCircle, { backgroundColor: micBg, borderColor: micBorder }]}>
          <Ionicons name={micIconName} size={36} color={micIconColor} />
        </View>
      </View>

      {/* Timer (shown while recording) or Greeting */}
      {isRecording ? (
        <>
          <Text style={s.timer}>{formatElapsed(elapsedSec)}</Text>
          <Text style={s.timerHint}>Tap the mic to stop</Text>
        </>
      ) : dataLoading ? (
        <View style={s.greetingPlaceholder} />
      ) : (
        <>
          <Text style={s.greeting}>
            {data ? `Hey, ${data.profile.pseudonym}.` : ''}
          </Text>
          {data && (
            <Text style={[s.statusLine, lowCredits && s.statusLineWarn]}>
              {isCreating
                ? 'Creating session…'
                : isUploading
                ? 'Uploading session…'
                : lowCredits
                ? 'Low credits — complete a review first'
                : data.pendingReviewCount > 0
                ? `${data.pendingReviewCount} review${data.pendingReviewCount > 1 ? 's' : ''} in your queue`
                : data.recentSessions.length === 0
                ? 'Ready to record your first session'
                : 'On track — keep the momentum'}
            </Text>
          )}
        </>
      )}

      {/* Mini metrics */}
      {data && !isRecording && (
        <View style={s.metricsRow}>
          <View style={s.metricItem}>
            <Text style={s.metricValue}>{data.pendingReviewCount}</Text>
            <Text style={s.metricLabel}> to review</Text>
          </View>
          <View style={s.metricSep} />
          <View style={s.metricItem}>
            <Text style={s.metricValue}>{data.sessionsAwaitingFeedback}</Text>
            <Text style={s.metricLabel}> awaiting feedback</Text>
          </View>
        </View>
      )}
    </View>
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
      <Text style={[s.sessionStatus, { color: dotColor }]}>
        {STATUS_LABEL[session.status]}
      </Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function HomeScreen() {
  const [data, setData] = useState<HomeData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Recording state
  const [recordState, setRecordState] = useState<RecordState>('idle');
  const [elapsedSec, setElapsedSec] = useState(0);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const sessionRef = useRef<CreatedSession | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recordingRef.current?.stopAndUnloadAsync().catch(() => {});
    };
  }, []);

  // Elapsed timer
  useEffect(() => {
    if (recordState !== 'recording') return;
    const id = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [recordState]);

  // Auth
  useEffect(() => {
    if (MOCK_API || BYPASS_AUTH) {
      setUserId('mock-user-id');
      return;
    }
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
      else {
        setError('Session not found.');
        setDataLoading(false);
      }
    });
  }, []);

  const load = useCallback(async (uid: string, isRefresh = false) => {
    if (!isRefresh) setDataLoading(true);
    setError(null);
    try {
      const result = await fetchHomeData(uid);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setDataLoading(false);
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

  async function handleFAB() {
    setError(null);

    // If recording → stop + upload
    if (recordState === 'recording') {
      const rec = recordingRef.current;
      const sess = sessionRef.current;
      if (!rec || !sess) return;

      try {
        await rec.stopAndUnloadAsync();
        const uri = rec.getURI();
        recordingRef.current = null;

        if (!uri) {
          setError('No audio file found after recording.');
          setRecordState('idle');
          return;
        }

        setRecordState('uploading');
        await uploadSessionAudio(sess, uri);
        sessionRef.current = null;

        // Refresh list in background
        if (userId) void load(userId);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed');
      } finally {
        setRecordState('idle');
        setElapsedSec(0);
      }
      return;
    }

    // If idle → create session + start recording
    if (recordState !== 'idle') return;

    setRecordState('creating');

    try {
      // Request mic permission
      const perm = await Audio.requestPermissionsAsync();
      if (perm.status !== 'granted') {
        setError('Microphone permission is required to record.');
        setRecordState('idle');
        return;
      }

      // Create session
      const created = await createSession({
        session_type: 'prompt',
        focus_tags: ['clarity'],
        audio_ext: 'm4a',
      });
      sessionRef.current = created;

      // Start recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      recordingRef.current = rec;

      setElapsedSec(0);
      setRecordState('recording');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start recording');
      recordingRef.current?.stopAndUnloadAsync().catch(() => {});
      recordingRef.current = null;
      sessionRef.current = null;
      setRecordState('idle');
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  const isBusy = recordState === 'creating' || recordState === 'uploading';

  return (
    <SafeAreaView style={s.root} edges={['top', 'left', 'right']}>
      <View style={s.container}>
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
          {/* ── Recorder section (top) ── */}
          <RecorderSection
            data={data}
            dataLoading={dataLoading}
            recordState={recordState}
            elapsedSec={elapsedSec}
          />

          {/* ── Error banner ── */}
          {error && (
            <View style={s.errorBanner}>
              <Text style={s.errorBannerText}>{error}</Text>
            </View>
          )}

          {/* ── Recently Recorded ── */}
          <View style={s.recentSection}>
            <Text style={s.sectionLabel}>RECENTLY RECORDED</Text>
            {dataLoading ? (
              <>
                {[1, 2, 3].map((i) => (
                  <View key={i} style={s.sessionRowSkeleton} />
                ))}
              </>
            ) : data && data.recentSessions.length > 0 ? (
              data.recentSessions.map((session) => (
                <SessionRow key={session.id} session={session} />
              ))
            ) : (
              <View style={s.emptyState}>
                <Ionicons name="mic-off-outline" size={28} color={colors.inkFaint} />
                <Text style={s.emptyText}>
                  No sessions yet.{'\n'}Tap the mic button to get started.
                </Text>
              </View>
            )}
          </View>

          {/* ── Sign out ── */}
          <TouchableOpacity
            onPress={handleSignOut}
            accessibilityRole="button"
            style={s.signOutBtn}
          >
            <Text style={s.signOutText}>Sign out</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* ── FAB ── */}
        <TouchableOpacity
          style={[
            s.fab,
            recordState === 'recording' && s.fabRecording,
            isBusy && s.fabBusy,
          ]}
          onPress={handleFAB}
          disabled={isBusy}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={recordState === 'recording' ? 'Stop recording' : 'Start recording'}
        >
          {recordState === 'recording' ? (
            <Ionicons name="stop" size={26} color={colors.white} />
          ) : isBusy ? (
            <Ionicons name="hourglass-outline" size={24} color={colors.white} />
          ) : (
            <Ionicons name="mic" size={26} color={colors.white} />
          )}
        </TouchableOpacity>
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
    paddingBottom: 108,
  },

  // ── Top bar ──
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[6],
    width: '100%',
  },
  wordmark: {
    fontSize: 11,
    fontWeight: typography.weight.extrabold,
    color: colors.inkFaint,
    letterSpacing: 3,
  },
  creditBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    backgroundColor: colors.accentSurface,
    borderRadius: radii.full,
    paddingHorizontal: spacing[3],
    paddingVertical: 6,
  },
  creditBadgeLow: { backgroundColor: colors.errorBg },
  creditCount: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.extrabold,
    color: colors.accent,
    lineHeight: typography.size.lg * 1.1,
  },
  creditCountLow: { color: colors.error },
  creditUnit: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.accent,
  },
  creditUnitLow: { color: colors.error },

  // ── Recorder section ──
  recorderSection: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing[5],
    paddingTop: spacing[5],
    paddingBottom: spacing[6],
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 10,
    alignItems: 'center',
  },

  // ── Mic visual ──
  micArea: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[5],
  },
  pulseRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  micCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },

  // ── Timer (recording state) ──
  timer: {
    fontSize: typography.size['3xl'],
    fontWeight: typography.weight.extrabold,
    color: '#EF4444',
    letterSpacing: 2,
    marginBottom: spacing[1],
  },
  timerHint: {
    fontSize: typography.size.sm,
    color: colors.inkFaint,
    marginBottom: spacing[5],
  },

  // ── Greeting ──
  greetingPlaceholder: {
    height: 34,
    width: 200,
    borderRadius: radii.md,
    backgroundColor: '#C8D5E5',
    marginBottom: spacing[2],
  },
  greeting: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.extrabold,
    color: colors.ink,
    letterSpacing: -0.4,
    textAlign: 'center',
    marginBottom: spacing[1],
  },
  statusLine: {
    fontSize: typography.size.sm,
    color: colors.inkLight,
    textAlign: 'center',
    lineHeight: typography.size.sm * typography.lineHeight.normal,
  },
  statusLineWarn: { color: colors.error },

  // ── Metrics ──
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[5],
    paddingTop: spacing[4],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    width: '100%',
  },
  metricItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  metricValue: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.extrabold,
    color: colors.ink,
  },
  metricLabel: {
    fontSize: typography.size.sm,
    color: colors.inkLight,
  },
  metricSep: {
    width: 1,
    height: 14,
    backgroundColor: colors.border,
  },

  // ── Error ──
  errorBanner: {
    marginHorizontal: spacing[5],
    marginTop: spacing[4],
    backgroundColor: colors.errorBg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.error,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
  },
  errorBannerText: {
    color: colors.error,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
  },

  // ── Recent section ──
  recentSection: {
    marginTop: spacing[6],
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

  // ── Session rows ──
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing[4],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: spacing[3],
  },
  sessionRowSkeleton: {
    height: 52,
    borderRadius: radii.md,
    backgroundColor: '#C8D5E5',
    marginBottom: spacing[2],
    opacity: 0.5,
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
  sessionStatus: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    paddingTop: 2,
    flexShrink: 0,
  },

  // ── Empty state ──
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing[8],
    gap: spacing[3],
  },
  emptyText: {
    color: colors.inkFaint,
    fontSize: typography.size.sm,
    textAlign: 'center',
    lineHeight: typography.size.sm * typography.lineHeight.normal,
  },

  // ── Sign out ──
  signOutBtn: {
    alignSelf: 'center',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[6],
    marginTop: spacing[5],
  },
  signOutText: {
    color: colors.inkFaint,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
  },

  // ── FAB ──
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
  fabRecording: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
  },
  fabBusy: {
    backgroundColor: colors.accentDeep,
    opacity: 0.75,
  },
});
