import { ActivityIndicator, Pressable, View } from 'react-native';
import { AppText, Card, Icon } from '../../components/ui';
import { tokens, useTheme } from '../../theme';
import { appUpdates, useAppUpdates } from './service';

export function UpdateBanner() {
  const update = useAppUpdates();
  const { colors } = useTheme();
  if (!update.visible) return null;
  const ready = update.status === 'downloaded';
  const downloading = update.status === 'downloading' || update.status === 'pending';
  const installing = update.status === 'installing';
  const progress =
    update.totalBytes > 0
      ? Math.max(0, Math.min(100, Math.round((update.bytesDownloaded / update.totalBytes) * 100)))
      : undefined;
  const title = ready
    ? 'Yeniləmə hazırdır'
    : installing
      ? 'Yeniləmə quraşdırılır'
      : downloading
        ? 'Yeniləmə yüklənir'
        : 'Yeni versiya mövcuddur';
  const message = ready
    ? 'Quraşdırmanı tamamlamaq üçün tətbiqi yenidən başladın.'
    : installing
      ? 'NurVaxt bir azdan yenidən açılacaq.'
      : downloading
        ? 'Tətbiqdən istifadə etməyə davam edə bilərsiniz.'
        : 'NurVaxt-ı yeniləyərək son təkmilləşdirmələrdən yararlanın.';
  return (
    <Card style={{ padding: 14, borderRadius: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.selected,
          }}
        >
          <Icon name={ready ? 'checkmark-circle-outline' : 'download-outline'} size={20} />
        </View>
        <View style={{ flex: 1, gap: 4 }} accessibilityLiveRegion="polite">
          <AppText style={{ fontFamily: tokens.font.bold, fontSize: 14 }}>{title}</AppText>
          <AppText variant="caption" style={{ color: colors.muted }}>
            {update.error ?? message}
          </AppText>
        </View>
      </View>
      {downloading && (
        <View style={{ gap: 6, marginTop: 14 }}>
          {progress === undefined ? (
            <ActivityIndicator color={colors.primary} accessibilityLabel="Yeniləmə yüklənir" />
          ) : (
            <View
              accessible
              accessibilityRole="progressbar"
              accessibilityLabel="Yeniləmənin yüklənməsi"
              accessibilityValue={{ min: 0, max: 100, now: progress }}
              style={{
                height: 5,
                borderRadius: 5,
                overflow: 'hidden',
                backgroundColor: colors.elevated,
              }}
            >
              <View
                style={{ width: `${progress}%`, height: '100%', backgroundColor: colors.primary }}
              />
            </View>
          )}
          <AppText variant="caption" style={{ color: colors.muted, textAlign: 'right' }}>
            {progress === undefined ? 'Google Play vasitəsilə' : `${progress}%`}
          </AppText>
        </View>
      )}
      {!downloading && !installing && (
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'flex-end',
            gap: 8,
            marginTop: 10,
          }}
        >
          <Pressable
            accessibilityRole="button"
            disabled={update.busy}
            accessibilityState={{ disabled: update.busy }}
            onPress={() => void appUpdates.dismiss()}
            style={({ pressed }) => ({
              minHeight: 44,
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 12,
              justifyContent: 'center',
              backgroundColor: pressed ? colors.pressed : 'transparent',
              opacity: update.busy ? 0.5 : 1,
            })}
          >
            <AppText
              variant="caption"
              style={{ color: colors.muted, fontFamily: tokens.font.semibold }}
            >
              Sonra
            </AppText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: update.busy, busy: update.busy }}
            disabled={update.busy}
            onPress={() => void (ready ? appUpdates.install() : appUpdates.start())}
            style={({ pressed }) => ({
              minHeight: 44,
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 12,
              justifyContent: 'center',
              alignItems: 'center',
              flexDirection: 'row',
              gap: 7,
              backgroundColor: colors.primary,
              opacity: update.busy ? 0.6 : pressed ? 0.75 : 1,
            })}
          >
            {update.busy && <ActivityIndicator size="small" color={colors.onPrimary} />}
            <AppText
              variant="caption"
              style={{ color: colors.onPrimary, fontFamily: tokens.font.bold }}
            >
              {ready ? 'Yenidən başlat' : update.error ? 'Yenidən cəhd et' : 'Yenilə'}
            </AppText>
            {!ready && !update.error && (
              <Icon name="arrow-up-outline" size={15} color={colors.onPrimary} />
            )}
          </Pressable>
        </View>
      )}
    </Card>
  );
}
