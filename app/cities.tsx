import { useState } from 'react';
import { FlatList, Pressable, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Screen } from '../src/components/layout/Screen';
import { AppText, Icon, IconButton } from '../src/components/ui';
import { locationName, searchLocations } from '../src/features/locations/locations';
import { usePreferences } from '../src/store/preferences';
import { tokens, useTheme } from '../src/theme';
import { latestCoverage } from '../src/database/coverage';
export default function Cities() {
  const [query, setQuery] = useState('');
  const { colors } = useTheme();
  const city = usePreferences((s) => s.locationId);
  const setCity = usePreferences((s) => s.setLocation);
  const recent = usePreferences((s) => s.recentLocations);
  const select = (id: string) => {
    setCity(id);
    void Haptics.selectionAsync().catch(() => {});
    router.back();
  };
  return (
    <Screen scroll={false}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <AppText variant="title">Şəhər seçimi</AppText>
        <IconButton name="close" label="Bağla" onPress={() => router.back()} />
      </View>
      <TextInput
        accessibilityLabel="Şəhər axtar"
        placeholder="Şəhər və ya rayon axtar"
        placeholderTextColor={colors.muted}
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
        style={{
          backgroundColor: colors.surface,
          color: colors.text,
          padding: 16,
          borderRadius: 16,
          fontFamily: tokens.font.medium,
          fontSize: 16,
          minHeight: 52,
        }}
      />
      {!query && recent.length > 0 && (
        <View style={{ gap: 8 }}>
          <AppText variant="caption" style={{ color: colors.muted }}>
            SON SEÇİMLƏR
          </AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {recent.map((id) => (
              <Pressable
                accessibilityRole="button"
                key={id}
                onPress={() => select(id)}
                style={{
                  minHeight: 48,
                  padding: 12,
                  backgroundColor: colors.elevated,
                  borderRadius: 12,
                }}
              >
                <AppText>{locationName(id)}</AppText>
              </Pressable>
            ))}
          </View>
        </View>
      )}
      <AppText variant="caption" style={{ color: colors.muted }}>
        {latestCoverage}
      </AppText>
      <FlatList
        data={searchLocations(query)}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={<AppText>Şəhər tapılmadı.</AppText>}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected: city === item.id }}
            onPress={() => select(item.id)}
            style={{
              flexDirection: 'row',
              gap: 16,
              alignItems: 'center',
              paddingVertical: 16,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <View style={{ flex: 1 }}>
              <AppText variant="heading">{item.name}</AppText>
            </View>
            {city === item.id && <Icon name="checkmark-circle" />}
          </Pressable>
        )}
      />
    </Screen>
  );
}
