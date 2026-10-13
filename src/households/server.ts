import { apiRequest } from '../auth/api';
import { eventsToServer } from '../history/events';
import type { Fix } from '../location/fix';
import { parseDecimal } from './land';
import { newLivestock, newVehicles, PRODUCTION_FIELDS, type BuildingData, type CheckoutResult, type FieldValue, type HistoryItem, type HouseholdData,
  type HouseholdDraft, type IdCardResult, type LandData, type LivestockData, type MemberData, type PersonalData, type ServerHouseholdDetail,
  type ServerHouseholdPage, type SyncReceipt, type SyncStatusItem, type VehicleData, type WorkflowAction } from './types';

export function listServerHouseholds(accessToken: string, search: string, pageNumber: number) {
  const query = new URLSearchParams({ pageNumber: String(pageNumber) });
  if (search.trim()) query.set('search', search.trim());
  return apiRequest<ServerHouseholdPage>('GET', `households/records?${query}`, { accessToken });
}
export const detail = (value: ServerHouseholdDetail): ServerHouseholdDetail => ({ ...value, data: fromServer(value.data) });
export const getServerHousehold = async (accessToken: string, reportId: number) =>
  detail(await apiRequest<ServerHouseholdDetail>('GET', `households/reports/${reportId}`, { accessToken }));
export const getHistory = (accessToken: string, reportId: number) =>
  apiRequest<HistoryItem[]>('GET', `households/reports/${reportId}/history`, { accessToken });
/** `location` is where the operator took the action; the server refuses a mobile action without one. */
export const runWorkflow = (accessToken: string, reportId: number, action: WorkflowAction, version: number, location: Fix, description?: string) =>
  apiRequest<{ reportId: number; message: string }>('POST', `households/reports/${reportId}/workflow`,
    { accessToken, body: { action, version, description: description?.trim() || null, location } });
export async function checkout(accessToken: string, reportId: number, clientId: string): Promise<CheckoutResult> {
  const value = await apiRequest<CheckoutResult>('POST', `households/reports/${reportId}/checkout`, { accessToken, body: { clientId } });
  return { ...value, report: detail(value.report) };
}
export async function syncStatus(accessToken: string, clientIds: string[]): Promise<SyncStatusItem[]> {
  const result: SyncStatusItem[] = [];
  for (let i = 0; i < clientIds.length; i += 100)
    result.push(...await apiRequest<SyncStatusItem[]>('POST', 'households/sync-status', { accessToken, body: { clientIds: clientIds.slice(i, i + 100) } }));
  return result;
}
export const searchIdCard = (accessToken: string, householdId: number | null, fin: string, series: string, number: string) =>
  apiRequest<IdCardResult>('POST', 'households/id-card-search', { accessToken, timeoutMs: 40_000,
    body: { householdId, fin: fin.trim().toUpperCase(), identityDocumentSeries: series, identityDocumentNumber: number.trim() } });
/** `confirmed` is set only when the operator chose to overwrite the server copy shown in a conflict. */
export const syncHousehold = (accessToken: string, draft: HouseholdDraft, confirmed: boolean) =>
  // Every member may be checked against the ID card register, so the request is given longer.
  apiRequest<SyncReceipt>('POST', 'households/sync', { accessToken, timeoutMs: 120_000, body: {
    clientId: draft.id, revision: draft.revision, knownRootReportId: draft.server?.rootReportId ?? null,
    confirmedVersion: confirmed && draft.conflict?.code === 'VERSION_CONFLICT'
      ? { reportId: draft.conflict.server.state.reportId, version: draft.conflict.server.state.version } : null,
    events: eventsToServer(draft.events),
    data: toServer(draft.data),
  } });

