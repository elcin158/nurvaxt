export type Option = { id: number; label: string; parentId?: number | null; parentIds?: number[] | null; code?: string | null };
/** `settlementId` is known for the user's own areas only (those with `canSelectAccount`). */
export type AdminUnit = Option & { countryId: number; canSelectAccount: boolean; hasStreet: boolean; settlementId?: number | null };
export type Street = Option & { adminUnitId: number; hasEntrance: boolean };
export type Entrance = Option & { adminUnitId: number; throughFareId: number };
export type TreeType = { id: number; parentId: number | null; label: string; isComputed: boolean; code?: string | null };

/**
 * Which admin units an address block offers, as Tbu.Web's picker does: an account address only
 * the user's areas (and the units above them, to browse through); any other address every unit of
 * its country. A record past "Formed" keeps its settlement: `settlementId` then limits the account
 * address to the user's areas of that settlement (0 when it is not one of theirs: none).
 */
export type AdminScope = { account: true; settlementId?: number } | { countryId: number };

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
  // An account address browses through the units above the user's areas, as the web picker does;
  // one tree per settlement a record is held to, built when first asked for.
  const ownArea = (unit: AdminUnit, settlementId?: number) => unit.canSelectAccount && (settlementId == null || unit.settlementId === settlementId);
  const trees = new Map<number | undefined, Set<number>>();
  const accountTree = (settlementId?: number) => {
    let tree = trees.get(settlementId);
    if (tree) return tree;
    tree = new Set<number>();
    for (const unit of units) if (ownArea(unit, settlementId))
      for (let id: number | null = unit.id; id != null && !tree.has(id); id = parentOf(byId.get(id)!)) tree.add(id);
    trees.set(settlementId, tree);
    return tree;
  };
  const path = (id: unknown) => {
    const result: AdminUnit[] = [];
    for (let unit = byId.get(Number(id)); unit && !result.includes(unit); unit = byId.get(parentOf(unit) ?? NaN)) result.unshift(unit);
    return result;
  };
  return {
    adminUnit: id => byId.get(Number(id)) ?? null, path,
    children: (parentId, scope) => (kids.get(parentId) ?? []).filter(x => 'account' in scope ? accountTree(scope.settlementId).has(x.id) : x.countryId === scope.countryId),
    selectable: (unit, scope) => 'account' in scope ? ownArea(unit, scope.settlementId) : unit.countryId === scope.countryId,
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
  /** The settlement of each of those units, by unit id; absent from a catalogue downloaded before it existed. */
  accountAdminUnitSettlements?: Record<string, number>;
  /** The GPS error radius the server accepts, in metres; a catalogue downloaded before it existed falls back to 50. */
  locationMaxAccuracyMeters?: number;
};
/** The reference data the forms read: the stored lists and the address register, which may still be downloading. */
export type ReferenceCatalog = ReferenceData & { addresses: AddressBook };

export const validReference = (value: ReferenceData | null | undefined): value is ReferenceData => !!value && value.version === 2 &&
  !!value.lookups && typeof value.lookups === 'object' && Array.isArray(value.employmentStatuses) && Array.isArray(value.vehicleTypes) &&
  Array.isArray(value.otherEquipmentTypes) && Array.isArray(value.animals) && Array.isArray(value.landCategories) &&
  Array.isArray(value.accountAdminUnitIds);

/** The user's account areas with their settlements (null where the catalogue predates them). */
export const accountAreas = (data: Pick<ReferenceData, 'accountAdminUnitIds' | 'accountAdminUnitSettlements'>) => data.accountAdminUnitSettlements
  ? new Map(Object.entries(data.accountAdminUnitSettlements).map(([id, settlementId]) => [Number(id), settlementId as number | null]))
  : new Map(data.accountAdminUnitIds.map(id => [id, null as number | null]));

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
