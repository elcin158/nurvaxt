import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, colors, ui } from './ResidentControls';

/** An item decides itself whether the sheet closes, so it can open a follow-up dialog. */
export type SheetItem = { label: string; onPress(): void; danger?: boolean; disabled?: boolean; hint?: string };
/** The mobile form of Tbu.Web's row context menu. */
export function ActionSheet({ title, subtitle, items, loading, error, onClose }: {
  title: string; subtitle?: string; items: SheetItem[]; loading?: boolean; error?: string; onClose(): void;
}) {
  const insets = useSafeAreaInsets();
  // The backdrop fades in and the sheet slides up from the bottom edge, clear of the home indicator / gesture bar.
  return <Modal visible transparent statusBarTranslucent navigationBarTranslucent animationType="none" onRequestClose={onClose}>
    <Animated.View entering={FadeIn.duration(180)} style={styles.backdrop}>
      <Pressable accessibilityLabel="Menyunu bağla" style={StyleSheet.absoluteFill} onPress={onClose} />
      <Animated.View entering={SlideInDown.duration(220)} style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
        <Text style={styles.title}>{title}</Text>{!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        {loading ? <ActivityIndicator style={{ margin: 24 }} color={colors.primary} />
          : <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 6 }}>
            {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
            {items.map(item => <Pressable key={item.label} accessibilityRole="menuitem" accessibilityState={{ disabled: item.disabled }} disabled={item.disabled}
              onPress={item.onPress} style={({ pressed }) => [styles.item, (pressed || item.disabled) && { opacity: 0.5 }]}>
              <Text style={[styles.itemText, item.danger && { color: '#B91C1C' }]}>{item.label}</Text>
              {!!item.hint && <Text style={styles.hint}>{item.hint}</Text>}
            </Pressable>)}
            {!items.length && !error && <Text style={styles.hint}>Bu qeyd üzrə əməliyyat yoxdur.</Text>}
          </ScrollView>}
        <Button secondary label="Bağla" onPress={onClose} />
      </Animated.View>
    </Animated.View>
  </Modal>;
}
/** Confirmation in the wording of Tbu.Web's workflow dialog, optionally asking for a reason. */
export function ConfirmDialog({ title, text, confirmLabel, danger, descriptionRequired, busy, error, onConfirm, onCancel }: {
  title: string; text?: string; confirmLabel: string; danger?: boolean; descriptionRequired?: boolean; busy?: boolean; error?: string;
  onConfirm(description: string): void; onCancel(): void;
}) {
  const [description, setDescription] = useState('');
  return <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
    <View style={styles.center}><View style={styles.dialog}>
      <Text style={styles.title}>{title}</Text>{!!text && <Text style={styles.subtitle}>{text}</Text>}
      {descriptionRequired && <TextInput accessibilityLabel="Səbəb" placeholder="Səbəbi yazın" placeholderTextColor={colors.muted} multiline maxLength={2000}
        value={description} onChangeText={setDescription} style={[ui.input, { minHeight: 96, textAlignVertical: 'top' }]} />}
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      <View style={styles.actions}><Button secondary label="Ləğv et" disabled={busy} onPress={onCancel} />
        <Button label={busy ? 'Gözləyin…' : confirmLabel} disabled={busy || descriptionRequired && !description.trim()} onPress={() => onConfirm(description)} /></View>
      {danger && <Text style={styles.hint}>Bu əməliyyat geri qaytarıla bilməz.</Text>}
    </View></View>
  </Modal>;
}
const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#0F172A66', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FFF', borderTopLeftRadius: 14, borderTopRightRadius: 14, padding: 20, gap: 6, width: '100%', maxWidth: 560, maxHeight: '85%', alignSelf: 'center' },
  center: { flex: 1, backgroundColor: '#0F172A66', justifyContent: 'center', padding: 20 },
  dialog: { backgroundColor: '#FFF', borderRadius: 12, padding: 20, gap: 14, width: '100%', maxWidth: 480, alignSelf: 'center' },
  title: { color: colors.text, fontSize: 17, fontWeight: '600', lineHeight: 25 }, subtitle: { color: colors.muted, fontSize: 13, lineHeight: 20, marginBottom: 6 },
  item: { minHeight: 52, justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: colors.line, paddingVertical: 8 }, itemText: { color: colors.text, fontSize: 15, fontWeight: '500' },
  hint: { color: colors.muted, fontSize: 12, lineHeight: 18 }, error: { backgroundColor: '#FEF2F2', color: '#B91C1C', padding: 10, borderRadius: 6, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' },
});
