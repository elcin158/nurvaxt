import type { FieldValue, HistoryItem, Option, OperatorActions, PersonalData, ReportState, SyncStatusItem, WorkflowAction } from '../temporary-residents/types';
import type { ReferenceCatalog, TreeType } from '../reference/types';

export type { FieldValue, HistoryItem, Option, OperatorActions, PersonalData, ReportState, SyncStatusItem, TreeType, WorkflowAction };
/** The household wizard reads the whole shared reference data; steps 4-6 add the type trees and land categories. */
export type HouseholdCatalog = ReferenceCatalog;
/**
 * One member of the household. `key` names it on the device and stays the same for its whole
 * life; `id` is the server's once a sync or checkout told it. `personal` holds the member form's
 * fields under the server's names, plus the form's `membershipMovementType` choice.
 */
export type MemberData = {
  key: string; id: number | null; isHead: boolean;
  personal: PersonalData; phoneNumbers: string[]; emails: string[];
};
/** A building: the form's fields by server name, and its auxiliary buildings and devices. Decimals stay as typed. */
export type BuildingData = {
  key: string; id: number | null; fields: PersonalData;
  auxiliaries: { typeId: number | null; area: string }[]; devices: { typeId: number | null; count: string }[];
};
export type VehicleData = {
  counts: Record<string, number>; operational: Record<string, number>;
  others: { typeId: number | null; count: number; operational: number }[]; isSectionCompleted: boolean;
};
/** One land record: areas by category id, and "Torpaqdan istifadə" by category code. Values stay as typed. */
export type LandData = {
  key: string; id: number | null; areas: Record<string, string>;
  usage: Record<string, { metrics: Record<string, string>; rows: { key: string; cropTypeId: number | null; metrics: Record<string, string> }[] }>;
};
export const PRODUCTION_FIELDS = ['slaughterCattleAndBuffaloWeightKg', 'slaughterSheepAndGoatWeightKg', 'slaughterPigWeightKg',
  'slaughterPoultryWeightKg', 'cattleAndBuffaloMilkKg', 'sheepAndGoatMilkKg', 'chickenEggCount', 'otherEggCount', 'sheepWoolKg', 'silkwormCocoonKg'] as const;
export type LivestockData = { counts: Record<string, number>; production: Record<string, string>; isSectionCompleted: boolean };
/** The six steps of Tbu.Web's household wizard. */
export type HouseholdData = {
  reportYear: number;
  adminUnitId: number | null; throughFareId: number | null; entranceId: number | null;
  addressIsOther: boolean; addressOtherNote: string;
  members: MemberData[];
  isMembersSectionCompleted: boolean;
  buildings: BuildingData[]; isBuildingsSectionCompleted: boolean;
  vehicles: VehicleData;
  lands: LandData[]; isLandsSectionCompleted: boolean;
  livestock: LivestockData;
};
export type ServerHouseholdDetail = { accountNumber: string; address: string | null; state: ReportState; actions: OperatorActions; data: HouseholdData };
/** A sync the server refused until the operator decides; `server` is the copy it was compared with. */
export type SyncConflict = { code: 'VERSION_CONFLICT' | 'REPORT_LOCKED'; message: string; server: ServerHouseholdDetail; at: string };
export type HouseholdDraft = {
  id: string; owner: string; revision: number; data: HouseholdData;
  createdAt: string; updatedAt: string;
  syncedRevision: number; syncedAt?: string;
  /** The server household this record is bound to. `version` is the one last synced or adopted. */
  server?: { rootReportId: number; reportId: number; version: number; personalAccountNumber: string; downloaded?: boolean };
  /** Last known server state; `changed` means the server moved past `server.version`. */
  status?: ReportState & { changed: boolean; checkedAt: string };
  deleted?: boolean;
  /** Set when the data was replaced from the server, so an open form reloads instead of overwriting it. */
  adoptedAt?: string;
  conflict?: SyncConflict;
  lastError?: string;
};
/** `ids` gives the server id of every member, building and land the sync carried, by device key. */
export type RecordIds = { members: Record<string, number>; buildings: Record<string, number>; lands: Record<string, number> };
export type SyncReceipt = { clientId: string; revision: number; personalAccountNumber: string; state: ReportState; ids: RecordIds };
export type CheckoutResult = { clientId: string; revision: number; report: ServerHouseholdDetail };
export type IdCardResult = {
  firstName: string; lastName: string; fatherName: string; genderTypeId: number; birthDate: string | null; birthPlaceNote: string | null;
  birthCountryId: number | null; citizenshipCountryId: number | null; registrationCountryId: number | null;
};
export type ServerHouseholdItem = {
  reportId: number; accountNumber: string; owner: string; memberCount: number; adminUnit: string; reportYear: number;
  citizenDataStatus: string; householdDataStatus: string; workflowStatus: string;
  /** The status-chip tone Tbu.Web draws the status with. */
  workflowTone?: string;
};
export type ServerHouseholdPage = { items: ServerHouseholdItem[]; pageNumber: number; totalCount: number; totalPages: number };

export const pending = (draft: HouseholdDraft) => draft.revision > draft.syncedRevision;
/** Editing stays open offline on the last known state; only a state known to be locked closes it. */
export const editable = (draft: HouseholdDraft) => !draft.deleted && draft.status?.canEdit !== false;
export const newVehicles = (): VehicleData => ({ counts: {}, operational: {}, others: [], isSectionCompleted: false });
export const newLivestock = (): LivestockData => ({ counts: {}, production: {}, isSectionCompleted: false });
export const newHouseholdData = (year: number): HouseholdData => ({
  reportYear: year, adminUnitId: null, throughFareId: null, entranceId: null,
  addressIsOther: false, addressOtherNote: '', members: [], isMembersSectionCompleted: false,
  buildings: [], isBuildingsSectionCompleted: false, vehicles: newVehicles(),
  lands: [], isLandsSectionCompleted: false, livestock: newLivestock(),
});
/** A record saved before steps 3-6 existed opens with those steps empty. */
export const withAllSteps = (data: HouseholdData): HouseholdData => ({
  ...data, buildings: data.buildings ?? [], isBuildingsSectionCompleted: data.isBuildingsSectionCompleted === true,
  vehicles: data.vehicles ?? newVehicles(), lands: data.lands ?? [], isLandsSectionCompleted: data.isLandsSectionCompleted === true,
  livestock: data.livestock ?? newLivestock(),
});
export const newBuilding = (key: string): BuildingData => ({ key, id: null, fields: { isAtHouseholdAddress: true }, auxiliaries: [], devices: [] });
export const newLand = (key: string): LandData => ({ key, id: null, areas: {}, usage: {} });
export const newMember = (key: string, isHead: boolean): MemberData => ({
  key, id: null, isHead, personal: { identityDocumentSeries: 'AZE', hasNoFin: false }, phoneNumbers: [], emails: [],
});
export const memberName = (member: MemberData) =>
  [member.personal.lastName, member.personal.firstName, member.personal.fatherName].filter(Boolean).join(' ');
/** The head's name names the household, as the owner column of the web list does. */
export const householdOwner = (data: HouseholdData) => {
  const head = data.members.find(x => x.isHead);
  return head ? memberName(head) : '';
};
