import { useEffect } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../src/components/layout/Screen';
import { ScreenHeader } from '../src/components/layout/ScreenHeader';
import { AppText, Card } from '../src/components/ui';
import { ReleaseHighlights } from '../src/features/app-updates/ReleaseHighlights';
import { releaseHistory } from '../src/features/app-updates/releases';
import { installedVersionCode } from '../src/features/app-updates/version';
import { appUpdates } from '../src/features/app-updates/service';
import { tokens, useTheme } from '../src/theme';
import { formatDate } from '../src/utils/time';

export default function WhatsNew() {
  const { colors } = useTheme();
  useEffect(() => {
    void appUpdates.readWhatsNew();
  }, []);
  const history = releaseHistory(installedVersionCode);
  return (
    <Screen
      bottomSafeArea
      header={<ScreenHeader title="Yeniliklər" onBack={() => router.back()} />}
    >
      {history.length === 0 && (
        <AppText style={{ color: colors.muted }}>
          Bu versiya üçün yenilik mətni hələ əlavə edilməyib.
        </AppText>
      )}
      {history.map((release) => (
        <Card key={release.versionCode}>
          <View style={{ gap: 20 }}>
            <View style={{ gap: 5 }}>
              <View
                style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}
              >
                <AppText variant="heading" style={{ fontFamily: tokens.font.bold }}>
                  {release.version}
                </AppText>
                {release.versionCode === installedVersionCode && (
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
                    Cari versiya
                  </AppText>
                )}
              </View>
              <AppText variant="caption" style={{ color: colors.muted }}>
                {formatDate(release.date).split(',')[0]}
              </AppText>
            </View>
            <ReleaseHighlights release={release} />
          </View>
        </Card>
      ))}
    </Screen>
  );
}
