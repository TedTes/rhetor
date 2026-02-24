import { useRoute } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/Button';
import { StepIndicator } from '../../components/ui/StepIndicator';
import type { OnboardingStackParams } from '../../navigation/OnboardingNavigator';
import { COHORTS } from '../../types/onboarding';
import { colors, radii, shadows, spacing, typography } from '../../theme';

type RouteProps = NativeStackScreenProps<
  OnboardingStackParams,
  'AssignmentResult'
>['route'];

interface AssignmentResultScreenProps {
  onComplete: () => void;
}

export function AssignmentResultScreen({
  onComplete,
}: AssignmentResultScreenProps) {
  const route = useRoute<RouteProps>();
  const { assignment, cohortName, focusArea } = route.params;

  const cohort = COHORTS.find((c) => c.focus_area === focusArea);

  // Entrance animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        delay: 150,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        delay: 150,
        useNativeDriver: true,
        tension: 80,
        friction: 8,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <StepIndicator current={4} total={4} />
      </View>

      <View style={styles.body}>
        <Animated.View
          style={[
            styles.card,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          {/* Success icon */}
          <View style={styles.iconWrap}>
            <View style={styles.iconRing}>
              <Text style={styles.iconCheck}>&#10003;</Text>
            </View>
          </View>

          <View style={styles.textBlock}>
            <Text style={styles.congrats}>You're in.</Text>
            <Text style={styles.podLabel}>{assignment.pod_label}</Text>
            <Text style={styles.cohortName}>{cohortName}</Text>
            {cohort && (
              <Text style={styles.cohortDescription}>{cohort.description}</Text>
            )}
          </View>

          <View style={styles.divider} />

          {/* What's next */}
          <View style={styles.nextBlock}>
            <Text style={styles.nextHeading}>What happens next</Text>
            <View style={styles.nextItems}>
              <NextItem
                number="1"
                text="Your pod of 5 is being assembled from the same cohort."
              />
              <NextItem
                number="2"
                text="You'll receive your first speaking prompt within 24 hours."
              />
              <NextItem
                number="3"
                text="Record, review peers, and track your progress over 4 weeks."
              />
            </View>
          </View>
        </Animated.View>
      </View>

      <SafeAreaView style={styles.footer} edges={['bottom', 'left', 'right']}>
        <Button
          label="Continue to Rhetor"
          size="lg"
          onPress={onComplete}
          style={styles.footerBtn}
        />
      </SafeAreaView>
    </SafeAreaView>
  );
}

interface NextItemProps {
  number: string;
  text: string;
}

function NextItem({ number, text }: NextItemProps) {
  return (
    <View style={nextItemStyles.row}>
      <View style={nextItemStyles.numberBadge}>
        <Text style={nextItemStyles.numberText}>{number}</Text>
      </View>
      <Text style={nextItemStyles.text}>{text}</Text>
    </View>
  );
}

const nextItemStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing[3],
    alignItems: 'flex-start',
  },
  numberBadge: {
    width: 22,
    height: 22,
    borderRadius: radii.full,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  numberText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.accent,
  },
  text: {
    flex: 1,
    fontSize: typography.size.sm,
    color: colors.inkMid,
    lineHeight: typography.size.sm * typography.lineHeight.normal,
  },
});

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
  body: {
    flex: 1,
    paddingHorizontal: spacing[6],
    paddingTop: spacing[6],
    justifyContent: 'flex-start',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing[6],
    gap: spacing[6],
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.md,
  },
  iconWrap: {
    alignItems: 'center',
  },
  iconRing: {
    width: 64,
    height: 64,
    borderRadius: radii.full,
    backgroundColor: colors.successBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.success,
  },
  iconCheck: {
    fontSize: 28,
    color: colors.success,
    lineHeight: 32,
  },
  textBlock: {
    alignItems: 'center',
    gap: spacing[2],
  },
  congrats: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.extrabold,
    color: colors.ink,
    letterSpacing: -0.3,
  },
  podLabel: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.inkFaint,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  cohortName: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.accent,
    textAlign: 'center',
  },
  cohortDescription: {
    fontSize: typography.size.sm,
    color: colors.inkLight,
    textAlign: 'center',
    lineHeight: typography.size.sm * typography.lineHeight.normal,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  nextBlock: {
    gap: spacing[4],
  },
  nextHeading: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.ink,
    letterSpacing: 0.1,
  },
  nextItems: {
    gap: spacing[4],
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
