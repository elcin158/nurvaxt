// Isolated visual fixture. This module is substituted only by preview.mjs, never by Metro.
import { createContext, useContext, useState } from 'react';
import { ResidentStore } from '../../src/temporary-residents/store';
import type { ReportState, ServerResidentDetail } from '../../src/temporary-residents/types';
import { catalog, formData } from './fixture';
const memory = new Map<string, string>();
let sequence = 0;
const store = new ResidentStore({ read: (o, k) => memory.get(o + k) ?? null, write: (o, k, v) => { memory.set(o + k, v); },
  remove: (o, k) => { memory.delete(o + k); },
  list: o => [...memory.entries()].filter(([key]) => key.startsWith(o + 'draft:')).map(([, value]) => value) }, 'preview', () => `preview-${++sequence}`);
const state = (extra: Partial<ReportState> = {}): ReportState => ({ rootReportId: 900, reportId: 900, version: 3, status: 1, statusName: 'Formalaşmış', canEdit: true, returnReason: null, ...extra });
const copy = (extra: Partial<ReportState>, firstName: string): ServerResidentDetail => ({ accountNumber: `0310${(extra.rootReportId ?? 900) - 900}`, address: null, state: state(extra),
  actions: { canEdit: true, canDelete: false, canSubmitForApproval: true, canSubmitForApprovalWhenCompleted: true, canClose: false, closeRequiresDescription: false },
  data: { ...formData, personal: { ...formData.personal, firstName } } });
store.create(formData);
store.create({ ...formData, personal: { ...formData.personal, fin: '', firstName: '', lastName: '' } });
// A downloaded report edited on the device, then returned on the web with changes.
const returned = store.adopt('preview-returned', 1, copy({ rootReportId: 901, reportId: 901 }, 'Əli'));
store.save(returned.id, { ...returned.data, personal: { ...returned.data.personal, lastName: 'Məmmədov', firstName: 'Əli' }, counts: { 1: 4 } });
store.conflict(returned.id, { code: 'VERSION_CONFLICT', message: 'Hesabat serverdə dəyişdirilib.', at: '',
  server: copy({ rootReportId: 901, reportId: 905, version: 7, status: 4, statusName: 'Təsdiqdən geri qaytarılıb', returnReason: 'Doğum tarixi düzəldilməlidir' }, 'Vəli') });
const locked = store.adopt('preview-locked', 1, copy({ rootReportId: 902, reportId: 902 }, 'Leyla'));
store.applyStatus({ clientId: locked.id, deleted: false, changed: true, state: state({ rootReportId: 902, reportId: 902, version: 5, status: 2, statusName: 'Təsdiq gözləyir', canEdit: false }) });
const Context = createContext<any>(null);
export function PreviewProvider({ children }: any) {
  const [drafts, setDrafts] = useState(store.list()), [online, setOnline] = useState(false);
  const [notice, setNotice] = useState(''), [syncing, setSyncing] = useState(false);
  const refresh = () => setDrafts(store.list());
  const value = { store, catalog, drafts, error: '', online, loading: false, catalogLoading: false, refreshing: false, syncing, progress: '', notice,
    refreshCatalog: async () => {}, accessToken: async () => 'preview', refreshStatuses: async () => {},
    save: (id: string, data: any) => { const d = store.save(id, data); refresh(); return d; },
    create: (data: any) => { const d = store.create(data); refresh(); return d; },
    sync: async (ids: string[]) => { setSyncing(true); for (const id of ids) { const d = store.get(id)!; store.acknowledge(d, { clientId: id, revision: d.revision, personalAccountNumber: 'MY-NÜMUNƏ', state: d.conflict?.server.state ?? state() }); } refresh(); setNotice('Seçilmiş qeydlər sinxron edildi (vizual sınaq).'); setSyncing(false); return { conflicts: 0 }; },
    edit: async (reportId: number) => store.list().find(x => x.server?.reportId === reportId)?.id ?? store.adopt(`preview-edit-${reportId}`, 1, copy({ rootReportId: reportId, reportId }, 'Endirilmiş')).id,
    adoptServer: async (id: string) => { const d = store.get(id)!; store.adopt(id, d.revision, d.conflict!.server); refresh(); },
    remove: (id: string, discard?: boolean) => { store.remove(id, discard); refresh(); },
    workflow: async (_: number, action: string) => action === 'delete' ? 'Müvəqqəti yaşayan şəxs hesabatı silindi.' : 'Hesabat təsdiqə göndərildi.',
  };
  return <Context.Provider value={value}><button id="network-toggle" style={{ position: 'fixed', right: 12, bottom: 4, zIndex: 1000, fontSize: 10, opacity: 0.5 }} onClick={() => setOnline(!online)}>Sınaq: {online ? 'oflayn ol' : 'onlayn ol'}</button>{children}</Context.Provider>;
}
export const useResidents = () => useContext(Context);
