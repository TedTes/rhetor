import { useNavigation, useRoute } from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/Button';
import { CohortCard } from '../../components/ui/CohortCard';
import { ErrorBanner } from '../../components/ui/ErrorBanner';
import { StepIndicator } from '../../components/ui/StepIndicator';
import type { OnboardingStackParams } from '../../navigation/OnboardingNavigator';
import { assignToPod } from '../../services/onboarding';
import { COHORTS, type CohortFocusArea } from '../../types/onboarding';
import { colors, spacing, typography } from '../../theme';

type Nav = NativeStackNavigationProp<OnboardingStackParams, 'CohortSelection'>;
type RouteProps = NativeStackScreenProps<
  OnboardingStackParams,
  'CohortSelection'
>['route'];

export function CohortSelectionScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProps>();
  const { profile } = route.params;

  const [selected, setSelected] = useState<CohortFocusArea | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!selected) return;
    setError(null);
    setLoading(true);
    try {
      const assignment = await assignToPod(selected);
      const cohort = COHORTS.find((c) => c.focus_area === selected)!;
      navigation.navigate('AssignmentResult', {
        assignment,
        cohortName: cohort.name,
        focusArea: selected,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <StepIndicator current={3} total={4} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Choose your cohort</Text>
          <Text style={styles.subtitle}>
            You'll practice alongside{' '}
            <Text style={styles.subtitleBold}>{profile.pseudonym}</Text> and 4
            others in a private pod built around the same focus.
          </Text>
        </View>

        <View style={styles.cards}>
          {COHORTS.map((cohort) => (
            <CohortCard
              key={cohort.focus_area}
              name={cohort.name}
              description={cohort.description}
              tag={cohort.tag}
              isSelected={selected === cohort.focus_area}
              onPress={() => setSelected(cohort.focus_area)}
            />
          ))}
        </View>

        {error && (
          <ErrorBanner message={error} onRetry={() => setError(null)} />
        )}

        {loading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={styles.loadingText}>Finding your pod...</Text>
          </View>
        )}
      </ScrollView>

      <SafeAreaView style={styles.footer} edges={['bottom', 'left', 'right']}>
        <Button
          label="Confirm Selection"
          size="lg"
          loading={loading}
          disabled={!selected}
          onPress={handleConfirm}
          style={styles.footerBtn}
        />
      </SafeAreaView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
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
  subtitleBold: {
    fontWeight: typography.weight.semibold,
    color: colors.ink,
  },
  cards: {
    gap: spacing[4],
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    justifyContent: 'center',
    paddingVertical: spacing[2],
  },
  loadingText: {
    fontSize: typography.size.sm,
    color: colors.inkLight,
    fontWeight: typography.weight.medium,
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
