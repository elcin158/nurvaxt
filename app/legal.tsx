import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '../src/components/layout/Screen';
import { ScreenHeader } from '../src/components/layout/ScreenHeader';
import { AppText } from '../src/components/ui';
import { privacy, terms } from '../src/localization/legal';
export default function Legal() {
  const { type } = useLocalSearchParams();
  return (
    <Screen
      bottomSafeArea
      header={
        <ScreenHeader
          title={type === 'privacy' ? 'Məxfilik' : 'İstifadə şərtləri'}
          titleVariant="heading"
          action="close"
          onBack={() => router.back()}
        />
      }
    >
      <AppText style={{ lineHeight: 28 }}>{type === 'privacy' ? privacy : terms}</AppText>
    </Screen>
  );
}
