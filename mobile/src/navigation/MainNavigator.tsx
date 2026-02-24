import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { HomeScreen } from '../screens/main/HomeScreen';

export type MainStackParams = {
  Home: undefined;
};

const Stack = createNativeStackNavigator<MainStackParams>();

export function MainNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
    </Stack.Navigator>
  );
}
