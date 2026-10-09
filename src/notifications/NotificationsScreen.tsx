import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Button, colors } from '../components/ResidentControls';
import { Notice } from '../components/Notice';
import { StatusChip } from '../components/StatusChip';
import { openTarget, type NotificationItem, type NotificationPage } from './api';
import { useNotifications } from './context';
import { NotificationCard } from './NotificationBell';

// Tbu.Web's /notifications page: every notification of the user, newest first, 15 to a page, each
// with its state and "Oxudum" while unread. It reads the server, so it works only while online.
const PAGE_SIZE = 15, VISIBLE_PAGES = 5;

function visiblePages(current: number, total: number) {
  const pages = Math.max(1, total);
  let first = Math.max(1, current - Math.floor(VISIBLE_PAGES / 2));
  const last = Math.min(pages, first + VISIBLE_PAGES - 1);
  first = Math.max(1, last - VISIBLE_PAGES + 1);
  return Array.from({ length: last - first + 1 }, (_, i) => first + i);
}

export default function NotificationsScreen() {
  const notifications = useNotifications(), { online } = notifications;
  const [pageNumber, setPageNumber] = useState(1), [page, setPage] = useState<NotificationPage | null>(null);
  const [loading, setLoading] = useState(false), [error, setError] = useState(''), [marking, setMarking] = useState<number | null>(null);
  const read = notifications.page, request = useRef(0), shown = useRef(1);
  // Only the latest request's answer is shown, so a slow page cannot land over a newer one.
  const load = useCallback(async (number: number) => {
    const ticket = ++request.current;
    setLoading(true); setError('');
    try {
      const result = await read(number, PAGE_SIZE);
      if (ticket !== request.current) return;
      setPage(result); setPageNumber(result.pageNumber); shown.current = result.pageNumber;
    } catch (cause) { if (ticket === request.current) setError(cause instanceof Error ? cause.message : 'Bildirişlər yüklənmədi.'); }
    finally { if (ticket === request.current) setLoading(false); }
  }, [read]);
  useEffect(() => {
    if (!online) { request.current++; return; }
    const timer = setTimeout(() => void load(shown.current), 0);
    return () => clearTimeout(timer);
  }, [online, load]);
  async function markSeen(id: number) {
    setMarking(id);
    try {
      const unreadCount = await notifications.markSeen(id);
      setPage(current => current && { ...current, unreadCount, items: current.items.map(x => x.id === id ? { ...x, seen: true } : x) });
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Bildiriş oxunmuş edilmədi.'); }
    finally { setMarking(null); }
  }
  // As on the web list: opening a notification's record marks it read too.
  function open(item: NotificationItem) {
    if (!item.seen) void markSeen(item.id);
    if (item.target) openTarget(item.target);
  }
  const back = () => router.canGoBack() ? router.back() : router.replace('/');
  const unread = page?.unreadCount ?? 0, totalPages = page?.totalPages ?? 0;
  return <SafeAreaView style={styles.safe}><StatusBar style="dark" />
    <View style={styles.header}><View style={{ flex: 1, gap: 4, alignItems: 'flex-start' }}><Text style={styles.headerTitle}>Bildirişlər</Text>
      {online && !!page && <StatusChip label={unread ? `${unread} oxunmamış` : 'Oxunmamış bildiriş yoxdur'} tone={unread ? 'info' : 'neutral'} />}</View>
      <Button secondary small label="✕  Bağla" onPress={back} /></View>
    <ScrollView contentContainerStyle={styles.page}>
      {!online ? <Notice compact tone="warning" text="Bildirişlər yalnız internet olanda görünür. İnternetə qoşulun." /> : <>
        {!!error && <Notice tone="danger" title="Bildirişlər yüklənmədi" text={error} onClose={() => setError('')} />}
        {!page ? loading && <ActivityIndicator style={{ margin: 40 }} color={colors.primary} />
          : !page.items.length ? <View style={styles.empty}><Text style={styles.emptyText}>Bildiriş yoxdur</Text></View>
          : <View style={[styles.card, loading && { opacity: 0.6 }]}>{page.items.map((item, index) =>
            <NotificationCard key={item.id} item={item} lines={0} last={index === page.items.length - 1} onPress={item.target ? () => open(item) : undefined}>
              <StatusChip label={item.seen ? 'Oxunub' : 'Yeni'} tone={item.seen ? 'neutral' : 'info'} />
              {!item.seen && <Button small secondary compact label={marking === item.id ? 'Gözləyin…' : 'Oxudum'} disabled={marking !== null} onPress={() => void markSeen(item.id)} />}
            </NotificationCard>)}</View>}
        {totalPages > 1 && <View accessibilityLabel="Səhifələmə" style={styles.pagination}>
          <PageButton label="‹" hint="Əvvəlki səhifə" disabled={loading || pageNumber <= 1} onPress={() => void load(pageNumber - 1)} />
          {visiblePages(pageNumber, totalPages).map(number => <PageButton key={number} label={String(number)} active={number === pageNumber}
            disabled={loading} onPress={() => void load(number)} />)}
          <PageButton label="›" hint="Növbəti səhifə" disabled={loading || pageNumber >= totalPages} onPress={() => void load(pageNumber + 1)} />
        </View>}
      </>}
    </ScrollView>
  </SafeAreaView>;
}

function PageButton({ label, hint, active, disabled, onPress }: { label: string; hint?: string; active?: boolean; disabled?: boolean; onPress(): void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={hint ?? `${label}. səhifə`} accessibilityState={{ selected: active, disabled }}
    disabled={disabled || active} onPress={onPress} style={[styles.pageItem, active && styles.pageActive, disabled && !active && { opacity: 0.4 }]}>
    <Text style={[styles.pageText, active && { color: '#FFF' }]}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { minHeight: 72, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: colors.line, paddingHorizontal: 20, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { color: colors.text, fontSize: 17, fontWeight: '600', lineHeight: 24 },
  page: { padding: 16, gap: 14, width: '100%', maxWidth: 720, alignSelf: 'center' },
  card: { backgroundColor: '#FFF', borderRadius: 8, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  empty: { backgroundColor: '#FFF', borderRadius: 8, borderWidth: 1, borderColor: colors.line, padding: 40, alignItems: 'center' }, emptyText: { color: colors.muted, fontSize: 14 },
  pagination: { flexDirection: 'row', justifyContent: 'center', gap: 6, flexWrap: 'wrap' },
  pageItem: { minWidth: 40, height: 40, borderRadius: 6, borderWidth: 1, borderColor: colors.line, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  pageActive: { backgroundColor: colors.primary, borderColor: colors.primary }, pageText: { color: colors.text, fontSize: 14, fontWeight: '500' },
});
