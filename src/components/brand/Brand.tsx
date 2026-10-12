import { useId } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { AppText } from '../ui';
import { tokens, useTheme } from '../../theme';

/**
 * The supplied artwork, full-bleed: the store icon carries a white frame of its own, which read
 * as a stray margin everywhere the badge sits on a coloured surface. The corners are rounded
 * here instead, so the square stays edge to edge.
 */
export function BrandIcon({ size = 48 }: { size?: number }) {
  return (
    <Image
      source={require('../../../assets/app-icon.png')}
      accessibilityLabel="NurVaxt loqosu"
      style={{ width: size, height: size, borderRadius: size * 0.24 }}
    />
  );
}

export function BrandLockup({
  subtitle,
  compact = false,
}: {
  subtitle?: string;
  compact?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', gap: compact ? 8 : 12, flexShrink: 1 }}
    >
      <BrandIcon size={compact ? 34 : 48} />
      <View style={{ flexShrink: 1, gap: 1 }}>
        <AppText
          style={{
            fontFamily: tokens.font.bold,
            fontSize: compact ? 21 : 24,
            lineHeight: compact ? 30 : 32,
            letterSpacing: -0.8,
          }}
        >
          NurVaxt
        </AppText>
        {subtitle && (
          <AppText variant="caption" style={{ color: colors.muted }}>
            {subtitle}
          </AppText>
        )}
      </View>
    </View>
  );
}

/**
 * The celestial layer is drawn in a fixed 200x220 box pinned to the top-right corner, so the
 * crescent keeps its proportions whatever width the surrounding card ends up with.
 */
const SKY = { width: 200, height: 220 };
const MOON = { x: 138, y: 62, radius: 33 };

/**
 * A hilal is a circle with a second, offset circle cut out of it: both cusps then come out
 * identical and needle-sharp, and the inner edge stays a true arc instead of drifting.
 * `cut` and `offset` are fractions of the outer radius; `tilt` turns the opening up-right.
 */
export function crescentPath(
  cx: number,
  cy: number,
  radius: number,
  { cut = 0.88, offset = 0.36, tilt = -26 } = {},
) {
  const inner = radius * cut;
  const shift = radius * offset;
  const x = (shift * shift + radius * radius - inner * inner) / (2 * shift);
  const y = Math.sqrt(radius * radius - x * x);
  const angle = (tilt * Math.PI) / 180;
  const at = (px: number, py: number) =>
    `${(cx + px * Math.cos(angle) - py * Math.sin(angle)).toFixed(2)} ` +
    `${(cy + px * Math.sin(angle) + py * Math.cos(angle)).toFixed(2)}`;
  const top = at(x, -y);
  // Outer rim the long way round, then the cut-out circle back across the two cusps.
  return `M${top}A${radius} ${radius} 0 1 0 ${at(x, y)}A${inner} ${inner} 0 1 1 ${top}Z`;
}

const MOON_PATH = crescentPath(MOON.x, MOON.y, MOON.radius);

/**
 * The mark as a single-colour glyph, for chrome that tints its icons — the tab bar reads as
 * one family that way. Generated from the artwork's light pixels, so it is the launcher badge's
 * own lettering rather than a stock icon; the letters do not resolve at this size, and the
 * silhouette is carrying recognition on shape alone.
 */
export function BrandGlyph({ size = 18, color }: { size?: number; color?: string }) {
  const { colors } = useTheme();
  return (
    <Image
      source={require('../../../assets/mark-mono.png')}
      accessible={false}
      style={{ width: size, height: size, tintColor: color ?? colors.primary }}
    />
  );
}

