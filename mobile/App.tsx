import 'react-native-url-polyfill/auto';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { useAuthSession } from './src/hooks/useAuthSession';
import { AuthNavigator } from './src/navigation/AuthNavigator';
import { OnboardingNavigator } from './src/navigation/OnboardingNavigator';
import { LoadingScreen } from './src/screens/LoadingScreen';

type RootStackParams = {
  Loading: undefined;
  Auth: undefined;
  Onboarding: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParams>();
const BYPASS_AUTH = process.env.EXPO_PUBLIC_BYPASS_AUTH === 'true';

export default function App() {
  const session = useAuthSession();

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <RootStack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          animationDuration: 200,
        }}
      >
        {BYPASS_AUTH ? (
          // Dev mode: bypass auth to unblock feature implementation.
          <RootStack.Screen name="Onboarding">
            {() => (
              <OnboardingNavigator
                onComplete={() => {
                  console.log('Onboarding complete');
                }}
              />
            )}
          </RootStack.Screen>
        ) : session === undefined ? (
          // Session not yet resolved — show minimal loading screen
          <RootStack.Screen name="Loading" component={LoadingScreen} />
        ) : session ? (
          // Authenticated — enter onboarding flow
          <RootStack.Screen name="Onboarding">
            {() => (
              <OnboardingNavigator
                onComplete={() => {
                  // TODO: replace with main app navigator once built
                  console.log('Onboarding complete');
                }}
              />
            )}
          </RootStack.Screen>
        ) : (
          // Not authenticated — show magic link sign-in
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
