import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors, radii, spacing, typography } from '../../theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'inverse';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  label: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        styles[`size_${size}`],
        pressed && !isDisabled && styles[`${variant}_pressed`],
        isDisabled && styles[`${variant}_disabled`],
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={
            variant === 'primary'
              ? colors.white
              : variant === 'inverse'
              ? colors.accent
              : colors.accent
          }
        />
      ) : (
        <Text
          style={[
            styles.label,
            styles[`label_${variant}`],
            styles[`labelSize_${size}`],
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    flexDirection: 'row',
  },

  // Variants
  primary: {
    backgroundColor: colors.accent,
  },
  primary_pressed: {
    backgroundColor: colors.accentDeep,
  },
  primary_disabled: {
    backgroundColor: colors.accentLight,
  },

  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  secondary_pressed: {
    backgroundColor: colors.surfaceAlt,
  },
  secondary_disabled: {
    opacity: 0.5,
  },

  ghost: {
    backgroundColor: 'transparent',
  },
  ghost_pressed: {
    backgroundColor: colors.surfaceAlt,
  },
  ghost_disabled: {
    opacity: 0.4,
  },

  // White background, dark text — used on dark screens
  inverse: {
    backgroundColor: colors.white,
  },
  inverse_pressed: {
    backgroundColor: colors.surfaceAlt,
  },
  inverse_disabled: {
    opacity: 0.5,
  },

  // Sizes
  size_sm: { height: 38, paddingHorizontal: spacing[3] },
  size_md: { height: 50, paddingHorizontal: spacing[5] },
  size_lg: { height: 56, paddingHorizontal: spacing[6] },

  // Labels
  label: {
    fontWeight: typography.weight.semibold,
    letterSpacing: 0.1,
  },
  label_primary: { color: colors.white },
  label_secondary: { color: colors.ink },
  label_ghost: { color: colors.accent },
  label_inverse: { color: colors.ink },

  labelSize_sm: { fontSize: typography.size.sm },
  labelSize_md: { fontSize: typography.size.md },
  labelSize_lg: { fontSize: typography.size.lg },
});
