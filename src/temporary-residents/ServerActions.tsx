import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ActionSheet, ConfirmDialog, type SheetItem } from '../components/ActionSheet';
import { Button, colors } from '../components/ResidentControls';
import { useResidents } from './context';
import { getHistory, getServerResident } from './server';
import { pending, type HistoryItem, type ServerResidentDetail, type ServerResidentItem, type WorkflowAction } from './types';

type Dialog = { action: WorkflowAction; title: string; confirmLabel: string; danger?: boolean; descriptionRequired?: boolean; syncFirst?: string };
const message = (cause: unknown, fallback: string) => cause instanceof Error ? cause.message : fallback;

/**
 * Tbu.Web's row menu for an operator. The menu reads the report afresh, so the actions offered
 * and the version they are applied to are the server's current ones, not the list's.
 */
export function ServerActions({ item, onClose, onDone }: { item: ServerResidentItem; onClose(): void; onDone(message: string): void }) {
  const residents = useResidents();
  const [detail, setDetail] = useState<ServerResidentDetail | null>(null), [error, setError] = useState('');
  const [dialog, setDialog] = useState<Dialog | null>(null), [busy, setBusy] = useState(false), [dialogError, setDialogError] = useState('');
  const [history, setHistory] = useState<HistoryItem[] | null>(null), [showHistory, setShowHistory] = useState(false), [opening, setOpening] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void residents.accessToken().then(token => getServerResident(token, item.reportId))
      .then(value => { if (!cancelled) setDetail(value); })
      .catch(cause => { if (!cancelled) setError(message(cause, 'Hesabat yüklənmədi.')); });
    return () => { cancelled = true; };
    // The menu is opened for one row; the context functions it uses are stable in effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.reportId]);
  const bound = residents.drafts.find(x => x.server && detail && x.server.rootReportId === detail.state.rootReportId);
  const a = detail?.actions;
  async function openEditor() {
    setOpening(true); setError('');
    try {
      const id = await residents.edit(item.reportId);
      onClose(); router.push({ pathname: '/temporary-residents/[id]', params: { id } });
    } catch (cause) { setError(message(cause, 'Hesabat cihaza endirilmədi.')); }
    finally { setOpening(false); }
  }
  async function openHistory() {
    setShowHistory(true);
    try { setHistory(await getHistory(await residents.accessToken(), item.reportId)); }
    catch (cause) { setShowHistory(false); setError(message(cause, 'Tarixçə yüklənmədi.')); }
  }
  async function confirm(description: string) {
    if (!dialog || !detail) return;
    setBusy(true); setDialogError('');
    try {
      let version = detail.state.version, reportId = detail.state.reportId;
      // Submitting must act on what the operator entered on this device, so unsent changes go first.
      if (dialog.syncFirst && bound && pending(bound)) {
        const result = await residents.sync([bound.id]);
        // A record sent in full has left the device; one still here kept something unsent.
        const after = residents.store?.get(bound.id);
        if (!result || result.conflicts || after && pending(after))
          throw new Error(after?.lastError || 'Cihazdakı dəyişikliklər göndərilmədi. Əvvəlcə sinxronizasiyanı tamamlayın.');
        const fresh = await getServerResident(await residents.accessToken(), reportId);
        version = fresh.state.version; reportId = fresh.state.reportId;
      }
      const text = await residents.workflow(reportId, dialog.action, version, description);
      setDialog(null); onDone(text);
    } catch (cause) { setDialogError(message(cause, 'Əməliyyat tamamlanmadı.')); }
    finally { setBusy(false); }
  }
  const items: SheetItem[] = !detail ? [] : [
    { label: 'Ətraflı bax', onPress: () => { onClose(); router.push({ pathname: '/temporary-residents/server/[reportId]', params: { reportId: String(detail.state.reportId) } }); } },
    { label: 'Tarixçə', onPress: () => void openHistory() },
    ...a?.canEdit ? [{ label: bound ? 'Redaktə et (cihazdakı qeyd)' : 'Redaktə et', onPress: () => void openEditor(),
      hint: bound ? undefined : 'Hesabat redaktə üçün cihaza endiriləcək. Dəyişiklik etmədən çıxsanız, cihazdan silinəcək.' }] : [],
    ...a?.canSubmitForApprovalWhenCompleted ? [{ label: 'Təsdiqə göndər', disabled: !a.canSubmitForApproval,
      hint: !a.canSubmitForApproval ? 'Bütün bölmələr tamamlanmalıdır.' : bound && pending(bound) ? 'Cihazdakı dəyişikliklər əvvəlcə göndəriləcək.' : undefined,
      onPress: () => setDialog({ action: 'submit-for-approval', title: 'Bu hesabatı təsdiqə göndərməyə əminsiniz?', confirmLabel: 'Bəli, göndər', syncFirst: 'yes' }) }] : [],
    ...a?.canClose ? [{ label: 'Hesabı bağla', onPress: () => setDialog({ action: 'close', title: 'Hesabı bağlamaq istədiyinizə əminsiniz?',
      confirmLabel: 'Təsdiq et', descriptionRequired: a.closeRequiresDescription }) }] : [],
    ...a?.canDelete ? [{ label: 'Sil', danger: true, hint: bound && pending(bound) ? 'Cihazdakı göndərilməmiş dəyişikliklər cihazda qalacaq.' : undefined,
      onPress: () => setDialog({ action: 'delete', title: 'Müvəqqəti yaşayan şəxs hesabatını silmək istədiyinizə əminsiniz?', confirmLabel: 'Sil', danger: true }) }] : [],
  ];
  const close = () => { if (!busy) onClose(); };
  return <>
    {!dialog && !showHistory && <ActionSheet title={item.fullName || `Şəxsi hesab № ${item.accountNumber}`}
      subtitle={detail ? `${detail.state.statusName}${detail.state.returnReason ? ` · Səbəb: ${detail.state.returnReason}` : ''}` : undefined}
      loading={(!detail && !error) || opening} error={error} items={items} onClose={close} />}
    {dialog && <ConfirmDialog title={dialog.title} confirmLabel={dialog.confirmLabel} danger={dialog.danger} descriptionRequired={dialog.descriptionRequired}
      busy={busy} error={dialogError} onConfirm={description => void confirm(description)} onCancel={() => { if (!busy) { setDialog(null); setDialogError(''); onClose(); } }} />}
    {showHistory && <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.history}><View style={styles.historyHeader}><Text style={styles.title}>Hesabatın tarixçəsi</Text><Button secondary label="Bağla" onPress={onClose} /></View>
        {!history ? <ActivityIndicator style={{ margin: 40 }} color={colors.primary} /> : <FlatList data={history} keyExtractor={(x, i) => `${x.actionDate}-${i}`}
          ListEmptyComponent={<Text style={styles.muted}>Tarixçə boşdur.</Text>}
          renderItem={({ item: h }) => <View style={styles.historyRow}>
            <Text style={styles.label}>{h.action}</Text>
            <Text style={styles.muted}>{new Date(h.actionDate).toLocaleString('az-AZ')}{h.actorName ? ` · ${h.actorName}` : ''}</Text>
            <Text style={styles.muted}>{h.previousStatus} → {h.newStatus}</Text>
            {!!h.description && <Text style={styles.value}>{h.description}</Text>}
          </View>} />}
      </SafeAreaView>
    </Modal>}
  </>;
}
const styles = StyleSheet.create({
  history: { flex: 1, backgroundColor: '#FFF', padding: 20, gap: 12 }, historyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { color: colors.text, fontSize: 18, fontWeight: '600' }, historyRow: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.line, gap: 4 },
  label: { color: colors.text, fontSize: 14, fontWeight: '600' }, value: { color: colors.text, fontSize: 14, lineHeight: 21 }, muted: { color: colors.muted, fontSize: 12, lineHeight: 18 },
});
