import { ActivityIndicator, Pressable, View } from 'react-native';
import { AppText, Icon } from '../../components/ui';
import { tokens, useTheme } from '../../theme';
import { appUpdates, downloadProgress, useAppUpdates } from './service';

export function UpdateBadge() {
  const update = useAppUpdates();
  const { colors } = useTheme();
  if (update.status === 'idle') return null;
  const downloading = update.status === 'pending' || update.status === 'downloading';
  const ready = update.status === 'downloaded';
  const installing = update.status === 'installing';
  const progress = downloadProgress(update);
  const label = ready
    ? 'Hazırdır'
    : installing
      ? 'Quraşdırılır'
      : downloading
        ? progress === undefined
          ? 'Yüklənir'
          : `${progress}%`
        : 'Yenilə';
  const description = ready
    ? 'Yeniləmə hazırdır, paneli aç'
    : installing
      ? 'Yeniləmə quraşdırılır'
      : downloading
        ? `Yeniləmə ${progress === undefined ? 'yüklənir' : `${progress}% yüklənib`}, paneli aç`
        : 'Yeni versiya mövcuddur, yeniləmə panelini aç';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={description}
      accessibilityState={{ disabled: installing }}
      disabled={installing}
      onPress={appUpdates.open}
      style={({ pressed }) => ({
        minHeight: 44,
        justifyContent: 'center',
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 3,
          paddingHorizontal: 8,
          paddingVertical: 6,
          minHeight: 32,
          borderRadius: 11,
          backgroundColor: colors.selected,
        }}
      >
        <AppText
          style={{
            fontSize: 11,
            lineHeight: 17,
            color: colors.primary,
            fontFamily: tokens.font.bold,
          }}
        >
          {label}
        </AppText>
        {installing ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Icon
            name={
              ready
                ? 'checkmark-circle-outline'
                : downloading
                  ? 'download-outline'
                  : 'arrow-up-outline'
            }
            size={12}
          />
        )}
      </View>
    </Pressable>
  );
}
