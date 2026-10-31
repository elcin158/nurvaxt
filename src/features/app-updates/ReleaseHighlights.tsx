import { View } from 'react-native';
import { AppText, Icon } from '../../components/ui';
import { tokens, useTheme } from '../../theme';
import type { ReleaseNotes } from './releases';

export function ReleaseHighlights({ release }: { release: ReleaseNotes }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 20 }}>
      {release.items.map((item) => (
        <View key={item.title} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
          <View
            style={{
              width: 37,
              height: 37,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.selected,
            }}
          >
            <Icon name={item.icon} size={20} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <AppText style={{ fontSize: 14, lineHeight: 21, fontFamily: tokens.font.bold }}>
              {item.title}
            </AppText>
            <AppText variant="caption" style={{ color: colors.muted }}>
              {item.description}
            </AppText>
          </View>
        </View>
      ))}
    </View>
  );
}
