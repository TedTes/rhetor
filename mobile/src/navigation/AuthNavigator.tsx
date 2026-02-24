import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { MagicLinkScreen } from '../screens/auth/MagicLinkScreen';

export type AuthStackParams = {
  MagicLink: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParams>();

export function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MagicLink" component={MagicLinkScreen} />
    </Stack.Navigator>
  );
}
