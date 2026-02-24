import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../lib/supabase';
import { colors, spacing, typography } from '../../theme';

export function HomeScreen() {
  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.textBlock}>
          <Text style={styles.title}>Rhetor Home</Text>
          <Text style={styles.subtitle}>Post-onboarding landing screen</Text>
        </View>

        <Button
          label="Sign out (temp)"
          variant="secondary"
          onPress={handleSignOut}
          style={styles.signOut}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing[6],
    paddingTop: spacing[12],
    gap: spacing[10],
  },
  textBlock: {
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
  },
  signOut: {
    alignSelf: 'flex-start',
  },
});
