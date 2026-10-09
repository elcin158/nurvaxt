import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from './ResidentControls';

export type StepIconName = 'account' | 'person' | 'members' | 'building' | 'vehicle' | 'land' | 'animal';

/** Line icons on a 24-unit grid, drawn with the current stroke colour. */
function Shapes({ name }: { name: StepIconName }) {
  switch (name) {
    case 'account': return <><Path d="M3 10.5 12 3l9 7.5" /><Path d="M5 9.2V21h14V9.2" /><Path d="M10 21v-6h4v6" /></>;
    case 'person': return <><Circle cx={12} cy={8} r={4} /><Path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" /></>;
    case 'members': return <><Circle cx={9} cy={8} r={3.5} /><Path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
      <Circle cx={17} cy={9} r={2.8} /><Path d="M17 14c2.7 0 4.5 2 4.5 5" /></>;
    case 'building': return <><Rect x={4} y={3} width={16} height={18} rx={1.5} />
      <Path d="M8 7.5h2M14 7.5h2M8 11.5h2M14 11.5h2M8 15.5h2M14 15.5h2M11 21v-3h2v3" /></>;
    case 'vehicle': return <><Circle cx={7} cy={17} r={3.5} /><Circle cx={18} cy={18} r={2.5} />
      <Path d="M5 9V4.5h4.5L11 9" /><Path d="M3 13.5V9h8.5l1.5 5h5.5a2 2 0 0 1 2 2v2" /><Path d="M10.5 17h5" /></>;
    case 'land': return <><Path d="M3 21h18" /><Path d="M4.5 21 8 14h8l3.5 7M12 14v7" />
      <Path d="M12 11V6" /><Path d="M12 8c0-2 1.6-3.6 3.6-3.6 0 2-1.6 3.6-3.6 3.6ZM12 9.5c0-1.7-1.3-3-3-3 0 1.7 1.3 3 3 3Z" /></>;
    case 'animal': return <><Circle cx={6.5} cy={10} r={1.8} /><Circle cx={10} cy={6.5} r={1.8} /><Circle cx={14} cy={6.5} r={1.8} /><Circle cx={17.5} cy={10} r={1.8} />
      <Path d="M12 12c-3 0-5.5 3-5.5 5.3 0 1.6 1.3 2.3 2.8 2.3 1.1 0 1.8-.6 2.7-.6s1.6.6 2.7.6c1.5 0 2.8-.7 2.8-2.3C17.5 15 15 12 12 12Z" /></>;
  }
}

/**
 * A wizard step's marker: its icon in a circle, filled while active (with Tbu.Web's light ring),
 * pale with a check badge once completed, outlined otherwise.
 */
export function StepMarker({ icon, active, done }: { icon: StepIconName; active: boolean; done: boolean }) {
  const stroke = active ? '#FFF' : done ? colors.primary : '#64748B';
  return <View style={[styles.marker, active && styles.active, !active && done && styles.done]}>
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Shapes name={icon} /></Svg>
    {!active && done && <View style={styles.badge}><View style={styles.check} /></View>}
  </View>;
}

const styles = StyleSheet.create({
  marker: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  active: { backgroundColor: colors.primary, borderColor: 'rgba(57,113,249,0.4)', borderWidth: 3 },
  done: { backgroundColor: colors.pale, borderColor: colors.primary },
  badge: { position: 'absolute', right: -3, bottom: -3, width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: '#FFF', backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  check: { width: 4, height: 7, borderRightWidth: 1.5, borderBottomWidth: 1.5, borderColor: '#FFF', transform: [{ rotate: '45deg' }], marginTop: -1.5 },
});
