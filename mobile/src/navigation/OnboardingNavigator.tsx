/**
 * Required packages (add to package.json if not present):
 *   @react-navigation/native @react-navigation/native-stack
 *   react-native-screens react-native-safe-area-context
 *   react-hook-form @hookform/resolvers zod
 *   @supabase/supabase-js expo-secure-store react-native-url-polyfill
 */
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import type { AssignmentResult, CohortFocusArea, ProfileFormData } from '../types/onboarding';
import { AssignmentResultScreen } from '../screens/onboarding/AssignmentResultScreen';
import { CohortSelectionScreen } from '../screens/onboarding/CohortSelectionScreen';
import { ProfileSetupScreen } from '../screens/onboarding/ProfileSetupScreen';
import { WelcomeScreen } from '../screens/onboarding/WelcomeScreen';

export type OnboardingStackParams = {
  Welcome: undefined;
  ProfileSetup: undefined;
  CohortSelection: { profile: ProfileFormData };
  AssignmentResult: {
    assignment: AssignmentResult;
    cohortName: string;
    focusArea: CohortFocusArea;
  };
};

export interface OnboardingNavigatorProps {
  /** Called after the user taps "Continue to Rhetor" on the result screen. */
  onComplete: () => void;
}

const Stack = createNativeStackNavigator<OnboardingStackParams>();

export function OnboardingNavigator({ onComplete }: OnboardingNavigatorProps) {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#F8FAFC' },
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
      <Stack.Screen name="CohortSelection" component={CohortSelectionScreen} />
      <Stack.Screen name="AssignmentResult">
        {(props) => <AssignmentResultScreen {...props} onComplete={onComplete} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
