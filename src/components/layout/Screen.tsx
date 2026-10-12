import type { PropsWithChildren, ReactNode } from 'react';
import { ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
export function Screen({
  children,
  scroll = true,
  bottomSafeArea = false,
  header,
  contentStyle,
}: PropsWithChildren<{
  scroll?: boolean;
  bottomSafeArea?: boolean;
  header?: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
}>) {
  const { colors } = useTheme();
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={bottomSafeArea ? ['top', 'left', 'right', 'bottom'] : ['top', 'left', 'right']}
    >
      {header && (
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom: 12,
            width: '100%',
            maxWidth: 620,
            alignSelf: 'center',
          }}
        >
          {header}
        </View>
      )}
      {scroll ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            {
              padding: 20,
              paddingTop: header ? 8 : 20,
              gap: 20,
              paddingBottom: 32,
              width: '100%',
              maxWidth: 620,
              alignSelf: 'center',
            },
            contentStyle,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View
          style={[
            {
              flex: 1,
              padding: 20,
              paddingTop: header ? 8 : 20,
              gap: 20,
              width: '100%',
              maxWidth: 620,
              alignSelf: 'center',
            },
            contentStyle,
          ]}
        >
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}