/** Lit from the crescent down into the deep navy: orbital lines, haze and the hilal itself. */
export function BrandBackdrop({ celestial = true }: { celestial?: boolean }) {
  const { colors } = useTheme();
  const id = useId().replace(/:/g, '');
  return (
    <View pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" viewBox="0 0 360 320" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={`${id}blue`} x1="1" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.heroStart} />
            <Stop offset="0.46" stopColor={colors.hero} />
            <Stop offset="1" stopColor={colors.heroEnd} />
          </LinearGradient>
          <RadialGradient
            id={`${id}vignette`}
            cx="28"
            cy="320"
            r="360"
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0" stopColor="#030C2A" stopOpacity="0.35" />
            <Stop offset="1" stopColor="#030C2A" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width="360" height="320" fill={`url(#${id}blue)`} />
        <Rect width="360" height="320" fill={`url(#${id}vignette)`} />
      </Svg>
      {celestial && (
        <Svg
          width={SKY.width}
          height={SKY.height}
          viewBox={`0 0 ${SKY.width} ${SKY.height}`}
          style={{ position: 'absolute', right: 0, top: 0 }}
        >
          <Defs>
            <RadialGradient
              id={`${id}bloom`}
              cx={MOON.x}
              cy={MOON.y}
              r="150"
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0" stopColor="#9BE2FF" stopOpacity="0.28" />
              <Stop offset="0.55" stopColor="#6FC8FF" stopOpacity="0.08" />
              <Stop offset="1" stopColor="#6FC8FF" stopOpacity="0" />
            </RadialGradient>
            <RadialGradient
              id={`${id}halo`}
              cx={MOON.x}
              cy={MOON.y}
              r={MOON.radius * 2.1}
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0.45" stopColor="#DFF4FF" stopOpacity="0.3" />
              <Stop offset="0.75" stopColor="#BFE8FF" stopOpacity="0.09" />
              <Stop offset="1" stopColor="#BFE8FF" stopOpacity="0" />
            </RadialGradient>
            {/* The rings leave the box on the lower left, so the stroke fades out before the cut. */}
            <LinearGradient
              id={`${id}ring`}
              x1="200"
              y1="0"
              x2="20"
              y2="210"
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0" stopColor="#CFEEFF" stopOpacity="0.55" />
              <Stop offset="0.55" stopColor="#CFEEFF" stopOpacity="0.16" />
              <Stop offset="1" stopColor="#CFEEFF" stopOpacity="0" />
            </LinearGradient>
            <LinearGradient
              id={`${id}moon`}
              x1={MOON.x - MOON.radius}
              y1={MOON.y - MOON.radius}
              x2={MOON.x + MOON.radius * 0.5}
              y2={MOON.y + MOON.radius}
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0" stopColor="#FFFFFF" />
              <Stop offset="0.55" stopColor="#EFFAFF" />
              <Stop offset="1" stopColor="#A9DCFB" />
            </LinearGradient>
          </Defs>
          <Rect width={SKY.width} height={SKY.height} fill={`url(#${id}bloom)`} />
          <Circle cx={MOON.x} cy={MOON.y} r="60" fill="none" stroke={`url(#${id}ring)`} />
          <Circle
            cx={MOON.x}
            cy={MOON.y}
            r="88"
            fill="none"
            stroke={`url(#${id}ring)`}
            opacity="0.7"
          />
          <Circle
            cx={MOON.x}
            cy={MOON.y}
            r="122"
            fill="none"
            stroke={`url(#${id}ring)`}
            opacity="0.45"
          />
          <Circle cx={MOON.x} cy={MOON.y} r={MOON.radius * 2.1} fill={`url(#${id}halo)`} />
          <Path d={MOON_PATH} fill={`url(#${id}moon)`} />
          {/* Four-point sparkle, parked between the first two rings where no text reaches. */}
          <Path
            d="M92 122L93.1 125.9L97 127L93.1 128.1L92 132L90.9 128.1L87 127L90.9 125.9Z"
            fill="#EAF8FF"
            opacity="0.5"
          />
          <Circle cx="54" cy="38" r="1.6" fill="#DFF4FF" opacity="0.75" />
          <Circle cx="182" cy="128" r="1.8" fill="#DFF4FF" opacity="0.55" />
          <Circle cx="150" cy="186" r="1.2" fill="#DFF4FF" opacity="0.3" />
        </Svg>
      )}
    </View>
  );
}
