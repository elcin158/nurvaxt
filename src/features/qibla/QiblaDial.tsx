import { memo, useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { Circle, Defs, G, Line, Path, RadialGradient, Stop, Svg } from 'react-native-svg';
import { crescentPath } from '../../components/brand/Brand';
import { AppText } from '../../components/ui';
import { tokens, useTheme } from '../../theme';
const BOX = 260;
const CENTRE = BOX / 2;
const RING = 124;
const LABEL_RADIUS = RING - 36;
const MARK_RADIUS = RING - 30;
const MARK_BOX = 44;
/** Point on the dial at `degrees` clockwise from the top, `radius` out from the centre. */
const at = (degrees: number, radius: number) => {
  const angle = ((degrees - 90) * Math.PI) / 180;
  return { x: CENTRE + Math.cos(angle) * radius, y: CENTRE + Math.sin(angle) * radius };
};
const TICKS = Array.from({ length: 72 }, (_, index) => index * 5);
const LETTERS: [string, number][] = [
  ['N', 0],
  ['E', 90],
  ['S', 180],
  ['W', 270],
];
const CENTRED = { alignItems: 'center', justifyContent: 'center' } as const;
/**
 * Everything that turns is a layer transformed on the UI thread, so a moving phone never
 * re-renders the ~80 dial elements. Labels and the crescent turn back by the same angle to
 * stay upright; the first rotation carries them round the dial, the second levels the glyph.
 */
function orbit(rotation: SharedValue<number>, angle: number, radius: number) {
  'worklet';
  return {
    transform: [
      { rotate: `${angle - rotation.value}deg` },
      { translateY: -radius },
      { rotate: `${rotation.value - angle}deg` },
    ],
  };
}
function RoseLabel({
  letter,
  angle,
  rotation,
  radius,
}: {
  letter: string;
  angle: number;
  rotation: SharedValue<number>;
  radius: number;
}) {
  const { colors } = useTheme();
  const style = useAnimatedStyle(() => orbit(rotation, angle, radius));
  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, CENTRED, style]}
      accessible={false}
    >
      <AppText
        style={{
          fontFamily: tokens.font.bold,
          fontSize: 14,
          lineHeight: 20,
          color: letter === 'N' ? '#FFFFFF' : colors.heroMuted,
        }}
      >
        {letter}
      </AppText>
    </Animated.View>
  );
}
export const QiblaDial = memo(function QiblaDial({
  size,
  rotation,
  bearing,
  aligned,
}: {
  size: number;
  /** Unwrapped true-north heading; rests at 0 (north up) until the compass reports. */
  rotation: SharedValue<number>;
  bearing: number;
  aligned: boolean;
}) {
  const { colors } = useTheme();
  const id = useId().replace(/:/g, '');
  const scale = size / BOX;
  const highlight = aligned ? colors.accent : colors.heroMuted;
  const wedge = { start: at(bearing - 7, RING - 14), end: at(bearing + 7, RING - 14) };
  const roseStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-rotation.value}deg` }],
  }));
  const markStyle = useAnimatedStyle(() => orbit(rotation, bearing, MARK_RADIUS * scale));
  return (
    <View style={{ width: size, height: size }} pointerEvents="none" accessible={false}>
      <Svg width={size} height={size} viewBox={`0 0 ${BOX} ${BOX}`}>
        <Defs>
          <RadialGradient id={`${id}disc`} cx="0.35" cy="0.25" r="0.9">
            <Stop offset="0" stopColor="#1B55C8" />
            <Stop offset="0.6" stopColor="#0E3795" />
            <Stop offset="1" stopColor="#081F78" />
          </RadialGradient>
        </Defs>
        <Circle cx={CENTRE} cy={CENTRE} r={RING + 3} fill="#FFFFFF12" />
        <Circle cx={CENTRE} cy={CENTRE} r={RING} fill={`url(#${id}disc)`} stroke="#FFFFFF2E" />
        <Circle cx={CENTRE} cy={CENTRE} r={RING - 52} fill="none" stroke="#FFFFFF14" />
      </Svg>
      <Animated.View style={[StyleSheet.absoluteFill, roseStyle]}>
        <Svg width={size} height={size} viewBox={`0 0 ${BOX} ${BOX}`}>
          <Defs>
            <RadialGradient
              id={`${id}beam`}
              cx={CENTRE}
              cy={CENTRE}
              r={RING}
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0" stopColor={highlight} stopOpacity="0" />
              <Stop offset="1" stopColor={highlight} stopOpacity={aligned ? 0.38 : 0.18} />
            </RadialGradient>
          </Defs>
          <Path
            d={`M${CENTRE} ${CENTRE}L${wedge.start.x.toFixed(1)} ${wedge.start.y.toFixed(1)}A${RING - 14} ${RING - 14} 0 0 1 ${wedge.end.x.toFixed(1)} ${wedge.end.y.toFixed(1)}Z`}
            fill={`url(#${id}beam)`}
          />
          <G>
            {TICKS.map((angle) => {
              const major = angle % 90 === 0;
              const mid = angle % 30 === 0;
              const outer = at(angle, RING - 10);
              const inner = at(angle, RING - 10 - (major ? 15 : mid ? 11 : 6));
              return (
                <Line
                  key={angle}
                  x1={outer.x}
                  y1={outer.y}
                  x2={inner.x}
                  y2={inner.y}
                  strokeWidth={major ? 2 : 1}
                  strokeLinecap="round"
                  stroke={major ? '#FFFFFF8A' : mid ? '#FFFFFF4D' : '#FFFFFF24'}
                />
              );
            })}
          </G>
        </Svg>
      </Animated.View>
      {LETTERS.map(([letter, angle]) => (
        <RoseLabel
          key={letter}
          letter={letter}
          angle={angle}
          rotation={rotation}
          radius={LABEL_RADIUS * scale}
        />
      ))}
      <Animated.View style={[StyleSheet.absoluteFill, CENTRED, markStyle]}>
        <Svg
          width={MARK_BOX * scale}
          height={MARK_BOX * scale}
          viewBox={`0 0 ${MARK_BOX} ${MARK_BOX}`}
        >
          <Circle
            cx={MARK_BOX / 2}
            cy={MARK_BOX / 2}
            r="20"
            fill={aligned ? `${colors.accent}2E` : '#FFFFFF14'}
            stroke={aligned ? `${colors.accent}66` : '#FFFFFF24'}
          />
          <Path d={crescentPath(MARK_BOX / 2, MARK_BOX / 2, 12)} fill={highlight} />
        </Svg>
      </Animated.View>
      <Svg width={size} height={size} viewBox={`0 0 ${BOX} ${BOX}`} style={StyleSheet.absoluteFill}>
        {/* Fixed index at the top: the direction the phone itself is pointing. */}
        <Path
          d={`M${CENTRE} ${CENTRE - RING + 4}l7.5 -12h-15Z`}
          fill={aligned ? colors.accent : '#FFFFFF'}
        />
      </Svg>
    </View>
  );
});
