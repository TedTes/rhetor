import 'react-native-url-polyfill/auto';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { OnboardingNavigator } from './src/navigation/OnboardingNavigator';

export default function App() {
  function handleOnboardingComplete() {
    // TODO: navigate to main app / update auth state
    console.log('Onboarding complete — navigate to main app here');
  }

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <OnboardingNavigator onComplete={handleOnboardingComplete} />
    </NavigationContainer>
  );
}
