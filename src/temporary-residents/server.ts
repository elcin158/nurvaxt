import { apiRequest } from '../auth/api';
import type { CheckoutResult, FieldValue, HistoryItem, PersonalData, ResidentData, ResidentDraft, ServerResidentDetail, ServerResidentPage,
  SyncReceipt, SyncStatusItem, WorkflowAction } from './types';

export function listServerResidents(accessToken: string, search: string, pageNumber: number) {
  const query = new URLSearchParams({ pageNumber: String(pageNumber) });
  if (search.trim()) query.set('search', search.trim());
  return apiRequest<ServerResidentPage>('GET', `temporary-residents/records?${query}`, { accessToken });
}
const detail = (value: ServerResidentDetail): ServerResidentDetail => ({ ...value, data: fromServer(value.data) });
export const getServerResident = async (accessToken: string, reportId: number) =>
  detail(await apiRequest<ServerResidentDetail>('GET', `temporary-residents/reports/${reportId}`, { accessToken }));
export const getHistory = (accessToken: string, reportId: number) =>
  apiRequest<HistoryItem[]>('GET', `temporary-residents/reports/${reportId}/history`, { accessToken });
export const runWorkflow = (accessToken: string, reportId: number, action: WorkflowAction, version: number, description?: string) =>
  apiRequest<{ reportId: number; message: string }>('POST', `temporary-residents/reports/${reportId}/workflow`,
    { accessToken, body: { action, version, description: description?.trim() || null } });
export async function checkout(accessToken: string, reportId: number, clientId: string): Promise<CheckoutResult> {
  const value = await apiRequest<CheckoutResult>('POST', `temporary-residents/reports/${reportId}/checkout`, { accessToken, body: { clientId } });
  return { ...value, report: detail(value.report) };
}
export async function syncStatus(accessToken: string, clientIds: string[]): Promise<SyncStatusItem[]> {
  const result: SyncStatusItem[] = [];
  for (let i = 0; i < clientIds.length; i += 100)
    result.push(...await apiRequest<SyncStatusItem[]>('POST', 'temporary-residents/sync-status', { accessToken, body: { clientIds: clientIds.slice(i, i + 100) } }));
  return result;
}
/** `confirmed` is set only when the operator chose to overwrite the server copy shown in a conflict. */
export const syncResident = (accessToken: string, draft: ResidentDraft, confirmed: boolean) =>
  apiRequest<SyncReceipt>('POST', 'temporary-residents/sync', { accessToken, body: {
    clientId: draft.id, revision: draft.revision, knownRootReportId: draft.server?.rootReportId ?? null,
    confirmedVersion: confirmed && draft.conflict?.code === 'VERSION_CONFLICT'
      ? { reportId: draft.conflict.server.state.reportId, version: draft.conflict.server.state.version } : null,
    data: draft.data,
  } });
// The API sends dates as ISO date-times; the form schema works with plain YYYY-MM-DD values.
export function fromServer(data: ResidentData): ResidentData {
  const personal: PersonalData = {};
  for (const [key, value] of Object.entries(data.personal ?? {}) as [string, FieldValue][])
    personal[key] = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) ? value.slice(0, 10) : value;
  return { ...data, addressOtherNote: data.addressOtherNote ?? '', personal, counts: data.counts ?? {}, otherAnimals: data.otherAnimals ?? [] };
}
