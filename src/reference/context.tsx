import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNetworkState } from 'expo-network';
import { useAuth } from '../../App';
import { ApiConnectionError, ApiError, apiRequest } from '../auth/api';
import { openEncryptedStorage, type LocalStorage } from '../storage/encryptedStorage';
import { ownerKey } from '../temporary-residents/types';
import { purgeLegacyCatalog as purgeHouseholds } from '../households/deviceStore';
import { purgeLegacyCatalog as purgeResidents } from '../temporary-residents/deviceStore';
import { downloadAddresses, openAddresses, partialAddresses, type AddressTable, type StoredAddresses } from './addressDb';
import { accountAreas, noAddresses, validReference, type AddressCounts, type ReferenceCatalog, type ReferenceData } from './types';

// The reference data both modules share, in two parts downloaded separately: the forms' lists
// (small, kept encrypted per user, since `accountAdminUnitIds` is theirs) and the address register
// (over a million public rows, one copy per device). A form works once the lists are here; its
// address fields wait for the register.
const location = { file: 'evtas-catalog.db', table: 'reference_local', keychainService: 'evtas.reference.v1', secretPrefix: 'evtas.reference' };

export type ReferenceProgress = { done: number; total: number };
/** A share of the address rows in whole percent. */
export const progressPercent = (progress: ReferenceProgress | null) => progress && progress.total ? Math.floor(progress.done / progress.total * 100) : 0;
export type ReferencePart = 'lists' | 'addresses';
type Context = {
  /** The lists with the address register; `addresses.ready` is false until the register is downloaded. */
  catalog: ReferenceCatalog | null;
  /** The stored register's row counts and download time. */
  addresses: Omit<StoredAddresses, 'book'> | null;
  loading: boolean; online: boolean;
  /** The part being downloaded, and the address rows downloaded so far. */
  refreshing: ReferencePart | null; progress: ReferenceProgress | null;
  /** An interrupted address download the next one continues; it survives restarts. */
  partial: ReferenceProgress | null;
  error: string; failed: ReferencePart | null; notice: string;
  refreshLists(): Promise<boolean>; refreshAddresses(): Promise<void>;
  /** Lists first, then the register: the first download of a device. */
  refreshAll(): Promise<void>;
  dismiss(): void;
};
const ReferenceContext = createContext<Context | null>(null);
export function useReference() {
  const context = useContext(ReferenceContext);
  if (!context) throw new Error('Reference provider missing');
  return context;
}

