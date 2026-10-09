import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '../../App';
import { useReference } from '../reference/context';
import { Chevron, colors } from './ResidentControls';
import { referenceSummary } from './ReferenceStatus';

/** The header's account menu: who is signed in, connection, the shared reference data's state and session actions. */
export function HeaderMenu() {
  const auth = useAuth(), insets = useSafeAreaInsets(), reference = useReference();
  const [open, setOpen] = useState(false);
  const user = auth.session?.user, online = reference.online, summary = referenceSummary(reference);
  const initial = user?.displayName?.trim().charAt(0).toLocaleUpperCase('az-AZ') ?? '';
  const go = (action: () => void) => { setOpen(false); action(); };
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel="Hesab menyusu" accessibilityState={{ expanded: open }} onPress={() => setOpen(true)} style={styles.trigger}>
      {/* Tbu.Web's .profile-menu: the initial in a pale circle, the name and an arrow; the dot on the circle is the connection. */}
      <View style={styles.avatar}><Text style={styles.avatarText}>{initial}</Text>
        <View style={[styles.dot, styles.avatarDot, { backgroundColor: online ? '#4ADE80' : '#FDBA74' }]} /></View>
      <Text numberOfLines={1} style={styles.triggerText}>{user?.displayName}</Text><Chevron up={open} color="#FFF" />
    </Pressable>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <Pressable accessibilityLabel="Menyunu bağla" style={styles.backdrop} onPress={() => setOpen(false)}>
        <Pressable style={[styles.panel, { top: insets.top + 52 }]} onPress={() => {}}>
          <Text style={styles.name}>{user?.displayName}</Text>
          {!!user?.executiveName && <Text style={styles.muted}>{user.executiveName}</Text>}
          <View style={styles.status}><View style={[styles.dot, { backgroundColor: online ? '#15803D' : '#C2410C' }]} />
            <Text style={styles.muted}>{online ? 'Onlayn' : 'Oflayn'} · Məlumatlar bu cihazda saxlanılır</Text></View>
          <View style={styles.divider} />
          <Pressable accessibilityRole="menuitem" accessibilityLabel={`Arayışlar: ${summary.text}`} onPress={() => go(() => router.push('/reference'))} style={styles.reference}>
            <View style={{ flex: 1 }}><Text style={styles.itemText}>Arayışlar</Text>
              <Text style={[styles.muted, summary.tone === 'warning' && { color: '#C2410C' }, summary.tone === 'busy' && { color: colors.primary }]}>{summary.text}</Text></View>
            <Text style={styles.chevron}>›</Text></Pressable>
          <View style={styles.divider} />
          <Pressable accessibilityRole="menuitem" onPress={() => go(() => router.push('/profile'))} style={styles.item}><Text style={styles.itemText}>Profil və giriş ayarları</Text></Pressable>
          <Pressable accessibilityRole="menuitem" onPress={() => go(auth.lock)} style={styles.item}><Text style={styles.itemText}>Tətbiqi kilidlə</Text></Pressable>
          <Pressable accessibilityRole="menuitem" onPress={() => go(() => void auth.logout())} style={styles.item}><Text style={[styles.itemText, { color: '#B91C1C' }]}>Hesabdan çıx</Text></Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  </>;
}
const styles = StyleSheet.create({
  trigger: { flexShrink: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 4 }, triggerText: { color: '#FFF', fontSize: 14, fontWeight: '500', flexShrink: 1 },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#D0E2FF', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.primary, fontSize: 14, fontWeight: '500' }, avatarDot: { position: 'absolute', right: -1, bottom: -1, width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: colors.primary },
  dot: { width: 8, height: 8, borderRadius: 4 },
  backdrop: { flex: 1, backgroundColor: '#0F172A33' },
  panel: { position: 'absolute', right: 12, width: 320, maxWidth: '94%', backgroundColor: '#FFF', borderRadius: 12, padding: 16, gap: 8,
    shadowColor: '#0F172A', shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  name: { color: colors.text, fontSize: 15, fontWeight: '600' }, muted: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }, label: { color: colors.text, fontSize: 13, fontWeight: '600' },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: 6 },
  reference: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 8 }, chevron: { color: colors.muted, fontSize: 22 },
  item: { minHeight: 44, justifyContent: 'center' }, itemText: { color: colors.text, fontSize: 14, fontWeight: '500' },
});
