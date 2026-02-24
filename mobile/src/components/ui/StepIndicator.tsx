import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../../theme';

interface StepIndicatorProps {
  current: number;
  total: number;
}

export function StepIndicator({ current, total }: StepIndicatorProps) {
  return (
    <View style={styles.container} accessibilityLabel={`Step ${current} of ${total}`}>
      <View style={styles.dots}>
        {Array.from({ length: total }, (_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i + 1 < current && styles.dotCompleted,
              i + 1 === current && styles.dotActive,
              i + 1 > current && styles.dotPending,
            ]}
          />
        ))}
      </View>
      <Text style={styles.label}>
        {current} / {total}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  dots: {
    flexDirection: 'row',
    gap: spacing[1] + 2,
    alignItems: 'center',
  },
  dot: {
    height: 8,
    borderRadius: radii.full,
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.accent,
  },
  dotCompleted: {
    width: 8,
    backgroundColor: colors.accentLight,
  },
  dotPending: {
    width: 8,
    backgroundColor: colors.border,
  },
  label: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.inkLight,
    letterSpacing: 0.3,
  },
});
