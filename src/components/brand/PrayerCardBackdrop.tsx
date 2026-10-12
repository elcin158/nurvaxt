import { useId } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from '../../theme';

/** Bundled artwork keeps the countdown background available offline. */
export function PrayerCardBackdrop() {
  const { dark } = useTheme();
  const id = useId().replace(/:/g, '');
  return (
    <View
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={StyleSheet.absoluteFill}
    >
      <Image
        source={require('../../../assets/prayer-blue-background.jpg')}
        resizeMode="cover"
        style={{ width: '100%', height: '100%' }}
      />
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 360 240"
        preserveAspectRatio="none"
        style={StyleSheet.absoluteFill}
      >
        <Defs>
          <LinearGradient id={`${id}shade`} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#295EE6" stopOpacity={dark ? 0.14 : 0.08} />
            <Stop offset="1" stopColor="#2448BB" stopOpacity={dark ? 0.24 : 0.18} />
          </LinearGradient>
        </Defs>
        <Rect width="360" height="240" fill={`url(#${id}shade)`} />
      </Svg>
    </View>
  );
}
