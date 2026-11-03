import type { PropsWithChildren } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Icon } from '../../components/ui';
import { tokens, useTheme } from '../../theme';
import { findRelease } from './releases';
import { ReleaseHighlights } from './ReleaseHighlights';
import { appUpdates, downloadProgress, useAppUpdates } from './service';
import { openPlayStore } from './store-page';

function PanelAction({
  children,
  primary = false,
  busy = false,
  onPress,
}: PropsWithChildren<{
  primary?: boolean;
  busy?: boolean;
  onPress: () => void;
}>) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: busy, busy }}
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: primary ? 1 : undefined,
        minHeight: 48,
        paddingHorizontal: primary ? 18 : 20,
        paddingVertical: 12,
        borderRadius: 14,
        backgroundColor: primary ? colors.primary : colors.elevated,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
        opacity: busy ? 0.6 : pressed ? 0.75 : 1,
      })}
    >
      {busy && (
        <ActivityIndicator size="small" color={primary ? colors.onPrimary : colors.primary} />
      )}
      <AppText
        variant="caption"
        style={{
          fontFamily: tokens.font.bold,
          color: primary ? colors.onPrimary : colors.muted,
          textAlign: 'center',
        }}
      >
        {children}
      </AppText>
    </Pressable>
  );
}

export function UpdatePanel() {
  const update = useAppUpdates();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { height, width, fontScale } = useWindowDimensions();
  if (!update.panel) return null;
  const whatsNew = update.panel === 'whats-new';
  const release = whatsNew
    ? update.announcement
    : (findRelease(update.versionCode) ??
      (update.release?.versionCode === update.versionCode ? update.release : null));
  if (whatsNew && !release) return null;
  const ready = !whatsNew && update.status === 'downloaded';
  const downloading = !whatsNew && (update.status === 'pending' || update.status === 'downloading');
  const installing = !whatsNew && update.status === 'installing';
  const progress = downloadProgress(update);
  const title = whatsNew
    ? 'NurVaxt-da yeniliklər'
    : ready
      ? 'Yeniləmə hazırdır'
      : downloading
        ? 'Yeniləmə yüklənir'
        : installing
          ? 'Yeniləmə quraşdırılır'
          : 'Yeni versiya mövcuddur';
  const subtitle = whatsNew
    ? 'Tətbiqiniz yeniləndi'
    : ready
      ? 'Quraşdırmaq üçün tətbiqi yenidən başladın.'
      : downloading
        ? 'Google Play vasitəsilə'
        : installing
          ? 'NurVaxt bir azdan yenidən açılacaq.'
          : 'Yeniləmədə nələr var?';
  const dismiss = () => {
    if (!update.busy) void appUpdates.dismiss();
  };
  const stacked = width < 340 || fontScale > 1.2;
  return (
    <Modal transparent animationType="slide" visible onRequestClose={dismiss} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000066' }}>
        <Pressable
          accessible={false}
          importantForAccessibility="no"
          style={StyleSheet.absoluteFill}
          onPress={dismiss}
        />
        <View
          testID="update-panel"
          accessibilityViewIsModal
          style={{
            maxHeight: height - insets.top - 12,
            width: '100%',
            maxWidth: 520,
            alignSelf: 'center',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            backgroundColor: colors.surface,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              width: 34,
              height: 4,
              borderRadius: 4,
              backgroundColor: colors.border,
              alignSelf: 'center',
              marginTop: 10,
              marginBottom: 6,
            }}
          />
          <ScrollView
            contentContainerStyle={{
              padding: 24,
              paddingTop: 16,
              paddingBottom: Math.max(22, insets.bottom + 12),
              gap: 24,
            }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={{ gap: 15 }}>
              <View
                style={{
                  width: 47,
                  height: 47,
                  borderRadius: 16,
                  backgroundColor: colors.selected,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon
                  name={
                    ready
                      ? 'checkmark-circle-outline'
                      : downloading || installing
                        ? 'download-outline'
                        : 'sparkles-outline'
                  }
                  size={25}
                />
              </View>
              <View style={{ gap: 8 }}>
                <AppText
                  accessibilityRole="header"
                  style={{
                    fontFamily: tokens.font.bold,
                    fontSize: 24,
                    lineHeight: 31,
                    letterSpacing: -0.7,
                  }}
                >
                  {title}
                </AppText>
                <View
                  style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}
                >
                  {release && (
                    <AppText
                      variant="caption"
                      style={{
                        color: colors.primary,
                        backgroundColor: colors.selected,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 7,
                      }}
                    >
                      {release.version}
                    </AppText>
                  )}
                  <AppText variant="caption" style={{ color: colors.muted, flexShrink: 1 }}>
                    {subtitle}
                  </AppText>
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Yeniliklər panelini bağla"
                disabled={update.busy}
                accessibilityState={{ disabled: update.busy }}
                onPress={dismiss}
                style={{
                  position: 'absolute',
                  right: -10,
                  top: -8,
                  width: 44,
                  height: 44,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: update.busy ? 0.5 : 1,
                }}
              >
                <Icon name="close-outline" color={colors.muted} size={22} />
              </Pressable>
            </View>
            {release ? (
              <ReleaseHighlights release={release} />
            ) : update.notesLoading ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <ActivityIndicator color={colors.primary} />
                <AppText variant="caption" style={{ color: colors.muted }}>
                  Yeniliklər yüklənir…
                </AppText>
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                <AppText style={{ color: colors.muted }}>
                  Bu versiyanın dəyişiklik məlumatı hazırda əlçatan deyil.
                </AppText>
                <Pressable
                  accessibilityRole="button"
                  onPress={openPlayStore}
                  style={{ minHeight: 44, justifyContent: 'center' }}
                >
                  <AppText
                    variant="caption"
                    style={{ color: colors.primary, fontFamily: tokens.font.semibold }}
                  >
                    Play Store-da bax
                  </AppText>
                </Pressable>
              </View>
            )}
            {update.error && !whatsNew && (
              <AppText accessibilityLiveRegion="assertive" style={{ color: colors.error }}>
                {update.error}
              </AppText>
            )}
            {downloading && (
              <View
                style={{ gap: 9, padding: 15, borderRadius: 16, backgroundColor: colors.selected }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                  <AppText variant="caption" style={{ color: colors.primary }}>
                    Yüklənir
                  </AppText>
                  {progress !== undefined && (
                    <AppText variant="caption" style={{ color: colors.primary }}>
                      {progress}%
                    </AppText>
                  )}
                </View>
                {progress === undefined ? (
                  <ActivityIndicator
                    color={colors.primary}
                    accessibilityLabel="Yeniləmə yüklənir"
                  />
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
                      backgroundColor: colors.border,
                    }}
                  >
                    <View
                      style={{
                        width: `${progress}%`,
                        height: '100%',
                        backgroundColor: colors.primary,
                      }}
                    />
                  </View>
                )}
                <AppText variant="caption" style={{ color: colors.muted }}>
                  Tətbiqdən istifadə etməyə davam edə bilərsiniz.
                </AppText>
              </View>
            )}
            <View style={{ gap: 4 }}>
              {whatsNew || downloading || installing ? (
                <View style={{ flexDirection: 'row' }}>
                  <PanelAction primary onPress={dismiss}>
                    {downloading || installing ? 'Arxa planda davam et' : 'Oldu'}
                  </PanelAction>
                </View>
              ) : (
                <View style={{ flexDirection: stacked ? 'column-reverse' : 'row', gap: 10 }}>
                  <PanelAction busy={update.busy} onPress={dismiss}>
                    Sonra
                  </PanelAction>
                  <PanelAction
                    primary
                    busy={update.busy}
                    onPress={() => void (ready ? appUpdates.install() : appUpdates.start())}
                  >
                    {ready ? 'Yenidən başlat' : update.error ? 'Yenidən cəhd et' : 'Yenilə'}
                  </PanelAction>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