// The membership movement is one choice on the form and three flags in the step data.
const MOVEMENTS = ['temporarilyAbsent', 'leftHousehold', 'newResident'] as const;
function memberToServer(member: MemberData) {
  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(member.personal))
    if (key !== 'membershipMovementType' && value !== null && value !== undefined && value !== '') data[key] = typeof value === 'string' ? value.trim() : value;
  MOVEMENTS.forEach((name, index) => { data[name] = member.personal.membershipMovementType === index + 1; });
  data.hasNoFin = member.personal.hasNoFin === true;
  data.phoneNumbers = member.phoneNumbers.map(x => x.trim()).filter(Boolean);
  data.emails = member.emails.map(x => x.trim()).filter(Boolean);
  return { key: member.key, id: member.id, isHead: member.isHead, data };
}
// A building's address block is named "address" on the device; the step data names its last two parts without the prefix.
const BUILDING_DECIMALS = ['totalAreaSqm', 'roomsAreaSqm'];
const number = (value: unknown) => typeof value === 'number' ? value : String(value ?? '').trim() === '' ? null : parseDecimal(String(value));
function buildingToServer(building: BuildingData) {
  const data: Record<string, unknown> = { buildingId: null };
  for (const [key, value] of Object.entries(building.fields)) {
    if (value === null || value === undefined || value === '') continue;
    const name = key === 'addressAddressIsOther' ? 'addressIsOther' : key === 'addressAddressOtherNote' ? 'addressOtherNote' : key;
    data[name] = BUILDING_DECIMALS.includes(key) ? number(value) : typeof value === 'string' ? value.trim() : value;
  }
  data.isAtHouseholdAddress = building.fields.isAtHouseholdAddress !== false;
  data.isSharedOwnership = building.fields.isSharedOwnership === true;
  data.auxiliaries = building.auxiliaries.filter(x => x.typeId && x.area.trim()).map(x => ({ auxiliaryTypeId: x.typeId, areaSqm: number(x.area) }));
  data.technologyDevices = building.devices.filter(x => x.typeId && x.count.trim()).map(x => ({ technologyDeviceTypeId: x.typeId, count: Number(x.count) }));
  return { key: building.key, id: building.id, data };
}
const numbers = (values: Record<string, string>) =>
  Object.fromEntries(Object.entries(values).filter(([, v]) => String(v ?? '').trim() !== '').map(([k, v]) => [k, parseDecimal(v)]));
const landToServer = (land: LandData) => ({ key: land.key, id: land.id, data: {
  landId: null, areas: numbers(land.areas),
  landUsage: Object.entries(land.usage).map(([code, value]) => ({ code, metrics: numbers(value.metrics),
    items: value.rows.map(row => ({ rowKey: row.key, cropTypeId: row.cropTypeId, metrics: numbers(row.metrics) })) })),
} });
export const toServer = (data: HouseholdData) => ({
  ...data, members: data.members.map(memberToServer), buildings: data.buildings.map(buildingToServer), lands: data.lands.map(landToServer),
  vehicles: { isSectionCompleted: data.vehicles.isSectionCompleted, counts: data.vehicles.counts, operationalCounts: data.vehicles.operational,
    otherEquipmentItems: data.vehicles.others.filter(x => x.typeId || x.count || x.operational)
      .map(x => ({ otherEquipmentTypeId: x.typeId, count: x.count, operationalCount: x.operational })) },
  livestock: { isSectionCompleted: data.livestock.isSectionCompleted, counts: data.livestock.counts,
    production: Object.fromEntries(PRODUCTION_FIELDS.map(name => [name, parseDecimal(data.livestock.production[name] ?? '') || 0])) },
});

