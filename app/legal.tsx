import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { Screen } from '../src/components/layout/Screen';
import { AppText, IconButton } from '../src/components/ui';
import { privacy, terms } from '../src/localization/legal';
export default function Legal() {
  const { type } = useLocalSearchParams();
  return (
    <Screen>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <AppText variant="heading">{type === 'privacy' ? 'Məxfilik' : 'İstifadə şərtləri'}</AppText>
        <IconButton name="close" label="Bağla" onPress={() => router.back()} />
      </View>
      <AppText style={{ lineHeight: 28 }}>{type === 'privacy' ? privacy : terms}</AppText>
    </Screen>
  );
}
