import { View } from 'react-native';
import { AppText, IconButton } from '../ui';

export function ScreenHeader({
  title,
  onBack,
  action = 'back',
  titleVariant = 'title',
}: {
  title: string;
  onBack: () => void;
  action?: 'back' | 'close';
  titleVariant?: 'title' | 'heading';
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, minHeight: 48 }}>
      {action === 'back' && <IconButton name="chevron-back" label="Geri" onPress={onBack} />}
      <AppText variant={titleVariant} style={{ flex: 1 }}>
        {title}
      </AppText>
      {action === 'close' && <IconButton name="close" label="Bağla" onPress={onBack} />}
    </View>
  );
}
