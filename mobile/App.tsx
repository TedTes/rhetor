import 'react-native-url-polyfill/auto';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { LogBox } from 'react-native';
import { useAuthSession } from './src/hooks/useAuthSession';
import { AuthNavigator } from './src/navigation/AuthNavigator';
import { MainNavigator } from './src/navigation/MainNavigator';
import { OnboardingNavigator } from './src/navigation/OnboardingNavigator';
import { LoadingScreen } from './src/screens/LoadingScreen';
import {
  getOnboardingCompleted,
  markOnboardingCompleted,
} from './src/services/onboarding';

type RootStackParams = {
  Loading: undefined;
  Auth: undefined;
  Onboarding: undefined;
  Main: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParams>();
const BYPASS_AUTH = process.env.EXPO_PUBLIC_BYPASS_AUTH === 'true';

LogBox.ignoreLogs([
  '[expo-av]: Expo AV has been deprecated and will be removed in SDK 54.',
]);

export default function App() {
  const session = useAuthSession();
  const [onboardingDone, setOnboardingDone] = useState<boolean>(false);
  const [onboardingResolved, setOnboardingResolved] = useState<boolean>(BYPASS_AUTH);

  useEffect(() => {
    if (BYPASS_AUTH) return;

    if (!session) {
      setOnboardingDone(false);
      setOnboardingResolved(true);
      return;
    }

    let cancelled = false;
    setOnboardingResolved(false);

    getOnboardingCompleted(session.user.id)
      .then((done) => {
        if (!cancelled) setOnboardingDone(done);
      })
      .catch(() => {
        if (!cancelled) setOnboardingDone(false);
      })
      .finally(() => {
        if (!cancelled) setOnboardingResolved(true);
      });

    return () => {
      cancelled = true;
    };
  }, [session]);

  function onboardingScreen() {
    return (
      <RootStack.Screen name="Onboarding">
        {() => (
          <OnboardingNavigator
            onComplete={() => {
              if (BYPASS_AUTH || !session?.user?.id) {
                setOnboardingDone(true);
                return;
              }

              markOnboardingCompleted(session.user.id)
                .then(() => setOnboardingDone(true))
                .catch(() => {
                  // Keep user in onboarding if persistence fails.
                });
            }}
          />
        )}
      </RootStack.Screen>
    );
  }

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
          onboardingDone ? (
            <RootStack.Screen name="Main" component={MainNavigator} />
          ) : (
            onboardingScreen()
          )
        ) : session === undefined || (session && !onboardingResolved) ? (
          // Session not yet resolved — show minimal loading screen
          <RootStack.Screen name="Loading" component={LoadingScreen} />
        ) : session ? (
          // Authenticated — onboarding then main
          onboardingDone ? (
            <RootStack.Screen name="Main" component={MainNavigator} />
          ) : (
            onboardingScreen()
          )
        ) : (
          // Not authenticated — show magic link sign-in
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
