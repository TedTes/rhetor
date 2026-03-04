import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet } from 'react-native';
import { SessionsScreen } from '../screens/main/SessionsScreen';
import { CommunityScreen } from '../screens/main/CommunityScreen';
import { ProgressScreen } from '../screens/main/ProgressScreen';
import { colors, typography } from '../theme';

export type MainTabParams = {
  Record: undefined;
  Progress: undefined;
  Pod: undefined;
};

const Tab = createBottomTabNavigator<MainTabParams>();

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function tabIcon(
  focused: boolean,
  active: IoniconName,
  inactive: IoniconName,
  size: number,
) {
  return <Ionicons name={focused ? active : inactive} size={size} color={focused ? colors.accent : colors.inkFaint} />;
}

export function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.inkFaint,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tab.Screen
        name="Record"
        component={SessionsScreen}
        options={{
          tabBarLabel: 'Record',
          tabBarIcon: ({ focused, size }) =>
            tabIcon(focused, 'mic', 'mic-outline', size),
        }}
      />
      <Tab.Screen
        name="Progress"
        component={ProgressScreen}
        options={{
          tabBarLabel: 'Progress',
          tabBarIcon: ({ focused, size }) =>
            tabIcon(focused, 'analytics', 'analytics-outline', size),
        }}
      />
      <Tab.Screen
        name="Pod"
        component={CommunityScreen}
        options={{
          tabBarLabel: 'Pod',
          tabBarIcon: ({ focused, size }) =>
            tabIcon(focused, 'people', 'people-outline', size),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    elevation: 0,
    shadowOpacity: 0,
    height: 80,
    paddingBottom: 24,
    paddingTop: 10,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: typography.weight.semibold,
    marginTop: 2,
  },
});
