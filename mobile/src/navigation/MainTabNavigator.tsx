import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet } from 'react-native';
import { HomeScreen } from '../screens/main/HomeScreen';
import { SessionsScreen } from '../screens/main/SessionsScreen';
import { FeedbackScreen } from '../screens/main/FeedbackScreen';
import { CommunityScreen } from '../screens/main/CommunityScreen';
import { colors, typography } from '../theme';

export type MainTabParams = {
  Home: undefined;
  Sessions: undefined;
  Feedback: undefined;
  Community: undefined;
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
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused, size }) =>
            tabIcon(focused, 'home', 'home-outline', size),
        }}
      />
      <Tab.Screen
        name="Sessions"
        component={SessionsScreen}
        options={{
          tabBarLabel: 'Sessions',
          tabBarIcon: ({ focused, size }) =>
            tabIcon(focused, 'mic', 'mic-outline', size),
        }}
      />
      <Tab.Screen
        name="Feedback"
        component={FeedbackScreen}
        options={{
          tabBarLabel: 'Feedback',
          tabBarIcon: ({ focused, size }) =>
            tabIcon(focused, 'chatbubble-ellipses', 'chatbubble-ellipses-outline', size),
        }}
      />
      <Tab.Screen
        name="Community"
        component={CommunityScreen}
        options={{
          tabBarLabel: 'Community',
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
