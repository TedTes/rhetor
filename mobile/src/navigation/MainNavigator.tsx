import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import type { CreatedSession } from '../services/home';
import { RecordSessionScreen } from '../screens/main/RecordSessionScreen';
import { MainTabNavigator } from './MainTabNavigator';

export type MainStackParams = {
  MainTabs: undefined;
  RecordSession: {
    session: CreatedSession;
  };
};

const Stack = createNativeStackNavigator<MainStackParams>();

export function MainNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabNavigator} />
      <Stack.Screen name="RecordSession" component={RecordSessionScreen} />
    </Stack.Navigator>
  );
}
