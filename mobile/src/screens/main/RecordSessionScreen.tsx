import { useNavigation, useRoute } from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { MainStackParams } from '../../navigation/MainNavigator';
import { uploadSessionAudio } from '../../services/home';
import { colors, radii, spacing, typography } from '../../theme';

type RouteProps = NativeStackScreenProps<MainStackParams, 'RecordSession'>['route'];
type Nav = NativeStackNavigationProp<MainStackParams, 'RecordSession'>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatElapsed(seconds: number): string {
  const mm = Math.floor(seconds / 60).toString().padStart(2, '0');
  const ss = (seconds % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

// ─── Pulse ring (active only while recording) ─────────────────────────────────

function PulseRing({ active }: { active: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      scale.setValue(1);
      opacity.setValue(0);
      return;
    }
    opacity.setValue(0.3);
    const anim = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, { toValue: 1.55, duration: 900, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 900, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.3, duration: 0, useNativeDriver: true }),
        ]),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [active, scale, opacity]);

  return (
    <Animated.View
      style={[
        s.pulseRing,
        { transform: [{ scale }], opacity },
      ]}
      pointerEvents="none"
    />
  );
}

// ─── Prompt sheet (modal) ─────────────────────────────────────────────────────

function PromptSheet({
  visible,
  onClose,
  promptTitle,
  promptBody,
  hints,
}: {
  visible: boolean;
  onClose: () => void;
  promptTitle: string;
  promptBody: string;
  hints: string[];
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={s.sheetOverlay} onPress={onClose} />
      <View style={s.sheet}>
        <View style={s.sheetHandle} />
        <View style={s.sheetHead}>
          <Text style={s.sheetTitle}>{promptTitle}</Text>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [s.sheetClose, pressed && s.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Close prompt"
          >
            <Ionicons name="close" size={20} color={colors.inkLight} />
          </Pressable>
        </View>
        <Text style={s.sheetBody}>{promptBody}</Text>
        {hints.length > 0 && (
          <View style={s.sheetHints}>
            {hints.map((hint) => (
              <View key={hint} style={s.sheetHintRow}>
                <View style={s.sheetHintDot} />
                <Text style={s.sheetHintText}>{hint}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </Modal>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export function RecordSessionScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<Nav>();
  const { session, context } = route.params;

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Timer
  useEffect(() => {
    if (!isRecording) return;
    const id = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [isRecording]);

  // Cleanup
  useEffect(() => {
    return () => {
      recording?.stopAndUnloadAsync().catch(() => {});
    };
  }, [recording]);

  const statusText = useMemo(() => {
    if (saved) return 'Saved';
    if (saving) return 'Saving…';
    if (isRecording) return 'Recording';
    if (recordingUri) return 'Ready to save';
    return 'Tap to begin';
  }, [saved, saving, isRecording, recordingUri]);

  // ── Handlers (unchanged) ──────────────────────────────────────────────────

  async function startRecording() {
    setError(null);
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (perm.status !== 'granted') {
        setError('Microphone permission is required to record.');
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      setElapsedSec(0);
      setRecordingUri(null);
      setSaved(false);
      setRecording(rec);
      setIsRecording(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start recording');
    }
  }

  async function stopRecording() {
    if (!recording) return;
    setError(null);
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setIsRecording(false);
      setRecording(null);
      if (!uri) {
        setError('No recording file found.');
        return;
      }
      setRecordingUri(uri);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to stop recording');
    }
  }

  async function saveRecording() {
    if (!recordingUri) return;
    setError(null);
    setSaving(true);
    try {
      await uploadSessionAudio(session, recordingUri);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save audio');
    } finally {
      setSaving(false);
    }
  }

  const canSave = Boolean(recordingUri) && !isRecording && !saved && !saving;

  // ── Derived appearance ────────────────────────────────────────────────────

  // Timer color: red while recording, green when done, default otherwise
  const timerColor = isRecording ? '#EF4444' : saved ? colors.success : colors.ink;

  // Record button state
  let recBg: string = colors.accent;
  let recIcon: React.ComponentProps<typeof Ionicons>['name'] = 'mic';
  if (isRecording) { recBg = '#EF4444'; recIcon = 'square'; }
  else if (saved)   { recBg = colors.success; recIcon = 'checkmark'; }

  return (
    <SafeAreaView style={s.root} edges={['top', 'left', 'right', 'bottom']}>

      {/* ── Top bar ── */}
      <View style={s.topBar}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [s.iconBtn, pressed && s.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={20} color={colors.ink} />
        </Pressable>

        <View style={s.nichePill}>
          <Text style={s.nicheLabel} numberOfLines={1}>{context.nicheLabel}</Text>
        </View>

        <Pressable
          onPress={() => setShowHelp(true)}
          style={({ pressed }) => [s.iconBtn, pressed && s.pressed]}
          accessibilityRole="button"
          accessibilityLabel="View prompt"
        >
          <Ionicons name="document-text-outline" size={20} color={colors.inkMid} />
        </Pressable>
      </View>

      {/* ── Central stage ── */}
      <View style={s.stage}>

        {/* Timer */}
        <Text style={[s.timer, { color: timerColor }]}>
          {formatElapsed(elapsedSec)}
        </Text>
        <Text style={s.statusLabel}>{statusText}</Text>

        {/* Record button + pulse */}
        <View style={s.btnWrap}>
          <PulseRing active={isRecording} />
          <Pressable
            onPress={isRecording ? stopRecording : startRecording}
            disabled={saving || saved}
            style={({ pressed }) => [
              s.recBtn,
              { backgroundColor: recBg },
              pressed && s.pressed,
              (saving || saved) && s.disabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel={isRecording ? 'Stop recording' : 'Start recording'}
          >
            <Ionicons name={recIcon} size={34} color={colors.white} />
          </Pressable>
        </View>

        {/* Re-record hint (after stop, before save) */}
        {recordingUri && !isRecording && !saved && (
          <Pressable
            onPress={startRecording}
            style={({ pressed }) => [s.rerecordBtn, pressed && s.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Re-record"
          >
            <Ionicons name="refresh" size={14} color={colors.inkFaint} />
            <Text style={s.rerecordLabel}>Re-record</Text>
          </Pressable>
        )}
      </View>

      {/* ── Bottom bar ── */}
      <View style={s.bottomBar}>
        {/* Feedback strip */}
        {error ? (
          <View style={s.feedbackBanner}>
            <Ionicons name="alert-circle-outline" size={14} color={colors.error} />
            <Text style={s.feedbackError} numberOfLines={2}>{error}</Text>
          </View>
        ) : saved ? (
          <View style={[s.feedbackBanner, s.feedbackBannerSuccess]}>
            <Ionicons name="checkmark-circle-outline" size={14} color={colors.success} />
            <Text style={s.feedbackSuccess}>Session saved — your pod will review it shortly.</Text>
          </View>
        ) : null}

        {/* Save button */}
        <Pressable
          onPress={saveRecording}
          disabled={!canSave}
          style={({ pressed }) => [
            s.saveBtn,
            !canSave && s.saveBtnDisabled,
            pressed && canSave && s.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={saved ? 'Saved' : 'Save session'}
        >
          <Ionicons
            name={saved ? 'checkmark-done' : saving ? 'cloud-upload-outline' : 'cloud-upload-outline'}
            size={18}
            color={canSave ? colors.white : colors.inkFaint}
          />
          <Text style={[s.saveBtnLabel, !canSave && s.saveBtnLabelDisabled]}>
            {saved ? 'Saved' : saving ? 'Saving…' : 'Save session'}
          </Text>
        </Pressable>
      </View>

      {/* ── Prompt sheet ── */}
      <PromptSheet
        visible={showHelp}
        onClose={() => setShowHelp(false)}
        promptTitle={context.promptTitle}
        promptBody={context.promptBody}
        hints={context.hints}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const RECORD_BTN_SIZE = 112;
const PULSE_SIZE = RECORD_BTN_SIZE + 48;

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  // ── Top bar ──
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[5],
    paddingTop: spacing[3],
    paddingBottom: spacing[2],
    gap: spacing[3],
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
    elevation: 2,
    flexShrink: 0,
  },
  nichePill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSurface,
    borderRadius: radii.full,
    paddingHorizontal: spacing[4],
    paddingVertical: 7,
  },
  nicheLabel: {
    fontSize: 11,
    fontWeight: typography.weight.bold,
    color: colors.accent,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  // ── Stage (central focus area) ──
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[4],
  },
  timer: {
    fontSize: 64,
    fontWeight: typography.weight.extrabold,
    letterSpacing: 2,
    lineHeight: 72,
    fontVariant: ['tabular-nums'],
  },
  statusLabel: {
    fontSize: typography.size.sm,
    color: colors.inkFaint,
    fontWeight: typography.weight.medium,
    letterSpacing: 0.3,
    marginTop: -spacing[2],
  },

  // ── Record button ──
  btnWrap: {
    width: PULSE_SIZE,
    height: PULSE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[4],
  },
  pulseRing: {
    position: 'absolute',
    width: PULSE_SIZE,
    height: PULSE_SIZE,
    borderRadius: PULSE_SIZE / 2,
    backgroundColor: '#EF4444',
  },
  recBtn: {
    width: RECORD_BTN_SIZE,
    height: RECORD_BTN_SIZE,
    borderRadius: RECORD_BTN_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 10,
  },

  // ── Re-record ──
  rerecordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    marginTop: spacing[2],
  },
  rerecordLabel: {
    fontSize: typography.size.xs,
    color: colors.inkFaint,
    fontWeight: typography.weight.medium,
  },

  // ── Bottom bar ──
  bottomBar: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[6],
    gap: spacing[3],
  },
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    backgroundColor: colors.errorBg,
    borderRadius: radii.md,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
  },
  feedbackBannerSuccess: {
    backgroundColor: colors.successBg,
  },
  feedbackError: {
    flex: 1,
    fontSize: typography.size.sm,
    color: colors.error,
    fontWeight: typography.weight.medium,
    lineHeight: typography.size.sm * typography.lineHeight.normal,
  },
  feedbackSuccess: {
    flex: 1,
    fontSize: typography.size.sm,
    color: colors.success,
    fontWeight: typography.weight.medium,
    lineHeight: typography.size.sm * typography.lineHeight.normal,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    height: 54,
  },
  saveBtnDisabled: {
    backgroundColor: colors.surfaceAlt,
  },
  saveBtnLabel: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.white,
  },
  saveBtnLabelDisabled: {
    color: colors.inkFaint,
  },

  // ── Prompt sheet ──
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.35)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing[6],
    paddingBottom: spacing[10],
    paddingTop: spacing[3],
    gap: spacing[4],
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 16,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing[2],
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  sheetTitle: {
    flex: 1,
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.ink,
    lineHeight: typography.size.xl * typography.lineHeight.tight,
  },
  sheetClose: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sheetBody: {
    fontSize: typography.size.md,
    color: colors.inkMid,
    lineHeight: typography.size.md * typography.lineHeight.relaxed,
  },
  sheetHints: {
    gap: spacing[3],
    paddingTop: spacing[2],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  sheetHintRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  sheetHintDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accentLight,
    marginTop: 6,
    flexShrink: 0,
  },
  sheetHintText: {
    flex: 1,
    fontSize: typography.size.sm,
    color: colors.inkLight,
    lineHeight: typography.size.sm * typography.lineHeight.normal,
  },

  // ── Shared ──
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.4 },
});
