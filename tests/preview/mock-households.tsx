// Isolated visual fixture of the household context. Substituted only by preview-households.mjs, never by Metro.
import { createContext, useContext, useState } from 'react';
import { HouseholdStore } from '../../src/households/store';
import { householdCatalog, householdData } from './households-fixture';
const memory = new Map<string, string>();
let sequence = 0;
const store = new HouseholdStore({ read: (o, k) => memory.get(o + k) ?? null, write: (o, k, v) => { memory.set(o + k, v); },
  remove: (o, k) => { memory.delete(o + k); },
  list: o => [...memory.entries()].filter(([key]) => key.startsWith(o + 'draft:')).map(([, value]) => value) }, 'preview', () => `preview-${++sequence}`);
const created = store.create(householdData);
// "#/households/preview-1?review" opens the record as one locked on the server, i.e. in review mode.
if (location.hash.endsWith('?review')) memory.set(`preview${'draft:'}${created.id}`, JSON.stringify({ ...created, syncedRevision: created.revision,
  status: { rootReportId: 1, reportId: 1, version: 1, status: 2, statusName: 'Təsdiq gözləyir', canEdit: false, returnReason: null, changed: false, checkedAt: '' } }));
const Context = createContext<any>(null);
export function PreviewProvider({ children }: any) {
  const [drafts, setDrafts] = useState(store.list());
  const refresh = () => setDrafts(store.list());
  const value = { store, catalog: householdCatalog, drafts, error: '', online: false, loading: false, catalogLoading: false, syncing: false, progress: '', notice: '',
    dismiss: () => {}, accessToken: async () => 'preview', refreshStatuses: async () => {}, newKey: () => `key-${++sequence}`,
    save: (id: string, data: any) => { const d = store.save(id, data); refresh(); return d; },
    create: (data: any) => { const d = store.create(data); refresh(); return d; },
    sync: async () => ({ conflicts: 0 }), edit: async () => 'preview-1', adoptServer: async () => {}, remove: () => {}, release: () => {},
    workflow: async () => '', idCard: async () => { throw new Error('Vizual sınaq'); } };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export const useHouseholds = () => useContext(Context);
