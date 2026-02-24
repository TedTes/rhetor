import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, shadows, spacing, typography } from '../../theme';

interface CohortCardProps {
  name: string;
  description: string;
  tag: string;
  isSelected: boolean;
  onPress: () => void;
}

export function CohortCard({
  name,
  description,
  tag,
  isSelected,
  onPress,
}: CohortCardProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={name}
      accessibilityHint={description}
      accessibilityState={{ checked: isSelected }}
      style={({ pressed }) => [
        styles.card,
        isSelected && styles.cardSelected,
        pressed && !isSelected && styles.cardPressed,
      ]}
    >
      <View style={styles.header}>
        <View style={[styles.tagBadge, isSelected && styles.tagBadgeSelected]}>
          <Text style={[styles.tagText, isSelected && styles.tagTextSelected]}>
            {tag}
          </Text>
        </View>
        <View style={[styles.radio, isSelected && styles.radioSelected]}>
          {isSelected && <View style={styles.radioDot} />}
        </View>
      </View>
      <Text style={[styles.name, isSelected && styles.nameSelected]}>{name}</Text>
      <Text style={styles.description}>{description}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing[5],
    gap: spacing[2],
    ...shadows.sm,
  },
  cardSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSurface,
  },
  cardPressed: {
    backgroundColor: colors.surfaceAlt,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[1],
  },
  tagBadge: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  tagBadgeSelected: {
    backgroundColor: colors.accentLight,
  },
  tagText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.inkLight,
    letterSpacing: 0.2,
  },
  tagTextSelected: {
    color: colors.accent,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: radii.full,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.accent,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: radii.full,
    backgroundColor: colors.accent,
  },
  name: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.ink,
    lineHeight: typography.size.lg * typography.lineHeight.snug,
  },
  nameSelected: {
    color: colors.accent,
  },
  description: {
    fontSize: typography.size.sm,
    color: colors.inkLight,
    lineHeight: typography.size.sm * typography.lineHeight.normal,
  },
});
