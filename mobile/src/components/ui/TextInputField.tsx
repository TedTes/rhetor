import React, { forwardRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';
import { colors, radii, spacing, typography } from '../../theme';

interface TextInputFieldProps extends TextInputProps {
  label: string;
  error?: string;
  hint?: string;
}

export const TextInputField = forwardRef<TextInput, TextInputFieldProps>(
  ({ label, error, hint, ...props }, ref) => {
    const [focused, setFocused] = useState(false);
    const hasError = !!error;

    return (
      <View style={styles.wrapper}>
        <Text style={styles.label} accessibilityLabel={label}>
          {label}
        </Text>
        <TextInput
          ref={ref}
          style={[
            styles.input,
            focused && styles.inputFocused,
            hasError && styles.inputError,
          ]}
          placeholderTextColor={colors.inkFaint}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            props.onBlur?.(undefined as never);
          }}
          accessibilityLabel={label}
          accessibilityHint={hint}
          {...props}
        />
        {hasError && (
          <Text style={styles.error} accessibilityRole="alert">
            {error}
          </Text>
        )}
        {!hasError && hint && <Text style={styles.hint}>{hint}</Text>}
      </View>
    );
  },
);

TextInputField.displayName = 'TextInputField';

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing[1],
  },
  label: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.ink,
    letterSpacing: 0.1,
  },
  input: {
    height: 50,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing[4],
    fontSize: typography.size.md,
    color: colors.ink,
  },
  inputFocused: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSurface,
  },
  inputError: {
    borderColor: colors.error,
    backgroundColor: colors.errorBg,
  },
  error: {
    fontSize: typography.size.xs,
    color: colors.error,
    fontWeight: typography.weight.medium,
  },
  hint: {
    fontSize: typography.size.xs,
    color: colors.inkLight,
  },
});
