import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/Button';
import { StepIndicator } from '../../components/ui/StepIndicator';
import { colors, spacing, typography } from '../../theme';
import type { OnboardingStackParams } from '../../navigation/OnboardingNavigator';

type Nav = NativeStackNavigationProp<OnboardingStackParams, 'Welcome'>;

const VALUE_PROPS = [
  {
    heading: 'Practice without pressure',
    body: 'Record on your own schedule. No live audience, no stage fright.',
  },
  {
    heading: 'Diagnostics that actually help',
    body: 'AI analysis of filler words, pace, and delivery patterns after every session.',
  },
  {
    heading: 'Real feedback from peers',
    body: 'Structured, scored reviews from people working on the same skills as you.',
  },
];

export function WelcomeScreen() {
  const navigation = useNavigation<Nav>();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        delay: 100,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        delay: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={colors.bgDark}
        translucent={Platform.OS === 'android'}
      />
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.topBar}>
          <View style={styles.wordmark}>
            <Text style={styles.wordmarkText}>RHETOR</Text>
          </View>
          <StepIndicator current={1} total={4} />
        </View>

        <Animated.View
          style={[
            styles.content,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.headlineBlock}>
            <Text style={styles.headline}>Speak with{'\n'}conviction.</Text>
            <Text style={styles.subheadline}>
              Async practice. AI diagnostics. Real peer feedback.
            </Text>
          </View>

          <View style={styles.valueProps}>
            {VALUE_PROPS.map((prop, i) => (
              <View key={i} style={styles.valueProp}>
                <View style={styles.valuePropDot} />
                <View style={styles.valuePropText}>
                  <Text style={styles.valuePropHeading}>{prop.heading}</Text>
                  <Text style={styles.valuePropBody}>{prop.body}</Text>
                </View>
              </View>
            ))}
          </View>
        </Animated.View>
      </SafeAreaView>

      <SafeAreaView style={styles.footer} edges={['bottom', 'left', 'right']}>
        <Button
          label="Get Started"
          variant="inverse"
          size="lg"
          style={styles.cta}
          onPress={() => navigation.navigate('ProfileSetup')}
          accessibilityHint="Proceed to create your profile"
        />
        <Text style={styles.footerNote}>Takes about 2 minutes</Text>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgDark,
    justifyContent: 'space-between',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: spacing[6],
    paddingTop: spacing[4],
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[12],
  },
  wordmark: {},
  wordmarkText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.extrabold,
    color: colors.white,
    letterSpacing: 3,
  },
  content: {
    gap: spacing[10],
  },
  headlineBlock: {
    gap: spacing[3],
  },
  headline: {
    fontSize: typography.size['3xl'],
    fontWeight: typography.weight.extrabold,
    color: colors.white,
    lineHeight: typography.size['3xl'] * typography.lineHeight.tight,
    letterSpacing: -0.5,
  },
  subheadline: {
    fontSize: typography.size.lg,
    color: colors.inkFaint,
    lineHeight: typography.size.lg * typography.lineHeight.snug,
    fontWeight: typography.weight.regular,
  },
  valueProps: {
    gap: spacing[5],
  },
  valueProp: {
    flexDirection: 'row',
    gap: spacing[4],
    alignItems: 'flex-start',
  },
  valuePropDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
    marginTop: 7,
    flexShrink: 0,
  },
  valuePropText: {
    flex: 1,
    gap: spacing[1],
  },
  valuePropHeading: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.white,
  },
  valuePropBody: {
    fontSize: typography.size.sm,
    color: colors.inkFaint,
    lineHeight: typography.size.sm * typography.lineHeight.normal,
  },
  footer: {
    backgroundColor: colors.bgDark,
    paddingHorizontal: spacing[6],
    paddingBottom: spacing[4],
    gap: spacing[3],
    alignItems: 'center',
  },
  cta: {
    width: '100%',
  },
  footerNote: {
    fontSize: typography.size.xs,
    color: colors.inkFaint,
  },
});
