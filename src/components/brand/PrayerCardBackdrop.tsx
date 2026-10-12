import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from '../../theme';

/** The approved blue field stays sharp at every card size, without raster artwork. */
export function PrayerCardBackdrop() {
  const { dark } = useTheme();
  const id = useId().replace(/:/g, '');
  return (
    <View
      pointerEvents="none"
      accessible={false}
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={StyleSheet.absoluteFill}
    >
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 360 240"
        preserveAspectRatio="none"
        style={StyleSheet.absoluteFill}
      >
        <Defs>
          <LinearGradient id={`${id}blue`} x1="0" y1="1" x2="1" y2="0">
            <Stop offset="0" stopColor="#12338C" />
            <Stop offset="0.42" stopColor="#1450C1" />
            <Stop offset="0.72" stopColor="#1474D1" />
            <Stop offset="1" stopColor="#2298D4" />
          </LinearGradient>
          <LinearGradient id={`${id}shade`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#092B70" stopOpacity="0" />
            <Stop offset="1" stopColor="#092B70" stopOpacity={dark ? 0.1 : 0.04} />
          </LinearGradient>
        </Defs>
        <Rect width="360" height="240" fill={`url(#${id}blue)`} />
        <Rect width="360" height="240" fill={`url(#${id}shade)`} />
      </Svg>
    </View>
  );
}
