import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../src/components/ui';
import { tokens, useTheme } from '../../src/theme';
export default function TabsLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 16);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 64 + bottomPadding,
          paddingTop: 10,
          paddingBottom: bottomPadding,
        },
        tabBarLabelStyle: { fontFamily: tokens.font.semibold, fontSize: 12 },
        tabBarItemStyle: { minHeight: 48, paddingVertical: 2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Bu gün',
          tabBarIcon: ({ color }) => <Icon name="sunny-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Təqvim',
          tabBarIcon: ({ color }) => <Icon name="calendar-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ayarlar',
          tabBarIcon: ({ color }) => <Icon name="options-outline" color={color} />,
        }}
      />
    </Tabs>
  );
}
