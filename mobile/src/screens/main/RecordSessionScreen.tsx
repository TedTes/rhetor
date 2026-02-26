import { useNavigation, useRoute } from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { Audio } from 'expo-av';
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/Button';
import type { MainStackParams } from '../../navigation/MainNavigator';
import { uploadSessionAudio } from '../../services/home';
import { colors, radii, spacing, typography } from '../../theme';

type RouteProps = NativeStackScreenProps<MainStackParams, 'RecordSession'>['route'];
type Nav = NativeStackNavigationProp<MainStackParams, 'RecordSession'>;

function formatElapsed(seconds: number): string {
  const mm = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const ss = (seconds % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

export function RecordSessionScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<Nav>();
  const { session } = route.params;

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!isRecording) return;
    const id = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [isRecording]);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync().catch(() => {});
      }
      if (recording) {
        recording.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, [sound, recording]);

  const statusText = useMemo(() => {
    if (done) return 'Uploaded';
    if (uploading) return 'Uploading...';
    if (isPlaying) return 'Previewing...';
    if (isRecording) return 'Recording...';
    if (recordingUri) return 'Recorded';
    return 'Ready';
  }, [done, uploading, isPlaying, isRecording, recordingUri]);

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
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }
      setIsPlaying(false);
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

  async function togglePreview() {
    if (!recordingUri || isRecording || uploading) return;
    setError(null);
    setPreviewLoading(true);
    try {
      if (!sound) {
        const { sound: createdSound } = await Audio.Sound.createAsync(
          { uri: recordingUri },
          { shouldPlay: true },
          (status) => {
            if (!status.isLoaded) return;
            setIsPlaying(status.isPlaying);
          },
        );
        setSound(createdSound);
        setIsPlaying(true);
      } else if (isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
      } else {
        await sound.playAsync();
        setIsPlaying(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to play preview');
    } finally {
      setPreviewLoading(false);
    }
  }

  async function uploadRecording() {
    if (!recordingUri) return;
    setError(null);
    setUploading(true);
    try {
      await uploadSessionAudio(session, recordingUri);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to upload audio');
    } finally {
      setUploading(false);
    }
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.container}>
        <Text style={styles.title}>Record Session</Text>
        <Text style={styles.subtitle}>Session {session.session_id.slice(0, 8)}...</Text>

        <View style={styles.timerCard}>
          <Text style={styles.timer}>{formatElapsed(elapsedSec)}</Text>
          <Text style={styles.status}>{statusText}</Text>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}
        {done && <Text style={styles.success}>Audio uploaded successfully.</Text>}

        <View style={styles.actions}>
          {!isRecording ? (
            <Button
              label={recordingUri ? 'Re-record' : 'Start Recording'}
              size="lg"
              onPress={startRecording}
              disabled={uploading}
              style={styles.full}
            />
          ) : (
            <Button
              label="Stop Recording"
              size="lg"
              variant="secondary"
              onPress={stopRecording}
              disabled={uploading}
              style={styles.full}
            />
          )}

          <Button
            label="Upload Audio"
            size="lg"
            onPress={uploadRecording}
            loading={uploading}
            disabled={!recordingUri || isRecording || done}
            style={styles.full}
          />
          <Button
            label={isPlaying ? 'Pause Preview' : 'Play Preview'}
            size="lg"
            variant="secondary"
            onPress={togglePreview}
            loading={previewLoading}
            disabled={!recordingUri || isRecording || uploading}
            style={styles.full}
          />

          <Button
            label="Back to Home"
            size="md"
            variant="ghost"
            onPress={() => navigation.goBack()}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing[6],
    paddingTop: spacing[8],
    gap: spacing[6],
  },
  title: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.extrabold,
    color: colors.ink,
  },
  subtitle: {
    fontSize: typography.size.sm,
    color: colors.inkLight,
  },
  timerCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[8],
    gap: spacing[2],
  },
  timer: {
    fontSize: typography.size['3xl'],
    fontWeight: typography.weight.extrabold,
    color: colors.ink,
    letterSpacing: 1,
  },
  status: {
    fontSize: typography.size.sm,
    color: colors.inkLight,
    fontWeight: typography.weight.medium,
  },
  error: {
    color: colors.error,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
  },
  success: {
    color: colors.success,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
  },
  actions: {
    gap: spacing[3],
  },
  full: {
    width: '100%',
  },
});
