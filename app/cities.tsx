import { useState } from 'react';
import { FlatList, Pressable, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Screen } from '../src/components/layout/Screen';
import { ScreenHeader } from '../src/components/layout/ScreenHeader';
import { AppText, Icon } from '../src/components/ui';
import { locationName, searchLocations } from '../src/features/locations/locations';
import { usePreferences } from '../src/store/preferences';
import { tokens, useTheme } from '../src/theme';
export default function Cities() {
  const [query, setQuery] = useState('');
  const { colors } = useTheme();
  const city = usePreferences((s) => s.locationId);
  const setCity = usePreferences((s) => s.setLocation);
  const recent = usePreferences((s) => s.recentLocations);
  const results = searchLocations(query);
  const matches = query.trim()
    ? results
    : [
        ...results.filter((item) => item.id === city),
        ...results.filter((item) => item.id !== city),
      ];
  const select = (id: string) => {
    setCity(id);
    void Haptics.selectionAsync().catch(() => {});
    router.back();
  };
  return (
    <Screen
      scroll={false}
      bottomSafeArea
      header={<ScreenHeader title="Şəhər seçimi" action="close" onBack={() => router.back()} />}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          backgroundColor: colors.surface,
          paddingLeft: 16,
          paddingRight: 4,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: colors.border,
          minHeight: 56,
        }}
      >
        <Icon name="search-outline" size={20} color={colors.muted} />
        <TextInput
          accessibilityLabel="Şəhər axtar"
          placeholder="Şəhər və ya rayon axtar"
          placeholderTextColor={colors.muted}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          style={{
            flex: 1,
            minWidth: 0,
            color: colors.text,
            paddingVertical: 14,
            fontFamily: tokens.font.medium,
            fontSize: 16,
          }}
        />
        {query.length > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Axtarışı təmizlə"
            onPress={() => setQuery('')}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="close-circle" size={20} color={colors.muted} />
          </Pressable>
        )}
      </View>
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
                  backgroundColor: city === id ? colors.selected : colors.surface,
                  borderRadius: 14,
                }}
              >
                <AppText style={{ color: city === id ? colors.selectedText : colors.text }}>
                  {locationName(id)}
                </AppText>
              </Pressable>
            ))}
          </View>
        </View>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <AppText variant="caption" style={{ color: colors.muted }}>
          BÖLGƏLƏR
        </AppText>
        <AppText variant="caption" style={{ color: colors.muted }}>
          {matches.length} bölgə
        </AppText>
      </View>
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 12 }}
        data={matches}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={<AppText>Şəhər tapılmadı.</AppText>}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="radio"
            accessibilityLabel={item.name}
            accessibilityState={{ checked: city === item.id, selected: city === item.id }}
            aria-checked={city === item.id}
            onPress={() => select(item.id)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              gap: 12,
              alignItems: 'center',
              minHeight: 68,
              padding: 12,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: city === item.id ? 'transparent' : colors.border,
              backgroundColor: pressed
                ? colors.pressed
                : city === item.id
                  ? colors.selected
                  : colors.surface,
            })}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 11,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: city === item.id ? colors.selectedIcon : colors.elevated,
              }}
            >
              <Icon
                name="location-outline"
                size={19}
                color={city === item.id ? colors.selectedText : colors.secondary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <AppText
                variant="heading"
                style={{ color: city === item.id ? colors.selectedText : colors.text }}
              >
                {item.name}
              </AppText>
            </View>
            {city === item.id && <Icon name="checkmark-circle" color={colors.selectedText} />}
          </Pressable>
        )}
      />
    </Screen>
  );
}
