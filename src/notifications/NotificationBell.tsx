import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../components/ResidentControls';
import { openTarget, type NotificationItem } from './api';
import { useNotifications } from './context';

// Tbu.Web's header bell (notification-dropdown.js): the unread count on the bell, and a panel with
// the newest few that loads when it opens. Tapping a card marks it read. Shown only while online.
const LATEST = 5;
const countText = (value: number) => value > 99 ? '99+' : String(value);

export function BellIcon({ color, size = 22 }: { color: string; size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15l1.5-2Z" /><Path d="M10 20.5a2 2 0 0 0 4 0" /></Svg>;
}

export function NotificationBell() {
  const notifications = useNotifications(), insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false), [state, setState] = useState<'loading' | 'error' | 'ready'>('loading');
  const [items, setItems] = useState<NotificationItem[]>([]), [total, setTotal] = useState(0);
  if (!notifications.online) return null;
  const unread = notifications.unread ?? 0;
  async function load() {
    setState('loading');
    try {
      const page = await notifications.page(1, LATEST);
      setItems(page.items); setTotal(page.totalCount); setState('ready');
    } catch { setState('error'); }
  }
  function show() { setOpen(true); void load(); }
  // Marked in the panel first so the tap feels immediate; a failure puts the row back.
  // A notification about a record then opens that record's review, as the web card opens its page.
  function read(item: NotificationItem) {
    if (!item.seen) {
      const mark = (seen: boolean) => setItems(current => current.map(x => x.id === item.id ? { ...x, seen } : x));
      mark(true);
      notifications.markSeen(item.id).catch(() => mark(false));
    }
    if (item.target) { setOpen(false); openTarget(item.target); }
  }
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={unread ? `Bildirişlər, ${unread} oxunmamış` : 'Bildirişlər'} accessibilityState={{ expanded: open }}
      onPress={show} style={[styles.trigger, open && styles.triggerOpen]}>
      <BellIcon color="#FFF" />
      {unread > 0 && <Text style={styles.count}>{countText(unread)}</Text>}
    </Pressable>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <Pressable accessibilityLabel="Bildirişləri bağla" style={styles.backdrop} onPress={() => setOpen(false)}>
        <Pressable accessibilityViewIsModal style={[styles.panel, { top: insets.top + 52 }]} onPress={() => {}}>
          <View style={styles.header}><Text style={styles.title}>Bildirişlər</Text>
            {unread > 0 && <Text style={styles.badge}>{countText(unread)}</Text>}</View>
          <ScrollView style={styles.body}>
            {state === 'loading' ? <View style={styles.state}><ActivityIndicator color={colors.primary} /></View>
              : state === 'error' ? <View style={styles.state} accessibilityRole="alert"><Text style={styles.stateText}>Bildirişlər yüklənmədi</Text>
                <Pressable accessibilityRole="button" onPress={() => void load()} style={styles.retry}><Text style={styles.link}>Yenidən cəhd et</Text></Pressable></View>
              : !items.length ? <View style={styles.state}><BellIcon color="#94A3B8" size={26} /><Text style={styles.stateText}>Yeni bildiriş yoxdur</Text></View>
              : items.map((item, index) => <NotificationCard key={item.id} item={item} last={index === items.length - 1} onPress={() => read(item)} />)}
          </ScrollView>
          <Pressable accessibilityRole="link" onPress={() => { setOpen(false); router.push('/notifications'); }} style={styles.footer}>
            <Text style={styles.link}>Bütün bildirişlər{total > 0 ? ` (${total})` : ''}</Text></Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  </>;
}

/** A notification as the web panel draws it: the unread dot, two lines of text and the date. */
export function NotificationCard({ item, last, onPress, lines = 2, children }: { item: NotificationItem; last?: boolean; onPress?(): void; lines?: number; children?: ReactNode }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`${item.seen ? '' : 'Oxunmamış: '}${item.content}`} accessibilityHint={item.target ? 'Aid olduğu qeydə baxış açılır' : undefined} onPress={onPress}
    style={({ pressed }) => [styles.item, !item.seen && styles.unread, pressed && (item.seen ? styles.pressed : styles.unreadPressed), last && { borderBottomWidth: 0 }]}>
    <View style={[styles.dot, item.seen && { backgroundColor: 'transparent' }]} />
    <View style={{ flex: 1, gap: 2 }}>
      <Text numberOfLines={lines} style={styles.text}>{item.content}</Text>
      <View style={styles.meta}><Text style={styles.time}>{item.createDate}</Text>{children}{!!item.target && <Text style={styles.link}>Baxış</Text>}</View>
    </View>
  </Pressable>;
}

const styles = StyleSheet.create({
  trigger: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }, triggerOpen: { backgroundColor: 'rgba(255,255,255,0.18)' },
  count: { position: 'absolute', top: 6, right: 4, minWidth: 16, height: 16, paddingHorizontal: 3, borderRadius: 8, backgroundColor: '#EF4444', color: '#FFF',
    fontSize: 10, fontWeight: '600', lineHeight: 16, textAlign: 'center', overflow: 'hidden' },
  backdrop: { flex: 1, backgroundColor: '#0F172A33' },
  panel: { position: 'absolute', right: 12, width: 380, maxWidth: '94%', maxHeight: 480, backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: colors.line, overflow: 'hidden',
    shadowColor: '#0F172A', shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.line },
  title: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '600', lineHeight: 20 },
  badge: { minWidth: 20, height: 20, paddingHorizontal: 6, borderRadius: 10, backgroundColor: '#EF4444', color: '#FFF', fontSize: 11, fontWeight: '600', lineHeight: 20, textAlign: 'center', overflow: 'hidden' },
  body: { flexGrow: 0, flexShrink: 1, minHeight: 96 },
  state: { minHeight: 140, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 }, stateText: { color: colors.muted, fontSize: 13 },
  retry: { minHeight: 40, paddingHorizontal: 16, justifyContent: 'center', borderRadius: 999, borderWidth: 1, borderColor: colors.border },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  unread: { backgroundColor: '#E5F1FF' }, pressed: { backgroundColor: '#F8FAFC' }, unreadPressed: { backgroundColor: '#D9EAFF' },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 5, backgroundColor: colors.primary },
  text: { color: colors.text, fontSize: 13, lineHeight: 18 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 16 }, time: { flex: 1, color: colors.muted, fontSize: 12, lineHeight: 16 },
  footer: { minHeight: 46, alignItems: 'center', justifyContent: 'center', borderTopWidth: 1, borderTopColor: colors.line },
  link: { color: colors.primary, fontSize: 13, fontWeight: '500' },
});
