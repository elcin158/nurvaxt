import { Tabs } from 'expo-router';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../src/components/ui';
import { tokens, useTheme } from '../../src/theme';
export default function TabsLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const bottomPadding = insets.bottom + 8;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.selectedText,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          elevation: 0,
          height: 48 + bottomPadding + Math.max(0, fontScale - 1) * 24,
          paddingTop: 4,
          paddingBottom: bottomPadding,
        },
        tabBarLabelStyle: {
          fontFamily: tokens.font.medium,
          fontSize: 11,
          lineHeight: 14,
          flexShrink: 0,
        },
        tabBarIconStyle: { height: 22 },
        tabBarItemStyle: { minHeight: 44, paddingVertical: 0 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Bu gün',
          tabBarIcon: ({ color }) => <Icon name="home-outline" color={color} size={19} />,
        }}
      />
      <Tabs.Screen
        name="qibla"
        options={{
          title: 'Qiblə',
          tabBarIcon: ({ color }) => <Icon name="compass-outline" color={color} size={19} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ayarlar',
          tabBarIcon: ({ color }) => <Icon name="settings-outline" color={color} size={19} />,
        }}
      />
    </Tabs>
  );
}
