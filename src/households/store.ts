import type { LocalStorage } from '../storage/encryptedStorage';
import { pending, withAllSteps, type HouseholdData, type HouseholdDraft, type RecordIds, type ReportState, type ServerHouseholdDetail,
  type SyncConflict, type SyncReceipt, type SyncStatusItem } from './types';

const validState = (state: ReportState | undefined) => !!state && Number.isInteger(state.rootReportId) && state.rootReportId > 0 &&
  Number.isInteger(state.reportId) && state.reportId > 0 && Number.isInteger(state.version) && state.version > 0;
/** Gives records their server ids by device key; a record removed meanwhile simply stays removed. */
function withIds(data: HouseholdData, ids: RecordIds): HouseholdData {
  const apply = <T extends { key: string; id: number | null }>(items: T[], map: Record<string, number> | undefined) =>
    items.map(item => map?.[item.key] ? { ...item, id: map[item.key] } : item);
  return { ...data, members: apply(data.members, ids.members), buildings: apply(data.buildings, ids.buildings), lands: apply(data.lands, ids.lands) };
}

/** Each save is one durable, atomic write. Auth cleanup never deletes business data. */
export class HouseholdStore {
  constructor(private storage: LocalStorage, readonly owner: string, private uuid: () => string,
    private now: () => string = () => new Date().toISOString()) {}
  list(): HouseholdDraft[] {
    return this.storage.list(this.owner).map(value => this.parseDraft(value))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  get(id: string): HouseholdDraft | null {
    const value = this.storage.read(this.owner, `draft:${id}`);
    return value === null ? null : this.parseDraft(value);
  }
  private parseDraft(value: string): HouseholdDraft {
    const draft = JSON.parse(value) as HouseholdDraft;
    if (draft.owner !== this.owner || !draft.id || !Number.isInteger(draft.revision) || !draft.data || !Array.isArray(draft.data.members))
      throw new Error('Lokal qeyd oxunmadı. Məlumatların üzərinə yazılmadı.');
    return { ...draft, data: withAllSteps(draft.data) };
  }
  private put(draft: HouseholdDraft) {
    this.storage.write(this.owner, `draft:${draft.id}`, JSON.stringify(draft));
    return draft;
  }
  create(data: HouseholdData): HouseholdDraft {
    const now = this.now();
    return this.put({ id: this.uuid(), owner: this.owner, revision: 1, syncedRevision: 0, createdAt: now, updatedAt: now, data });
  }
  save(id: string, data: HouseholdData): HouseholdDraft {
    const current = this.get(id);
    if (!current) throw new Error('Lokal qeyd tapılmadı.');
    return this.put({ ...current, revision: current.revision + 1, data, updatedAt: this.now(), lastError: undefined });
  }
  acknowledge(sent: HouseholdDraft, receipt: SyncReceipt): HouseholdDraft {
    if (receipt.clientId !== sent.id || receipt.revision !== sent.revision || !validState(receipt.state) || !receipt.ids)
      throw new Error('Serverin sinxronizasiya cavabı uyğun deyil. Qeyd lokalda saxlanıldı.');
    const current = this.get(sent.id);
    if (!current) throw new Error('Lokal qeyd tapılmadı.');
    const { state } = receipt;
    // An edit made during upload remains pending; acknowledge only the revision actually sent.
    // Server ids are not an edit: they are written into the current data without a new revision.
    return this.put({ ...current, data: withIds(current.data, receipt.ids),
      syncedRevision: Math.max(current.syncedRevision, sent.revision), syncedAt: this.now(),
      server: { ...current.server, rootReportId: state.rootReportId, reportId: state.reportId, version: state.version, personalAccountNumber: receipt.personalAccountNumber },
      status: { ...state, changed: false, checkedAt: this.now() }, conflict: undefined, lastError: undefined });
  }
  /** Stores a household checked out from the server, or adopts the server copy for an existing record. */
  adopt(id: string, revision: number, report: ServerHouseholdDetail): HouseholdDraft {
    if (!validState(report.state)) throw new Error('Serverdən təsərrüfat məlumatı düzgün alınmadı.');
    const current = this.get(id), now = this.now();
    // Local edits are kept as revisions: the record stays ahead of the server's receipt.
    const nextRevision = Math.max(revision, current?.revision ?? 0);
    return this.put({
      id, owner: this.owner, createdAt: current?.createdAt ?? now, updatedAt: now, data: report.data, adoptedAt: now,
      revision: nextRevision, syncedRevision: nextRevision, syncedAt: now,
      server: { rootReportId: report.state.rootReportId, reportId: report.state.reportId, version: report.state.version,
        personalAccountNumber: report.accountNumber, downloaded: current ? current.server?.downloaded : true },
      status: { ...report.state, changed: false, checkedAt: now },
    });
  }
  conflict(id: string, conflict: SyncConflict) {
    const current = this.get(id);
    if (current) this.put({ ...current, conflict, lastError: conflict.message,
      status: { ...conflict.server.state, changed: true, checkedAt: this.now() } });
  }
  markDeleted(id: string, message: string) {
    const current = this.get(id);
    if (current) this.put({ ...current, deleted: true, conflict: undefined, lastError: message });
  }
  applyStatus(item: SyncStatusItem) {
    const current = this.get(item.clientId);
    if (!current || !current.server) return;
    if (item.deleted) { this.put({ ...current, deleted: true }); return; }
    if (item.state && validState(item.state))
      this.put({ ...current, deleted: false, status: { ...item.state, changed: item.changed, checkedAt: this.now() } });
  }
  /** Removing a record with unsent changes would lose the operator's work, so it is refused. */
  remove(id: string, discardChanges = false) {
    const current = this.get(id);
    if (!current) return;
    if (pending(current) && !discardChanges) throw new Error('Göndərilməmiş dəyişikliklər var. Qeyd cihazdan silinmədi.');
    this.storage.remove(this.owner, `draft:${id}`);
  }
  /** A record the server holds and the device has nothing more to send for leaves the device. */
  release(id: string): boolean {
    const current = this.get(id);
    if (!current?.server || pending(current) || current.conflict) return false;
    this.storage.remove(this.owner, `draft:${id}`);
    return true;
  }
  findByRoot(rootReportId: number): HouseholdDraft | null {
    return this.list().find(x => x.server?.rootReportId === rootReportId) ?? null;
  }
  fail(id: string, message: string) {
    const current = this.get(id);
    if (current) this.put({ ...current, lastError: message });
  }
}
