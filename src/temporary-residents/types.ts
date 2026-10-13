import type { AddressBook, AdminUnit, Entrance, Option, ReferenceCatalog, Street } from '../reference/types';
import type { HistoryEvent } from '../history/events';

export type { AddressBook, AdminUnit, Entrance, Option, Street };
export type Animal = Option & { isComputed?: boolean };
/** The part of the reference data the address blocks read. */
export type AddressCatalog = { lookups: Record<string, Option[]>; addresses: AddressBook };
/** The part of the shared reference data the temporary resident form reads. */
export type Catalog = Pick<ReferenceCatalog, 'downloadedAt' | 'reportYear' | 'lookups' | 'employmentStatuses' | 'accountAdminUnitIds' | 'addresses' | 'locationMaxAccuracyMeters'> & { animals: Animal[] };
export type FieldValue = string | number | boolean | null;
export type PersonalData = Record<string, FieldValue>;
export type ResidentData = {
  reportYear: number;
  adminUnitId: number | null; throughFareId: number | null; entranceId: number | null;
  addressIsOther: boolean; addressOtherNote: string;
  personal: PersonalData;
  counts: Record<string, number>;
  otherAnimals: { name: string; count: number }[];
  isPersonalSectionCompleted: boolean; isAnimalsSectionCompleted: boolean;
};
/** The server's view of a report chain: the current report, its status and whether it can be edited. */
export type ReportState = {
  rootReportId: number; reportId: number; version: number;
  status: number; statusName: string; canEdit: boolean; returnReason: string | null;
};
export type OperatorActions = {
  canEdit: boolean; canDelete: boolean; canSubmitForApproval: boolean; canSubmitForApprovalWhenCompleted: boolean;
  canClose: boolean; closeRequiresDescription: boolean;
};
export type ServerResidentDetail = { accountNumber: string; address: string | null; state: ReportState; actions: OperatorActions; data: ResidentData };
/** A sync the server refused until the operator decides; `server` is the copy it was compared with. */
export type SyncConflict = { code: 'VERSION_CONFLICT' | 'REPORT_LOCKED'; message: string; server: ServerResidentDetail; at: string };
export type ResidentDraft = {
  id: string; owner: string; revision: number; data: ResidentData;
  createdAt: string; updatedAt: string;
  syncedRevision: number; syncedAt?: string;
  /** The server report this record is bound to. `version` is the one last synced or adopted. */
  server?: { rootReportId: number; reportId: number; version: number; personalAccountNumber: string; downloaded?: boolean };
  /** Last known server state; `changed` means the server moved past `server.version`. */
  status?: ReportState & { changed: boolean; checkedAt: string };
  deleted?: boolean;
  /** Set when the data was replaced from the server, so an open form reloads instead of overwriting it. */
  adoptedAt?: string;
  conflict?: SyncConflict;
  lastError?: string;
  /** Step saves not yet sent, each to become a history row on the server. */
  events?: HistoryEvent[];
};
export type SyncReceipt = { clientId: string; revision: number; personalAccountNumber: string; state: ReportState };
export type SyncStatusItem = { clientId: string; deleted: boolean; changed: boolean; state: ReportState | null };
export type CheckoutResult = { clientId: string; revision: number; report: ServerResidentDetail };
export type HistoryItem = {
  actionDate: string; action: string; previousStatus: string; newStatus: string; description: string | null; actorName: string | null;
  /** 1 web, 2 mobile, 3 integration; the rest only where the action recorded a GPS position. */
  source?: number; latitude?: number | null; longitude?: number | null; locationAccuracy?: number | null; deviceActionDate?: string | null;
};
export type WorkflowAction = 'delete' | 'submit-for-approval' | 'close';
export const pending = (draft: ResidentDraft) => draft.revision > draft.syncedRevision;
/** Editing stays open offline on the last known state; only a state known to be locked closes it. */
export const editable = (draft: ResidentDraft) => !draft.deleted && draft.status?.canEdit !== false;
export const ownerKey = (user: { id: string; executiveId: number }) => `${user.id}.${user.executiveId}`;
export const newResidentData = (year: number): ResidentData => ({
  reportYear: year, adminUnitId: null, throughFareId: null, entranceId: null,
  addressIsOther: false, addressOtherNote: '', personal: { identityDocumentSeries: 'AZE', hasNoFin: false },
  counts: {}, otherAnimals: [], isPersonalSectionCompleted: false, isAnimalsSectionCompleted: false,
});
/** Server list rows are never stored on the device; a report is stored only once checked out for editing. */
export type ServerResidentItem = {
  reportId: number; accountNumber: string; fullName: string; gender: string; birthDate: string;
  permanentResidence: string; arrival: string; workflowStatus: string;
  /** The status-chip tone Tbu.Web draws the status with. */
  workflowTone?: string;
};
export type ServerResidentPage = { items: ServerResidentItem[]; pageNumber: number; totalCount: number; totalPages: number };