type ServerSteps = {
  buildings?: { key: string; id: number | null; data: Record<string, unknown> }[];
  lands?: { key: string; id: number | null; data: { areas: Record<string, number>; landUsage: { code: string; metrics: Record<string, number>; items: { rowKey: string; cropTypeId: number | null; metrics: Record<string, number> }[] }[] } }[];
  vehicles?: { isSectionCompleted: boolean; counts: Record<string, number>; operationalCounts: Record<string, number>; otherEquipmentItems: { otherEquipmentTypeId: number | null; count: number; operationalCount: number }[] };
  livestock?: { isSectionCompleted: boolean; counts: Record<string, number>; production: Record<string, number> | null };
};
const strings = (values: Record<string, number> | null | undefined) => Object.fromEntries(Object.entries(values ?? {}).map(([k, v]) => [k, String(v)]));
function buildingFromServer(item: NonNullable<ServerSteps['buildings']>[number]): BuildingData {
  const fields: PersonalData = {};
  for (const [key, value] of Object.entries(item.data)) {
    if (['buildingId', 'auxiliaries', 'technologyDevices'].includes(key) || value === null || value === undefined) continue;
    const name = key === 'addressIsOther' ? 'addressAddressIsOther' : key === 'addressOtherNote' ? 'addressAddressOtherNote' : key;
    fields[name] = BUILDING_DECIMALS.includes(key) ? String(value) : value as FieldValue;
  }
  const auxiliaries = (item.data.auxiliaries as { auxiliaryTypeId: number; areaSqm: number | null }[] | undefined) ?? [];
  const devices = (item.data.technologyDevices as { technologyDeviceTypeId: number; count: number | null }[] | undefined) ?? [];
  return { key: item.key, id: item.id ?? null, fields,
    auxiliaries: auxiliaries.map(x => ({ typeId: x.auxiliaryTypeId, area: x.areaSqm == null ? '' : String(x.areaSqm) })),
    devices: devices.map(x => ({ typeId: x.technologyDeviceTypeId, count: x.count == null ? '' : String(x.count) })) };
}
/** Steps 3-6 as the device keeps them; a copy already in that shape is returned as it is. */
function stepsFromServer(raw: unknown): Partial<HouseholdData> {
  const data = raw as ServerSteps;
  const vehicles = data.vehicles as ServerSteps['vehicles'] & Partial<VehicleData>;
  const livestock = data.livestock as ServerSteps['livestock'] & Partial<LivestockData>;
  return {
    buildings: (data.buildings ?? []).map(item => 'fields' in item ? item as unknown as BuildingData : buildingFromServer(item)),
    lands: (data.lands ?? []).map((item): LandData => 'areas' in item ? item as unknown as LandData : {
      key: item.key, id: item.id ?? null, areas: strings(item.data.areas),
      usage: Object.fromEntries((item.data.landUsage ?? []).map(c => [c.code, { metrics: strings(c.metrics),
        rows: (c.items ?? []).map(r => ({ key: r.rowKey, cropTypeId: r.cropTypeId ?? null, metrics: strings(r.metrics) })) }])),
    }),
    vehicles: !vehicles ? newVehicles() : 'operational' in vehicles ? vehicles as VehicleData : {
      isSectionCompleted: vehicles.isSectionCompleted === true, counts: vehicles.counts ?? {}, operational: vehicles.operationalCounts ?? {},
      others: (vehicles.otherEquipmentItems ?? []).map(x => ({ typeId: x.otherEquipmentTypeId, count: x.count, operational: x.operationalCount })),
    },
    livestock: !livestock ? newLivestock() : { isSectionCompleted: livestock.isSectionCompleted === true, counts: livestock.counts ?? {},
      production: Object.fromEntries(Object.entries(livestock.production ?? {}).filter(([, v]) => v !== null && v !== undefined && String(v) !== '0' && v !== '')
        .map(([k, v]) => [k, String(v)])) },
  };
}

// The API sends dates as ISO date-times and the step data's movement flags; the form works with
// plain YYYY-MM-DD values and one movement choice. Empty values are dropped, as the form stores them.
export function fromServer(data: HouseholdData): HouseholdData {
  const members = (data.members ?? []).map((member): MemberData => {
    const raw = (member as unknown as { data?: Record<string, unknown> }).data ?? member.personal ?? {};
    const personal: PersonalData = {};
    let phoneNumbers: string[] = [], emails: string[] = [];
    for (const [key, value] of Object.entries(raw)) {
      if (key === 'phoneNumbers') { phoneNumbers = (value as string[] | null) ?? []; continue; }
      if (key === 'emails') { emails = (value as string[] | null) ?? []; continue; }
      if ((MOVEMENTS as readonly string[]).includes(key) || value === null || value === undefined) continue;
      personal[key] = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) ? value.slice(0, 10) : value as FieldValue;
    }
    const movement = MOVEMENTS.findIndex(name => raw[name] === true);
    if (movement >= 0) personal.membershipMovementType = movement + 1;
    personal.hasNoFin = raw.hasNoFin === true;
    return { key: member.key, id: member.id ?? null, isHead: member.isHead === true, personal,
      phoneNumbers: member.phoneNumbers ?? phoneNumbers, emails: member.emails ?? emails };
  });
  return { ...data, addressIsOther: data.addressIsOther === true, addressOtherNote: data.addressOtherNote ?? '', members,
    isMembersSectionCompleted: data.isMembersSectionCompleted === true, ...stepsFromServer(data),
    isBuildingsSectionCompleted: data.isBuildingsSectionCompleted === true, isLandsSectionCompleted: data.isLandsSectionCompleted === true };
}
