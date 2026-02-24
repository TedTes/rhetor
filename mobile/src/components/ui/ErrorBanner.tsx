import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../../theme';

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <View style={styles.container} accessibilityRole="alert">
      <Text style={styles.message} numberOfLines={3}>
        {message}
      </Text>
      {onRetry && (
        <Pressable
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Retry"
          style={({ pressed }) => [styles.retry, pressed && styles.retryPressed]}
        >
          <Text style={styles.retryLabel}>Retry</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.errorBg,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: radii.md,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    gap: spacing[3],
  },
  message: {
    flex: 1,
    fontSize: typography.size.sm,
    color: colors.error,
    fontWeight: typography.weight.medium,
    lineHeight: typography.size.sm * typography.lineHeight.normal,
  },
  retry: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1] + 2,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.error,
  },
  retryPressed: {
    backgroundColor: colors.error,
  },
  retryLabel: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.error,
  },
});
