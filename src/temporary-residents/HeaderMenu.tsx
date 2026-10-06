import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '../../App';
import { Button, colors } from '../components/ResidentControls';
import { useResidents } from './context';

/** The header's account menu: who is signed in, connection, reference data and session actions. */
export function HeaderMenu() {
  const auth = useAuth(), residents = useResidents(), insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const user = auth.session?.user, online = residents.online;
  const go = (action: () => void) => { setOpen(false); action(); };
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel="Hesab menyusu" accessibilityState={{ expanded: open }} onPress={() => setOpen(true)} style={styles.trigger}>
      <View style={[styles.dot, { backgroundColor: online ? '#4ADE80' : '#FDBA74' }]} />
      <Text numberOfLines={1} style={styles.triggerText}>{user?.displayName}</Text><Text style={styles.triggerText}>⌄</Text>
    </Pressable>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <Pressable accessibilityLabel="Menyunu bağla" style={styles.backdrop} onPress={() => setOpen(false)}>
        <Pressable style={[styles.panel, { top: insets.top + 52 }]} onPress={() => {}}>
          <Text style={styles.name}>{user?.displayName}</Text>
          {!!user?.executiveName && <Text style={styles.muted}>{user.executiveName}</Text>}
          <View style={styles.status}><View style={[styles.dot, { backgroundColor: online ? '#15803D' : '#C2410C' }]} />
            <Text style={styles.muted}>{online ? 'Onlayn' : 'Oflayn'} · Məlumatlar bu cihazda saxlanılır</Text></View>
          <View style={styles.divider} />
          <Text style={styles.label}>Arayışlar</Text>
          <Text style={styles.muted}>{residents.catalog ? `Son yeniləmə: ${new Date(residents.catalog.downloadedAt).toLocaleString('az-AZ')}` : 'Hələ yüklənməyib'}</Text>
          <Button small secondary label={residents.refreshing ? 'Yüklənir…' : 'Arayışları yenilə'}
            disabled={!residents.store || !online || residents.refreshing || residents.syncing} onPress={() => void residents.refreshCatalog()} />
          {!online && <Text style={styles.muted}>Yeniləmək üçün internetə qoşulun.</Text>}
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
  trigger: { flexShrink: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8 }, triggerText: { color: '#FFF', fontSize: 13, flexShrink: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  backdrop: { flex: 1, backgroundColor: '#0F172A33' },
  panel: { position: 'absolute', right: 12, width: 320, maxWidth: '94%', backgroundColor: '#FFF', borderRadius: 12, padding: 16, gap: 8,
    shadowColor: '#0F172A', shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  name: { color: colors.text, fontSize: 15, fontWeight: '600' }, muted: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }, label: { color: colors.text, fontSize: 13, fontWeight: '600' },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: 6 },
  item: { minHeight: 44, justifyContent: 'center' }, itemText: { color: colors.text, fontSize: 14, fontWeight: '500' },
});
