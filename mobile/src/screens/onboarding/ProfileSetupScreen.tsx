import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';
import { Button } from '../../components/ui/Button';
import { ErrorBanner } from '../../components/ui/ErrorBanner';
import { StepIndicator } from '../../components/ui/StepIndicator';
import { TextInputField } from '../../components/ui/TextInputField';
import { supabase } from '../../lib/supabase';
import type { OnboardingStackParams } from '../../navigation/OnboardingNavigator';
import { saveProfile } from '../../services/onboarding';
import {
  GOAL_TAG_LABELS,
  GOAL_TAGS,
  PROFESSION_LEVEL_LABELS,
  PROFESSION_LEVELS,
  type GoalTag,
} from '../../types/onboarding';
import { colors, radii, spacing, typography } from '../../theme';

const BYPASS_AUTH = process.env.EXPO_PUBLIC_BYPASS_AUTH === 'true';
const DEV_USER_ID = '00000000-0000-4000-8000-000000000001';

const profileSchema = z.object({
  pseudonym: z
    .string()
    .min(3, 'Minimum 3 characters')
    .max(32, 'Maximum 32 characters')
    .regex(/^[\w\-.]+$/, 'Letters, numbers, _, -, . only'),
  native_language: z.string().min(2, 'Required'),
  profession_level: z.enum(PROFESSION_LEVELS, 'Select your experience level'),
  goals: z
    .array(z.enum(GOAL_TAGS))
    .min(1, 'Select at least one goal')
    .max(3, 'Select up to 3 goals'),
});

type FormValues = z.infer<typeof profileSchema>;

type Nav = NativeStackNavigationProp<OnboardingStackParams, 'ProfileSetup'>;

export function ProfileSetupScreen() {
  const navigation = useNavigation<Nav>();
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      pseudonym: '',
      native_language: '',
      profession_level: undefined,
      goals: [],
    },
  });

  async function onSubmit(values: FormValues) {
    setApiError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const userId = user?.id ?? (BYPASS_AUTH ? DEV_USER_ID : null);
      if (!userId) throw new Error('Not authenticated. Please sign in again.');
      await saveProfile(userId, values);
      navigation.navigate('CohortSelection', { profile: values });
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.header}>
          <StepIndicator current={2} total={4} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.titleBlock}>
            <Text style={styles.title}>Create your identity</Text>
            <Text style={styles.subtitle}>
              Your pseudonym is the only thing others in your pod see.
            </Text>
          </View>

          <View style={styles.form}>
            {/* Pseudonym */}
            <Controller
              control={control}
              name="pseudonym"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInputField
                  label="Pseudonym"
                  placeholder="e.g. sharpedge.91"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.pseudonym?.message}
                  hint="3-32 characters. Letters, numbers, _, -, ."
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              )}
            />

            {/* Native Language */}
            <Controller
              control={control}
              name="native_language"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInputField
                  label="Native language"
                  placeholder="e.g. Mandarin, Spanish, Hindi"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.native_language?.message}
                  returnKeyType="done"
                />
              )}
            />

            {/* Profession Level */}
            <Controller
              control={control}
              name="profession_level"
              render={({ field: { onChange, value } }) => (
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Experience level</Text>
                  <View style={styles.pillRow}>
                    {PROFESSION_LEVELS.map((level) => (
                      <Pill
                        key={level}
                        label={PROFESSION_LEVEL_LABELS[level]}
                        selected={value === level}
                        onPress={() => onChange(level)}
                      />
                    ))}
                  </View>
                  {errors.profession_level && (
                    <Text style={styles.fieldError}>
                      {errors.profession_level.message}
                    </Text>
                  )}
                </View>
              )}
            />

            {/* Goals */}
            <Controller
              control={control}
              name="goals"
              render={({ field: { onChange, value } }) => {
                function toggle(goal: GoalTag) {
                  if (value.includes(goal)) {
                    onChange(value.filter((g) => g !== goal));
                  } else if (value.length < 3) {
                    onChange([...value, goal]);
                  }
                }
                return (
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>
                      Focus goals{' '}
                      <Text style={styles.fieldLabelMuted}>(pick up to 3)</Text>
                    </Text>
                    <View style={styles.pillRow}>
                      {GOAL_TAGS.map((goal) => (
                        <Pill
                          key={goal}
                          label={GOAL_TAG_LABELS[goal]}
                          selected={value.includes(goal)}
                          disabled={
                            !value.includes(goal) && value.length >= 3
                          }
                          onPress={() => toggle(goal)}
                        />
                      ))}
                    </View>
                    {errors.goals && (
                      <Text style={styles.fieldError}>
                        {errors.goals.message}
                      </Text>
                    )}
                  </View>
                );
              }}
            />

            {apiError && (
              <ErrorBanner
                message={apiError}
                onRetry={() => setApiError(null)}
              />
            )}
          </View>
        </ScrollView>

        <SafeAreaView style={styles.footer} edges={['bottom', 'left', 'right']}>
          <Button
            label="Continue"
            size="lg"
            loading={isSubmitting}
            onPress={handleSubmit(onSubmit)}
            style={styles.footerBtn}
          />
        </SafeAreaView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

interface PillProps {
  label: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
}

function Pill({ label, selected, disabled = false, onPress }: PillProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected, disabled }}
      style={({ pressed }) => [
        pillStyles.pill,
        selected && pillStyles.pillSelected,
        disabled && pillStyles.pillDisabled,
        pressed && !selected && !disabled && pillStyles.pillPressed,
      ]}
    >
      <Text
        style={[
          pillStyles.label,
          selected && pillStyles.labelSelected,
          disabled && pillStyles.labelDisabled,
        ]}
      >
        {label}
      </Text>
    </Pressable>
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
  header: {
    paddingHorizontal: spacing[6],
    paddingTop: spacing[4],
    paddingBottom: spacing[2],
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing[6],
    paddingTop: spacing[6],
    paddingBottom: spacing[10],
    gap: spacing[8],
  },
  titleBlock: {
    gap: spacing[2],
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
    gap: spacing[6],
  },
  fieldGroup: {
    gap: spacing[2],
  },
  fieldLabel: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.ink,
    letterSpacing: 0.1,
  },
  fieldLabelMuted: {
    fontWeight: typography.weight.regular,
    color: colors.inkLight,
  },
  fieldError: {
    fontSize: typography.size.xs,
    color: colors.error,
    fontWeight: typography.weight.medium,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  footer: {
    paddingHorizontal: spacing[6],
    paddingBottom: spacing[4],
    paddingTop: spacing[3],
    backgroundColor: colors.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  footerBtn: {
    width: '100%',
  },
});

const pillStyles = StyleSheet.create({
  pill: {
    height: 38,
    paddingHorizontal: spacing[4],
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSurface,
  },
  pillPressed: {
    backgroundColor: colors.surfaceAlt,
  },
  pillDisabled: {
    opacity: 0.4,
  },
  label: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.ink,
  },
  labelSelected: {
    color: colors.accent,
    fontWeight: typography.weight.semibold,
  },
  labelDisabled: {
    color: colors.inkFaint,
  },
});
