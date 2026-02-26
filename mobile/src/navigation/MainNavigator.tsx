import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import type { CreatedSession } from '../services/home';
import { HomeScreen } from '../screens/main/HomeScreen';
import { RecordSessionScreen } from '../screens/main/RecordSessionScreen';

export type MainStackParams = {
  Home: undefined;
  RecordSession: {
    session: CreatedSession;
  };
};

const Stack = createNativeStackNavigator<MainStackParams>();

export function MainNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="RecordSession" component={RecordSessionScreen} />
    </Stack.Navigator>
  );
}