export function ReferenceProvider({ children }: { children: ReactNode }) {
  const auth = useAuth(), network = useNetworkState();
  const [lists, setLists] = useState<ReferenceData | null>(null), [addresses, setAddresses] = useState<StoredAddresses | null>(null);
  const [loading, setLoading] = useState(true), [refreshing, setRefreshing] = useState<ReferencePart | null>(null);
  const [progress, setProgress] = useState<ReferenceProgress | null>(null), [partial, setPartial] = useState<ReferenceProgress | null>(null);
  const [error, setError] = useState(''), [failed, setFailed] = useState<ReferencePart | null>(null), [notice, setNotice] = useState('');
  const storage = useRef<LocalStorage | null>(null), live = useRef(false), busy = useRef(false);
  // The latest lists and register, for a download that continues after a state update.
  const current = useRef<{ lists: ReferenceData | null; addresses: StoredAddresses | null }>({ lists: null, addresses: null });
  const show = (next: { lists: ReferenceData | null; addresses: StoredAddresses | null }) => {
    current.current = next; setLists(next.lists); setAddresses(next.addresses);
  };
  const authRef = useRef(auth);
  useEffect(() => { authRef.current = auth; }, [auth]);
  const owner = auth.session ? ownerKey(auth.session.user) : '';
  const online = network.isConnected === true && network.isInternetReachable !== false;

  useEffect(() => {
    if (!owner) return;
    live.current = true;
    let cancelled = false;
    void (async () => {
      const opened = await openEncryptedStorage(location, owner);
      if (cancelled) return;
      storage.current = opened;
      const raw = opened.read(owner, 'catalog');
      const data = raw ? JSON.parse(raw) as ReferenceData : null;
      if (raw && !validReference(data)) throw new Error('Arayışlar köhnə formatdadır. İnternetə qoşulub yeniləyin.');
      if (!data) return;
      const stored = await openAddresses(accountAreas(data));
      if (!cancelled) show({ lists: data, addresses: stored });
      const unfinished = await partialAddresses();
      if (!cancelled) setPartial(unfinished);
    })().catch(cause => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'Arayışlar açılmadı.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    // The old per-module catalogues are no longer read; their space is returned once.
    void Promise.all([purgeHouseholds(), purgeResidents()]).catch(() => {});
    return () => {
      cancelled = true; live.current = false; storage.current = null;
      show({ lists: null, addresses: null }); setLoading(true); setProgress(null); setPartial(null); setError(''); setFailed(null); setNotice('');
    };
  }, [owner]);

  const accessToken = () => authRef.current.getAccessToken();
  /** Runs one download; false when it did not complete. */
  async function run(part: ReferencePart, task: () => Promise<boolean>) {
    if (busy.current || !storage.current) return false;
    if (!online) { setError('Arayışları yeniləmək üçün internetə qoşulun.'); setFailed(part); return false; }
    busy.current = true; setRefreshing(part); setError(''); setFailed(null); setNotice('');
    try { return await task(); }
    catch (cause) {
      // An interrupted address download resumes from the last saved page on the next try. Server and
      // connection errors are worded for the operator; anything else (a storage failure) is not.
      if (__DEV__ && !(cause instanceof ApiError || cause instanceof ApiConnectionError)) console.warn('[reference] download failed', cause);
      if (live.current) {
        setError(cause instanceof ApiError || cause instanceof ApiConnectionError || (cause instanceof Error && part === 'lists')
          ? (cause as Error).message : 'Məlumat cihazda saxlanılmadı.');
        setFailed(part);
      }
      // What an interrupted address download has kept is shown until it continues.
      if (part === 'addresses') void partialAddresses().then(value => { if (live.current) setPartial(value); }).catch(() => {});
      return false;
    } finally { busy.current = false; if (live.current) { setRefreshing(null); setProgress(null); } }
  }

  const refreshLists = () => run('lists', async () => {
    const local = storage.current!, account = owner;
    const data = await apiRequest<ReferenceData>('GET', 'reference/catalog', { accessToken: await accessToken(), timeoutMs: 60_000 });
    if (!validReference(data)) throw new Error('Serverdən arayış məlumatları düzgün alınmadı.');
    if (!live.current) return false;
    local.write(account, 'catalog', JSON.stringify(data));
    // The account areas may have changed; the register is reopened with them.
    const stored = await openAddresses(accountAreas(data));
    if (!live.current) return false;
    show({ lists: data, addresses: stored }); setNotice('Formaların siyahıları cihazda saxlanıldı.');
    return true;
  });

  const refreshAddresses = async () => { await run('addresses', async () => {
    const lists = current.current.lists;
    if (!lists) throw new Error('Əvvəlcə formaların siyahılarını yükləyin.');
    const counts = await apiRequest<AddressCounts>('GET', 'reference/addresses', { accessToken: await accessToken(), timeoutMs: 60_000 });
    const fetchPage = async (table: AddressTable, after: number) =>
      apiRequest<string>('GET', `reference/addresses/${table}?after=${after}`, { accessToken: await accessToken(), timeoutMs: 60_000, text: true });
    const complete = await downloadAddresses(counts, fetchPage,
      (done, total) => { if (live.current) setProgress({ done, total }); }, () => live.current);
    if (!complete || !live.current) return false;
    const stored = await openAddresses(accountAreas(lists));
    if (!stored) throw new Error('Ünvanlar cihazda saxlanılmadı. Yenidən cəhd edin.');
    if (!live.current) return false;
    show({ ...current.current, addresses: stored }); setPartial(null); setNotice('Ünvanlar cihazda saxlanıldı. Formanı internetsiz doldura bilərsiniz.');
    return true;
  }); };

  // An address download cut off by a lost connection carries on by itself once the device is back online.
  const wasOnline = useRef(online);
  useEffect(() => {
    const back = online && !wasOnline.current;
    wasOnline.current = online;
    if (back && failed === 'addresses' && current.current.lists) void refreshAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  // A result message is read once and then gets out of the way.
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  async function refreshAll() {
    if (await refreshLists() && !current.current.addresses) await refreshAddresses();
  }

  const catalog = useMemo(() => lists ? { ...lists, addresses: addresses?.book ?? noAddresses } : null, [lists, addresses]);
  return <ReferenceContext.Provider value={{ catalog, addresses: addresses && { counts: addresses.counts, downloadedAt: addresses.downloadedAt, bytes: addresses.bytes },
    loading, online, refreshing, progress, partial, error, failed, notice, refreshLists, refreshAddresses, refreshAll,
    dismiss: () => { setError(''); setFailed(null); setNotice(''); } }}>{children}</ReferenceContext.Provider>;
}
