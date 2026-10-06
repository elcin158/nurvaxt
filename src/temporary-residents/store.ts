import { pending, type Catalog, type ReportState, type ResidentData, type ResidentDraft, type ServerResidentDetail, type SyncConflict, type SyncReceipt, type SyncStatusItem } from './types';

export interface LocalStorage {
  read(owner: string, key: string): string | null;
  write(owner: string, key: string, value: string): void;
  list(owner: string): string[];
  remove(owner: string, key: string): void;
}
const validState = (state: ReportState | undefined) => !!state && Number.isInteger(state.rootReportId) && state.rootReportId > 0 &&
  Number.isInteger(state.reportId) && state.reportId > 0 && Number.isInteger(state.version) && state.version > 0;

/** Each save is one durable, atomic write. Auth cleanup never deletes business data. */
export class ResidentStore {
  constructor(private storage: LocalStorage, readonly owner: string, private uuid: () => string,
    private now: () => string = () => new Date().toISOString()) {}
  list(): ResidentDraft[] {
    return this.storage.list(this.owner).map(value => this.parseDraft(value))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  get(id: string): ResidentDraft | null {
    const value = this.storage.read(this.owner, `draft:${id}`);
    return value === null ? null : this.parseDraft(value);
  }
  private parseDraft(value: string): ResidentDraft {
    const draft = JSON.parse(value) as ResidentDraft;
    if (draft.owner !== this.owner || !draft.id || !Number.isInteger(draft.revision) || !draft.data)
      throw new Error('Lokal qeyd oxunmadı. Məlumatların üzərinə yazılmadı.');
    return draft;
  }
  private put(draft: ResidentDraft) {
    this.storage.write(this.owner, `draft:${draft.id}`, JSON.stringify(draft));
    return draft;
  }
  create(data: ResidentData): ResidentDraft {
    const now = this.now();
    return this.put({ id: this.uuid(), owner: this.owner, revision: 1, syncedRevision: 0, createdAt: now, updatedAt: now, data });
  }
  save(id: string, data: ResidentData): ResidentDraft {
    const current = this.get(id);
    if (!current) throw new Error('Lokal qeyd tapılmadı.');
    return this.put({ ...current, revision: current.revision + 1, data, updatedAt: this.now(), lastError: undefined });
  }
  acknowledge(sent: ResidentDraft, receipt: SyncReceipt): ResidentDraft {
    if (receipt.clientId !== sent.id || receipt.revision !== sent.revision || !validState(receipt.state))
      throw new Error('Serverin sinxronizasiya cavabı uyğun deyil. Qeyd lokalda saxlanıldı.');
    const current = this.get(sent.id);
    if (!current) throw new Error('Lokal qeyd tapılmadı.');
    const { state } = receipt;
    // An edit made during upload remains pending; acknowledge only the revision actually sent.
    return this.put({ ...current, syncedRevision: Math.max(current.syncedRevision, sent.revision), syncedAt: this.now(),
      server: { ...current.server, rootReportId: state.rootReportId, reportId: state.reportId, version: state.version, personalAccountNumber: receipt.personalAccountNumber },
      status: { ...state, changed: false, checkedAt: this.now() }, conflict: undefined, lastError: undefined });
  }
  /** Stores a report checked out from the server, or adopts the server copy for an existing record. */
  adopt(id: string, revision: number, report: ServerResidentDetail): ResidentDraft {
    if (!validState(report.state)) throw new Error('Serverdən hesabat məlumatı düzgün alınmadı.');
    const current = this.get(id), now = this.now();
    // Local edits are kept as revisions: the record stays ahead of the server's receipt.
    const nextRevision = Math.max(revision, current?.revision ?? 0);
    return this.put({
      id, owner: this.owner, createdAt: current?.createdAt ?? now, updatedAt: now, data: report.data,
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
  findByRoot(rootReportId: number): ResidentDraft | null {
    return this.list().find(x => x.server?.rootReportId === rootReportId) ?? null;
  }
  fail(id: string, message: string) {
    const current = this.get(id);
    if (current) this.put({ ...current, lastError: message });
  }
  catalog(): Catalog | null {
    const raw = this.storage.read(this.owner, 'catalog');
    if (!raw) return null;
    const value = JSON.parse(raw) as Catalog;
    if (value.version !== 1 || !value.lookups || !Array.isArray(value.animals) || !Array.isArray(value.adminUnits))
      throw new Error('Arayış məlumatları uyğun deyil. Onlayn yeniləyin.');
    return value;
  }
  saveCatalog(value: Catalog) { this.storage.write(this.owner, 'catalog', JSON.stringify(value)); }
}
