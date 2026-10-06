import { useSyncExternalStore } from 'react';
let path = location.hash.slice(1) || '/temporary-residents';
const listeners = new Set<() => void>();
function navigate(value: any) { path = typeof value === 'string' ? value : value.params.reportId ? `/temporary-residents/server/${value.params.reportId}` : value.pathname.includes('conflict') ? `/temporary-residents/conflict/${value.params.id}` : `/temporary-residents/${value.params.id}`; location.hash = path; listeners.forEach(l => l()); }
export const router = { push: navigate, replace: navigate, back: () => navigate('/temporary-residents'), canGoBack: () => false };
export function usePath() { return useSyncExternalStore(l => { listeners.add(l); return () => { listeners.delete(l); }; }, () => path); }
export function useLocalSearchParams() { const id = usePath().split('/').pop(); return { id, reportId: id }; }
