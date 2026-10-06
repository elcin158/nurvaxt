import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useNetworkState } from 'expo-network';
import { useAuth } from '../../App';
import * as Crypto from 'expo-crypto';
import { ApiError, apiRequest } from '../auth/api';
import { openResidentStore } from './deviceStore';
import type { ResidentStore } from './store';
import { ownerKey, pending, type Catalog, type ResidentData, type ResidentDraft, type ServerResidentDetail, type WorkflowAction } from './types';
import { checkout, fromServer, runWorkflow, syncResident, syncStatus } from './server';
import { validate } from './schema';
import { ResidentSync } from './sync';

type Context = {
  store: ResidentStore | null; catalog: Catalog | null; drafts: ResidentDraft[];
  error: string; online: boolean; loading: boolean; refreshing: boolean; syncing: boolean;
  progress: string; notice: string;
  refreshCatalog(): Promise<void>; sync(ids: string[], options?: { confirmOverwrite?: boolean }): Promise<{ conflicts: number } | void>;
  save(id: string, data: ResidentData): ResidentDraft; create(data: ResidentData): ResidentDraft;
  accessToken(): Promise<string>; refreshStatuses(): Promise<void>;
  /** Opens a server report for editing on this device; returns the device record id. */
  edit(reportId: number): Promise<string>;
  adoptServer(id: string): Promise<void>; remove(id: string, discardChanges?: boolean): void;
  workflow(reportId: number, action: WorkflowAction, version: number, description?: string): Promise<string>;
};
const ResidentContext = createContext<Context | null>(null);
export function useResidents() {
  const context = useContext(ResidentContext);
  if (!context) throw new Error('Resident provider missing');
  return context;
}
export function ResidentProvider({ children }: { children: ReactNode }) {
  const auth = useAuth(), network = useNetworkState();
  const [store, setStore] = useState<ResidentStore | null>(null);
  const [catalog, setCatalog] = useState<Catalog | null>(null), [drafts, setDrafts] = useState<ResidentDraft[]>([]);
  const [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true), [refreshing, setRefreshing] = useState(false), [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState('');
  const live = useRef(true), busy = useRef(false), refreshingRef = useRef(false);
  const authRef = useRef(auth);
  useEffect(() => { authRef.current = auth; }, [auth]);
  const owner = auth.session ? ownerKey(auth.session.user) : '';
  const online = network.isConnected === true && network.isInternetReachable !== false;
  useEffect(() => {
    live.current = true;
    let cancelled = false;
    void openResidentStore(owner).then(value => {
      if (cancelled) return;
      setDrafts(value.list()); setCatalog(value.catalog()); setStore(value);
    }).catch(cause => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'Lokal məlumatlar açılmadı.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; live.current = false; };
  }, [owner]);
  async function refreshCatalog() {
    if (!store || refreshingRef.current) return;
    if (!online) { setError('Arayışları yeniləmək üçün internetə qoşulun.'); return; }
    refreshingRef.current = true; setRefreshing(true); setError('');
    try {
      const accessToken = await authRef.current.getAccessToken();
      const value = await apiRequest<Catalog>('GET', 'temporary-residents/catalog', { accessToken, timeoutMs: 60_000 });
      if (!live.current) return;
      if (value.version !== 1 || !value.lookups || !Array.isArray(value.animals) || !Array.isArray(value.adminUnits) || !Array.isArray(value.streets) || !Array.isArray(value.entrances))
        throw new Error('Serverdən arayış məlumatları düzgün alınmadı.');
      store.saveCatalog(value); setCatalog(value); setNotice('Arayışlar cihazda saxlanıldı. Formanı internetsiz doldura bilərsiniz.');
    } catch (cause) { if (live.current) setError(cause instanceof Error ? cause.message : 'Arayışlar yenilənmədi.'); }
    finally { refreshingRef.current = false; if (live.current) setRefreshing(false); }
  }
  async function sync(ids: string[], options: { confirmOverwrite?: boolean } = {}) {
    if (!store || !catalog || busy.current) return;
    if (!online) { setError('Sinxronizasiya üçün internetə qoşulun.'); return; }
    busy.current = true; setSyncing(true); setError(''); setNotice('');
    try {
      const sync = new ResidentSync(store, async draft => {
        const accessToken = await authRef.current.getAccessToken();
        if (!live.current) throw new Error('Tətbiq kilidlənib.');
        return syncResident(accessToken, draft, options.confirmOverwrite === true);
      }, draft => Object.values(validate(draft.data, catalog))[0]);
      const result = await sync.selected(ids, (done, total) => {
        if (live.current) setProgress(`${done} / ${total}`);
      }, () => live.current);
      if (live.current) {
        setDrafts(store.list());
        setNotice(`${result.succeeded} qeyd sinxron edildi.${result.conflicts ? ` ${result.conflicts} qeyd qərar gözləyir.` : ''}${result.remaining - result.conflicts > 0 ? ` ${result.remaining - result.conflicts} qeyd lokalda gözləyir.` : ''}`);
      }
      return { conflicts: result.conflicts };
    } catch (cause) { if (live.current) setError(cause instanceof Error ? cause.message : 'Sinxronizasiya tamamlanmadı.'); }
    finally { busy.current = false; if (live.current) { setSyncing(false); setProgress(''); } }
  }
  const accessToken = () => authRef.current.getAccessToken();
  async function refreshStatuses() {
    if (!store || !online) return;
    const ids = store.list().filter(x => x.server).map(x => x.id);
    if (!ids.length) return;
    try {
      const items = await syncStatus(await accessToken(), ids);
      if (!live.current) return;
      items.forEach(item => store.applyStatus(item)); setDrafts(store.list());
    } catch { /* Statuses are advisory; sync still checks everything on the server. */ }
  }
  function requireOnline() {
    if (!store) throw new Error('Lokal yaddaş hazır deyil.');
    if (!online) throw new Error('Bu əməliyyat üçün internetə qoşulun.');
    return store;
  }
  async function edit(reportId: number) {
    const local = requireOnline();
    const bound = local.list().find(x => x.server?.reportId === reportId || x.server?.rootReportId === reportId);
    if (bound) return bound.id;
    const result = await checkout(await accessToken(), reportId, Crypto.randomUUID());
    // The server keeps one device record per report chain; reuse it if it is already here.
    const existing = local.get(result.clientId) ?? local.findByRoot(result.report.state.rootReportId);
    if (existing && pending(existing)) return existing.id;
    local.adopt(existing?.id ?? result.clientId, result.revision, result.report);
    setDrafts(local.list());
    return existing?.id ?? result.clientId;
  }
  async function adoptServer(id: string) {
    const local = requireOnline(), draft = local.get(id);
    if (!draft?.server) throw new Error('Qeyd serverə bağlı deyil.');
    let report: ServerResidentDetail, revision = draft.revision;
    try {
      // Checkout re-binds the server receipt to the current version, so later edits sync without a conflict.
      const result = await checkout(await accessToken(), draft.server.reportId, id);
      report = result.report; revision = Math.max(revision, result.revision);
    } catch (cause) {
      // A locked report cannot be checked out; its server copy is still the one to keep.
      if (!(cause instanceof ApiError && cause.code === 'REPORT_LOCKED' && cause.problem?.server)) throw cause;
      const server = cause.problem.server as ServerResidentDetail;
      report = { ...server, data: fromServer(server.data) };
    }
    local.adopt(id, revision, report); setDrafts(local.list());
  }
  function remove(id: string, discardChanges = false) {
    if (!store) throw new Error('Lokal yaddaş hazır deyil.');
    store.remove(id, discardChanges); setDrafts(store.list());
  }
  async function workflow(reportId: number, action: WorkflowAction, version: number, description?: string) {
    const local = requireOnline();
    const result = await runWorkflow(await accessToken(), reportId, action, version, description);
    const bound = local.list().find(x => x.server?.reportId === reportId);
    if (action === 'delete' && bound) {
      if (pending(bound)) local.markDeleted(bound.id, 'Hesabat serverdə silinib. Lokal məlumatlar cihazda saxlanıldı.');
      else local.remove(bound.id);
      setDrafts(local.list());
    } else await refreshStatuses();
    return result.message;
  }
  const save = (id: string, data: ResidentData) => {
    if (!store) throw new Error('Lokal yaddaş hazır deyil.');
    const value = store.save(id, data); setDrafts(current => current.map(draft => draft.id === id ? value : draft)); return value;
  };
  const create = (data: ResidentData) => {
    if (!store) throw new Error('Lokal yaddaş hazır deyil.');
    const value = store.create(data); setDrafts(current => [value, ...current]); return value;
  };
  // Statuses are refreshed whenever the device comes online, so returned and locked reports show before editing.
  const statusKey = store && online ? owner : '';
  useEffect(() => {
    if (!statusKey) return;
    const timer = setTimeout(() => void refreshStatuses(), 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusKey]);
  return <ResidentContext.Provider value={{ store, catalog, drafts, error, online, loading, refreshing, syncing, progress, notice, refreshCatalog, sync, save, create,
    accessToken, refreshStatuses, edit, adoptServer, remove, workflow }}>
    {children}
  </ResidentContext.Provider>;
}
