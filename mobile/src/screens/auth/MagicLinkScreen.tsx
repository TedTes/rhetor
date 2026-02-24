import { zodResolver } from '@hookform/resolvers/zod';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';
import { Button } from '../../components/ui/Button';
import { ErrorBanner } from '../../components/ui/ErrorBanner';
import { TextInputField } from '../../components/ui/TextInputField';
import { supabase } from '../../lib/supabase';
import { colors, radii, shadows, spacing, typography } from '../../theme';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
});

type FormValues = z.infer<typeof schema>;

type Step = 'form' | 'sent';

export function MagicLinkScreen() {
  const [step, setStep] = useState<Step>('form');
  const [sentTo, setSentTo] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  async function onSubmit({ email }: FormValues) {
    setApiError(null);
    const trimmed = email.trim().toLowerCase();
    const redirectTo = process.env.EXPO_PUBLIC_MAGIC_LINK_REDIRECT;

    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: redirectTo ? { emailRedirectTo: redirectTo } : {},
    });

    if (error) {
      setApiError(error.message);
      return;
    }

    setSentTo(trimmed);
    setStep('sent');
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.wordmark}>RHETOR</Text>

          {step === 'form' ? (
            <View style={styles.content}>
              <View style={styles.titleBlock}>
                <Text style={styles.title}>Sign in</Text>
                <Text style={styles.subtitle}>
                  We'll send a magic link to your email.{'\n'}No password
                  required.
                </Text>
              </View>

              <View style={styles.form}>
                <Controller
                  control={control}
                  name="email"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInputField
                      label="Email address"
                      placeholder="you@example.com"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={errors.email?.message}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="email"
                      returnKeyType="send"
                      onSubmitEditing={handleSubmit(onSubmit)}
                    />
                  )}
                />

                {apiError && (
                  <ErrorBanner
                    message={apiError}
                    onRetry={() => setApiError(null)}
                  />
                )}

                <Button
                  label="Send magic link"
                  size="lg"
                  loading={isSubmitting}
                  onPress={handleSubmit(onSubmit)}
                  style={styles.cta}
                />
              </View>
            </View>
          ) : (
            <SuccessCard email={sentTo} />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SuccessCard({ email }: { email: string }) {
  return (
    <View style={styles.content}>
      <View style={successStyles.card} accessibilityLiveRegion="polite">
        <View style={successStyles.iconRing}>
          <Text style={successStyles.iconText}>&#9993;</Text>
        </View>
        <Text style={successStyles.heading}>Check your email</Text>
        <Text style={successStyles.body}>
          A sign-in link is on its way to{'\n'}
          <Text style={successStyles.email}>{email}</Text>
        </Text>
        <View style={successStyles.divider} />
        <Text style={successStyles.note}>
          The link expires in 1 hour. If you don't see it, check your spam
          folder.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing[6],
    paddingTop: spacing[8],
    paddingBottom: spacing[10],
  },
  wordmark: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.extrabold,
    color: colors.accent,
    letterSpacing: 3,
    marginBottom: spacing[12],
  },
  content: {
    flex: 1,
    gap: spacing[8],
  },
  titleBlock: {
    gap: spacing[3],
  },
  title: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.extrabold,
    color: colors.ink,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: typography.size.md,
    color: colors.inkLight,
    lineHeight: typography.size.md * typography.lineHeight.normal,
  },
  form: {
    gap: spacing[5],
  },
  cta: {
    width: '100%',
  },
});

const successStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing[6],
    alignItems: 'center',
    gap: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.md,
  },
  iconRing: {
    width: 64,
    height: 64,
    borderRadius: radii.full,
    backgroundColor: colors.accentSurface,
    borderWidth: 2,
    borderColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[1],
  },
  iconText: {
    fontSize: 26,
    color: colors.accent,
  },
  heading: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.extrabold,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  body: {
    fontSize: typography.size.md,
    color: colors.inkLight,
    textAlign: 'center',
    lineHeight: typography.size.md * typography.lineHeight.normal,
  },
  email: {
    fontWeight: typography.weight.semibold,
    color: colors.ink,
  },
  divider: {
    width: '100%',
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing[1],
  },
  note: {
    fontSize: typography.size.sm,
    color: colors.inkFaint,
    textAlign: 'center',
    lineHeight: typography.size.sm * typography.lineHeight.relaxed,
  },
});
