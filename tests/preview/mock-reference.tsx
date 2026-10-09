// Isolated visual fixture for the shared reference data. Substituted only by preview.mjs, never by Metro.
import { catalog } from './fixture';
const reference = { catalog: { ...catalog, version: 2, vehicleTypes: [], otherEquipmentTypes: [], landCategories: [] },
  addresses: { counts: { adminUnits: 2, streets: 1, entrances: 1, pageSize: 20000 }, downloadedAt: catalog.downloadedAt },
  loading: false, refreshing: null, online: false, progress: null, partial: null, error: '', failed: null, notice: '',
  refreshLists: async () => true, refreshAddresses: async () => {}, refreshAll: async () => {}, dismiss: () => {} };
export const useReference = () => reference;
export const progressPercent = (p: { done: number; total: number } | null) => p && p.total ? Math.floor(p.done / p.total * 100) : 0;
export const ReferenceProvider = ({ children }: any) => children;
