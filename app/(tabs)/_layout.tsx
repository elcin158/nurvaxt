import { Tabs } from 'expo-router';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../src/components/ui';
import { tokens, useTheme } from '../../src/theme';
export default function TabsLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const bottomPadding = Math.max(insets.bottom, 16);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.selectedText,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          shadowColor: colors.shadow,
          shadowOpacity: 0.06,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: -4 },
          elevation: 0,
          height: 70 + bottomPadding + Math.max(0, fontScale - 1) * 24,
          paddingTop: 8,
          paddingBottom: bottomPadding,
        },
        tabBarLabelStyle: {
          fontFamily: tokens.font.semibold,
          fontSize: 12,
          lineHeight: 18,
          flexShrink: 0,
        },
        tabBarItemStyle: { minHeight: 48, paddingVertical: 2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Bu gün',
          tabBarIcon: ({ color }) => <Icon name="today-outline" color={color} size={21} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Təqvim',
          tabBarIcon: ({ color }) => <Icon name="calendar-outline" color={color} size={21} />,
        }}
      />
      <Tabs.Screen
        name="qibla"
        options={{
          title: 'Qiblə',
          tabBarIcon: ({ color }) => <Icon name="compass-outline" color={color} size={21} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ayarlar',
          tabBarIcon: ({ color }) => <Icon name="options-outline" color={color} size={21} />,
        }}
      />
    </Tabs>
  );
}
