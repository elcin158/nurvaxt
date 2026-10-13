import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { ActionSheet, ConfirmDialog, type SheetItem } from '../components/ActionSheet';
import { HistorySheet } from '../history/HistorySheet';
import { useHouseholds } from './context';
import { getHistory, getServerHousehold } from './server';
import { pending, type ServerHouseholdDetail, type ServerHouseholdItem, type WorkflowAction } from './types';

type Dialog = { action: WorkflowAction; title: string; confirmLabel: string; danger?: boolean; descriptionRequired?: boolean; syncFirst?: string };
const message = (cause: unknown, fallback: string) => cause instanceof Error ? cause.message : fallback;

/**
 * Tbu.Web's row menu for an operator. The menu reads the report afresh, so the actions offered
 * and the version they are applied to are the server's current ones, not the list's.
 */
export function ServerActions({ item, onClose, onDone }: { item: ServerHouseholdItem; onClose(): void; onDone(message: string): void }) {
  const households = useHouseholds();
  const [detail, setDetail] = useState<ServerHouseholdDetail | null>(null), [error, setError] = useState('');
  const [dialog, setDialog] = useState<Dialog | null>(null), [busy, setBusy] = useState(false), [dialogError, setDialogError] = useState('');
  const [showHistory, setShowHistory] = useState(false), [opening, setOpening] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void households.accessToken().then(token => getServerHousehold(token, item.reportId))
      .then(value => { if (!cancelled) setDetail(value); })
      .catch(cause => { if (!cancelled) setError(message(cause, 'Təsərrüfat yüklənmədi.')); });
    return () => { cancelled = true; };
    // The menu is opened for one row; the context functions it uses are stable in effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.reportId]);
  const bound = households.drafts.find(x => x.server && detail && x.server.rootReportId === detail.state.rootReportId);
  const a = detail?.actions;
  async function openEditor() {
    setOpening(true); setError('');
    try {
      const id = await households.edit(item.reportId);
      onClose(); router.push({ pathname: '/households/[id]', params: { id } });
    } catch (cause) { setError(message(cause, 'Təsərrüfat cihaza endirilmədi.')); }
    finally { setOpening(false); }
  }
  async function confirm(description: string) {
    if (!dialog || !detail) return;
    setBusy(true); setDialogError('');
    try {
      let version = detail.state.version, reportId = detail.state.reportId;
      // Submitting must act on what the operator entered on this device, so unsent changes go first.
      if (dialog.syncFirst && bound && pending(bound)) {
        const result = await households.sync([bound.id]);
        // A record sent in full has left the device; one still here kept something unsent.
        const after = households.store?.get(bound.id);
        if (!result || result.conflicts || after && pending(after))
          throw new Error(after?.lastError || 'Cihazdakı dəyişikliklər göndərilmədi. Əvvəlcə sinxronizasiyanı tamamlayın.');
        const fresh = await getServerHousehold(await households.accessToken(), reportId);
        version = fresh.state.version; reportId = fresh.state.reportId;
      }
      const text = await households.workflow(reportId, dialog.action, version, description);
      setDialog(null); onDone(text);
    } catch (cause) { setDialogError(message(cause, 'Əməliyyat tamamlanmadı.')); }
    finally { setBusy(false); }
  }
  const items: SheetItem[] = !detail ? [] : [
    { label: 'Ətraflı bax', onPress: () => { onClose(); router.push({ pathname: '/households/server/[reportId]', params: { reportId: String(detail.state.reportId) } }); } },
    { label: 'Tarixçə', onPress: () => setShowHistory(true) },
    ...a?.canEdit ? [{ label: bound ? 'Redaktə et (cihazdakı qeyd)' : 'Redaktə et', onPress: () => void openEditor(),
      hint: bound ? undefined : 'Təsərrüfat redaktə üçün cihaza endiriləcək. Dəyişiklik etmədən çıxsanız, cihazdan silinəcək.' }] : [],
    ...a?.canSubmitForApprovalWhenCompleted ? [{ label: 'Təsdiqə göndər', disabled: !a.canSubmitForApproval,
      hint: !a.canSubmitForApproval ? 'Bütün bölmələr tamamlanmalıdır.' : bound && pending(bound) ? 'Cihazdakı dəyişikliklər əvvəlcə göndəriləcək.' : undefined,
      onPress: () => setDialog({ action: 'submit-for-approval', title: 'Bu təsərrüfatı təsdiqə göndərməyə əminsiniz?', confirmLabel: 'Bəli, göndər', syncFirst: 'yes' }) }] : [],
    ...a?.canClose ? [{ label: 'Hesabı bağla', onPress: () => setDialog({ action: 'close', title: 'Hesabı bağlamaq istədiyinizə əminsiniz?',
      confirmLabel: 'Təsdiq et', descriptionRequired: a.closeRequiresDescription }) }] : [],
    ...a?.canDelete ? [{ label: 'Sil', danger: true, hint: bound && pending(bound) ? 'Cihazdakı göndərilməmiş dəyişikliklər cihazda qalacaq.' : undefined,
      onPress: () => setDialog({ action: 'delete', title: 'Təsərrüfatı silmək istədiyinizə əminsiniz?', confirmLabel: 'Sil', danger: true }) }] : [],
  ];
  const close = () => { if (!busy) onClose(); };
  return <>
    {!dialog && !showHistory && <ActionSheet title={item.owner || `Şəxsi hesab № ${item.accountNumber}`}
      subtitle={detail ? `${detail.state.statusName}${detail.state.returnReason ? ` · Səbəb: ${detail.state.returnReason}` : ''}` : undefined}
      loading={(!detail && !error) || opening} error={error} items={items} onClose={close} />}
    {dialog && <ConfirmDialog title={dialog.title} confirmLabel={dialog.confirmLabel} danger={dialog.danger} descriptionRequired={dialog.descriptionRequired}
      busy={busy} error={dialogError} onConfirm={description => void confirm(description)} onCancel={() => { if (!busy) { setDialog(null); setDialogError(''); onClose(); } }} />}
    {showHistory && <HistorySheet title="Təsərrüfatın tarixçəsi" load={async () => getHistory(await households.accessToken(), item.reportId)} onClose={onClose} />}
  </>;
}
