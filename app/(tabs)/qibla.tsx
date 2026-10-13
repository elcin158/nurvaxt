import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, useWindowDimensions, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Screen } from '../../src/components/layout/Screen';
import { AppText, Button, Card, Chip, ChoiceGroup, Icon } from '../../src/components/ui';
import { BrandIcon } from '../../src/components/brand/Brand';
import { CityButton } from '../../src/features/locations/CityButton';
import { QiblaDial } from '../../src/features/qibla/QiblaDial';
import { useCompassHeading } from '../../src/features/qibla/useCompassHeading';
import { usePreciseOrigin } from '../../src/features/qibla/usePreciseOrigin';
import {
  bearingDelta,
  compassPoint,
  distanceToKaaba,
  locationCoordinates,
  qiblaBearing,
} from '../../src/features/qibla/domain';
import { locationName } from '../../src/features/locations/locations';
import { usePreferences } from '../../src/store/preferences';
import { tokens, useTheme } from '../../src/theme';
/** How close the phone has to point before the dial calls it the Qibla. */
const TOLERANCE = 3;
const PRECISE_NOTE: Record<string, string> = {
  locating: 'Təxmini məkan alınır…',
  denied: 'Məkan icazəsi verilmədi; istiqamət şəhər mərkəzinə görə göstərilir.',
  blocked: 'Məkan icazəsi bağlıdır. Sistem ayarlarından icazə verin.',
  disabled: 'Cihazın məkan xidməti sönülüdür. Onu açıb yenidən cəhd edin.',
  unavailable: 'Məkan oxuna bilmədi; istiqamət şəhər mərkəzinə görə göstərilir.',
};
export default function Qibla() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const city = usePreferences((s) => s.locationId);
  const source = usePreferences((s) => s.qiblaSource);
  const setPreference = usePreferences((s) => s.set);
  const centre = locationCoordinates(city);
  const [focused, setFocused] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  const precise = usePreciseOrigin(focused && source === 'device');
  const point = (source === 'device' ? precise.coordinates : null) ?? centre;
  const { heading, rotation, status } = useCompassHeading(focused && point !== null);
  const bearing = point ? qiblaBearing(point) : 0;
  const delta = heading === null ? null : bearingDelta(heading, bearing);
  const aligned = delta !== null && Math.abs(delta) <= TOLERANCE;
  const wasAligned = useRef(false);
  useEffect(() => {
    if (aligned && !wasAligned.current) void Haptics.selectionAsync().catch(() => {});
    wasAligned.current = aligned;
  }, [aligned]);
  const size = Math.min(width - 72, 300);
  return (
    <Screen>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <View style={{ flex: 1 }}>
          <AppText variant="title">Qiblə</AppText>
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            maxWidth: '65%',
            flexShrink: 1,
          }}
        >
          <CityButton compact />
          <BrandIcon size={44} />
        </View>
      </View>
      <ChoiceGroup>
        <Chip
          segment
          title="Şəhər mərkəzi"
          selected={source === 'city'}
          onPress={() => setPreference({ qiblaSource: 'city' })}
        />
        <Chip
          segment
          title="Dəqiq yer"
          selected={source === 'device'}
          onPress={() => setPreference({ qiblaSource: 'device' })}
        />
      </ChoiceGroup>
      {point ? (
        <>
          <View style={{ alignItems: 'center', gap: 20 }}>
            <View style={{ width: size, height: size, alignItems: 'center' }}>
              <QiblaDial size={size} rotation={rotation} bearing={bearing} aligned={aligned} />
              <View
                // Not a live region: the reading changes ten times a second and would flood
                // a screen reader. The label is read when the dial takes focus.
                accessible
                accessibilityLabel={
                  delta === null
                    ? `Qiblə şimaldan ${Math.round(bearing)} dərəcə, ${compassPoint(bearing)} istiqamətində.`
                    : aligned
                      ? 'Telefon qiblə istiqamətindədir.'
                      : `Qibləyə çatmaq üçün ${Math.abs(Math.round(delta))} dərəcə ${delta > 0 ? 'sağa' : 'sola'} dönün.`
                }
                style={{
                  position: 'absolute',
                  width: size,
                  height: size,
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2,
                }}
              >
                {delta === null ? (
                  <>
                    <AppText
                      variant="number"
                      style={{ fontSize: 40, lineHeight: 52, color: '#FFFFFF' }}
                    >
                      {Math.round(bearing)}°
                    </AppText>
                    <AppText variant="caption" style={{ color: colors.heroMuted }}>
                      şimaldan
                    </AppText>
                  </>
                ) : aligned ? (
                  <>
                    <Icon name="checkmark-circle" size={30} color={colors.accent} />
                    <AppText
                      style={{
                        fontFamily: tokens.font.bold,
                        fontSize: 20,
                        lineHeight: 30,
                        color: '#FFFFFF',
                      }}
                    >
                      Qiblə
                    </AppText>
                  </>
                ) : (
                  <>
                    <AppText
                      variant="number"
                      style={{ fontSize: 36, lineHeight: 48, color: '#FFFFFF' }}
                    >
                      {Math.abs(Math.round(delta))}°
                    </AppText>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Icon
                        name={delta > 0 ? 'arrow-forward' : 'arrow-back'}
                        size={16}
                        color={colors.heroMuted}
                      />
                      <AppText variant="caption" style={{ color: colors.heroMuted }}>
                        {delta > 0 ? 'sağa dönün' : 'sola dönün'}
                      </AppText>
                    </View>
                  </>
                )}
              </View>
            </View>
          </View>
          <Card style={{ gap: 14 }}>
            <Detail
              label="Mənbə"
              value={
                precise.coordinates && source === 'device'
                  ? 'Təxmini məkan'
                  : `${locationName(city)} (şəhər mərkəzi)`
              }
            />
            <Detail label="İstiqamət" value={`${bearing.toFixed(1)}° — ${compassPoint(bearing)}`} />
            <Detail label="Kəbəyə məsafə" value={`${Math.round(distanceToKaaba(point))} km`} />
          </Card>
          {source === 'device' && precise.status !== 'ready' && PRECISE_NOTE[precise.status] && (
            <View style={{ gap: 12 }}>
              <AppText variant="caption" style={{ color: colors.muted, textAlign: 'center' }}>
                {PRECISE_NOTE[precise.status]}
              </AppText>
              {precise.status === 'blocked' && (
                <Button
                  title="Ayarları aç"
                  secondary
                  onPress={() => void Linking.openSettings().catch(() => {})}
                />
              )}
              {(precise.status === 'disabled' ||
                precise.status === 'denied' ||
                precise.status === 'unavailable') && (
                <Button title="Yenidən cəhd et" secondary onPress={precise.retry} />
              )}
            </View>
          )}
          <View style={{ gap: 8, alignItems: 'center' }}>
            <Icon
              name={status === 'unavailable' ? 'alert-circle-outline' : 'phone-portrait-outline'}
              size={18}
              color={colors.secondary}
            />
            <AppText variant="caption" style={{ color: colors.muted, textAlign: 'center' }}>
              {status === 'unavailable'
                ? 'Cihazda maqnit sensoru yoxdur. Göstərilən bucağı öz kompasınızda tapın.'
                : 'Telefonu düz tutun və metal əşyalardan aralı dayanın. Sensor səhv göstərirsə, telefonu havada səkkiz rəqəmi kimi hərəkət etdirin.'}
            </AppText>
            <AppText variant="caption" style={{ color: colors.muted, textAlign: 'center' }}>
              Bucaq həqiqi şimaldan, Kəbəyə böyük dairə boyunca hesablanır.
            </AppText>
          </View>
        </>
      ) : (
        <Card>
          <View style={{ gap: 12, alignItems: 'center', paddingVertical: 16 }}>
            <Icon name="compass-outline" size={32} />
            <AppText variant="heading">Bu şəhər üçün koordinat yoxdur</AppText>
            <AppText style={{ color: colors.muted, textAlign: 'center', lineHeight: 24 }}>
              Qiblə bucağını hesablamaq üçün siyahıdan şəhər seçin.
            </AppText>
          </View>
        </Card>
      )}
    </Screen>
  );
}
function Detail({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
      }}
    >
      <AppText style={{ color: colors.muted }}>{label}</AppText>
      <AppText style={{ fontFamily: tokens.font.semibold }}>{value}</AppText>
    </View>
  );
}
