export type Option = { id: number; label: string; parentId?: number | null; parentIds?: number[] | null; code?: string | null };
export type AdminUnit = Option & { countryId: number; canSelectAccount: boolean; hasStreet: boolean };
export type Street = Option & { adminUnitId: number; hasEntrance: boolean };
export type Entrance = Option & { adminUnitId: number; throughFareId: number };
export type TreeType = { id: number; parentId: number | null; label: string; isComputed: boolean; code?: string | null };

/**
 * Which admin units an address block offers, as Tbu.Web's picker does: an account address only
 * the user's areas (and the units above them, to browse through); any other address every unit of
 * its country.
 */
export type AdminScope = { account: true } | { countryId: number };

/**
 * The address register as the forms read it. On a device it is an SQLite database queried row by
 * row, so the million-odd streets and entrances are never held in memory at once.
 */
export interface AddressBook {
  /** False until the register has been downloaded to the device; the lists are then empty. */
  ready: boolean;
  adminUnit(id: unknown): AdminUnit | null;
  /** The units from the top of the tree down to `id`. */
  path(id: unknown): AdminUnit[];
  /** The units directly under `parentId` (null: the top level) within the scope, sorted by name. */
  children(parentId: number | null, scope: AdminScope): AdminUnit[];
  /** Whether a unit can be chosen in the scope; the others only lead to their children. */
  selectable(unit: AdminUnit, scope: AdminScope): boolean;
  street(id: unknown): Street | null;
  streets(adminUnitId: number): Street[];
  entrance(id: unknown): Entrance | null;
  entrances(adminUnitId: number, throughFareId: number): Entrance[];
}

const collator = new Intl.Collator('az', { numeric: true, sensitivity: 'base' });
/** Sorts in place by label as the operator reads it: Azerbaijani letters, numbers by value. */
export const byLabel = <T extends { label: string }>(items: T[]) => items.sort((a, b) => collator.compare(a.label, b.label));

/** The admin unit tree of an address book, built once from its few thousand units. */
export function adminTree(units: AdminUnit[]): Pick<AddressBook, 'adminUnit' | 'path' | 'children' | 'selectable'> {
  const byId = new Map(units.map(x => [x.id, x]));
  const parentOf = (unit: AdminUnit) => unit.parentId != null && byId.has(unit.parentId) ? unit.parentId : null;
  const kids = new Map<number | null, AdminUnit[]>();
  for (const unit of byLabel([...units])) kids.set(parentOf(unit), [...kids.get(parentOf(unit)) ?? [], unit]);
  // An account address browses through the units above the user's areas, as the web picker does.
  const accountTree = new Set<number>();
  for (const unit of units) if (unit.canSelectAccount)
    for (let id: number | null = unit.id; id != null && !accountTree.has(id); id = parentOf(byId.get(id)!)) accountTree.add(id);
  const path = (id: unknown) => {
    const result: AdminUnit[] = [];
    for (let unit = byId.get(Number(id)); unit && !result.includes(unit); unit = byId.get(parentOf(unit) ?? NaN)) result.unshift(unit);
    return result;
  };
  return {
    adminUnit: id => byId.get(Number(id)) ?? null, path,
    children: (parentId, scope) => (kids.get(parentId) ?? []).filter(x => 'account' in scope ? accountTree.has(x.id) : x.countryId === scope.countryId),
    selectable: (unit, scope) => 'account' in scope ? unit.canSelectAccount : unit.countryId === scope.countryId,
  };
}

/** `GET reference/addresses`: the row counts of the register's tables. */
export type AddressCounts = { adminUnits: number; streets: number; entrances: number; pageSize: number };
/** `GET reference/catalog`: the forms' lists both modules share, as stored on the device. */
export type ReferenceData = {
  version: 2; downloadedAt: string; reportYear: number;
  lookups: Record<string, Option[]>;
  employmentStatuses: (Option & { enablesEmploymentDetails: boolean })[];
  vehicleTypes: TreeType[]; otherEquipmentTypes: Option[]; animals: TreeType[];
  landCategories: { id: number; parentId: number | null; code: string; label: string; isComputed: boolean }[];
  /** The admin units where the user may keep accounts. */
  accountAdminUnitIds: number[];
};
/** The reference data the forms read: the stored lists and the address register, which may still be downloading. */
export type ReferenceCatalog = ReferenceData & { addresses: AddressBook };

export const validReference = (value: ReferenceData | null | undefined): value is ReferenceData => !!value && value.version === 2 &&
  !!value.lookups && typeof value.lookups === 'object' && Array.isArray(value.employmentStatuses) && Array.isArray(value.vehicleTypes) &&
  Array.isArray(value.otherEquipmentTypes) && Array.isArray(value.animals) && Array.isArray(value.landCategories) &&
  Array.isArray(value.accountAdminUnitIds);

const same = (a: unknown, b: unknown) => a != null && b != null && String(a) === String(b);
/** An address book over arrays: for tests, and for any list small enough to hold. */
export function memoryAddressBook({ adminUnits, streets = [], entrances = [] }: {
  adminUnits: AdminUnit[]; streets?: Street[]; entrances?: Entrance[];
}): AddressBook {
  return {
    ready: true, ...adminTree(adminUnits),
    street: id => streets.find(x => same(x.id, id)) ?? null,
    streets: adminUnitId => streets.filter(x => x.adminUnitId === adminUnitId),
    entrance: id => entrances.find(x => same(x.id, id)) ?? null,
    entrances: (adminUnitId, throughFareId) => entrances.filter(x => x.adminUnitId === adminUnitId && x.throughFareId === throughFareId),
  };
}

/** The register before its download: the forms show it as not yet available. */
export const noAddresses: AddressBook = { ready: false, adminUnit: () => null, path: () => [], children: () => [], selectable: () => false,
  street: () => null, streets: () => [], entrance: () => null, entrances: () => [] };
