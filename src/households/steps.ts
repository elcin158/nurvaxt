import { validateAddress } from '../temporary-residents/schema';
import { LAND, MAX_AREA, METRIC_PARTS, USAGE, calculateLand, parseDecimal, takesDirectValues, usageTotals, type UsageEntry } from './land';
import { relationshipsComplete, validateAccountAndMembers, visible, type Errors, type Field } from './schema';
import { PRODUCTION_FIELDS, type BuildingData, type HouseholdCatalog, type HouseholdData, type LandData, type LivestockData,
  type PersonalData, type VehicleData } from './types';

export const STEPS = ['Şəxsi hesab', 'Üzvlərin siyahısı', 'Tikililər', 'Avtonəqliyyat və texnikalar', 'Torpaqlar', 'Heyvanlar'];
const code = (catalog: HouseholdCatalog, lookup: string, id: unknown) => catalog.lookups[lookup]?.find(x => x.id === id)?.code?.toUpperCase();
const select = (name: string, label: string, lookup: string, required = false): Field => ({ name, label, kind: 'select', lookup, required });
const yesNo = (name: string, label: string, required = false): Field => ({ name, label, kind: 'boolean', required });

// Tbu.Web's building form (FarmsController.BuildingSections) and the conditions evtas.js applies to it.
// The address block is named "address": its parts are addressAdminUnitId, addressThroughFareId,
// addressEntranceId, addressAddressIsOther and addressAddressOtherNote on the device.
export const buildingSections: { title: string; fields: Field[] }[] = [
  { title: 'Tikili haqqında məlumatlar', fields: [
    { ...yesNo('isAtHouseholdAddress', 'Təsərrüfat ünvanında yerləşir', true), full: true },
    { name: 'address', label: 'Tikili ünvanı', kind: 'address', full: true, domestic: true, required: true, when: d => d.isAtHouseholdAddress === false },
    select('dwellingType', 'Tikilinin növü', 'buildingDwelling', true),
    { name: 'otherBuildingNote', label: 'Digər tikili üzrə qeyd', maxLength: 500, when: (d, c) => code(c, 'buildingDwelling', d.dwellingType) === 'OTHER' },
    { name: 'constructionYear', label: 'Tikildiyi il', kind: 'year', required: true },
    { name: 'totalAreaSqm', label: 'Ümumi sahəsi (kv. metr)', kind: 'decimal', required: true },
    { name: 'roomCount', label: 'Otaqların sayı', kind: 'integer', required: true },
    { name: 'roomsAreaSqm', label: 'Otaqların sahəsi (kv. metr)', kind: 'decimal', required: true },
    { name: 'floorCount', label: 'Mərtəbələrin sayı', kind: 'integer', required: true },
    yesNo('hasElevator', 'Liftlə təminat mövcuddur'),
    select('housingFundType', 'Aid olduğu mənzil fondu', 'buildingHousingFund'),
    { ...select('purposeType', 'Təyinatı', 'buildingPurpose'), when: (d, c) => code(c, 'buildingDwelling', d.dwellingType) === 'HOUSE'
      && ['STATE', 'MUNICIPAL'].includes(code(c, 'buildingHousingFund', d.housingFundType) ?? '') },
    yesNo('isSharedOwnership', 'Şərikli mülkiyyətdədir', true),
    { name: 'sharedOwnershipPersonalAccountNumber', label: 'Digər həmsahiblərin şəxsi hesab №-si', maxLength: 50, when: d => d.isSharedOwnership === true },
  ] },
  { title: 'Mənzil-məişət şəraiti', fields: [
    select('waterSupplyTypeId', 'Su təchizatı', 'buildingSupply'), select('hotWaterSupplyTypeId', 'İsti su təchizatı', 'buildingSupply'),
    select('heatingSystemTypeId', 'İstilik sistemi', 'buildingSupply'), select('gasSupplyTypeId', 'Qaz təchizatı', 'buildingSupply'),
    yesNo('hasSanitaryFacility', 'Sanitar qovşağı var'), yesNo('hasSewerage', 'Kanalizasiya xətti var'),
    yesNo('hasBathOrShower', 'Vanna və ya duş var'), yesNo('hasLandline', 'Stasionar telefon var'),
    { ...select('internetTypeId', 'İnternet', 'buildingInternet'), full: true },
  ] },
];
const buildingFields = buildingSections.flatMap(x => x.fields);
const ADDRESS_PARTS = ['AdminUnitId', 'ThroughFareId', 'EntranceId', 'AddressIsOther', 'AddressOtherNote'];

/** Sets one building field and clears what the change hides, as the web form does. */
export function updateBuilding(fields: PersonalData, name: string, value: PersonalData[string], catalog: HouseholdCatalog): PersonalData {
  const next: PersonalData = { ...fields, [name]: value };
  for (const field of buildingFields) {
    if (visible(field, next, catalog)) continue;
    if (field.kind === 'address') for (const part of ADDRESS_PARTS) next[`${field.name}${part}`] = null;
    else next[field.name] = null;
  }
  return next;
}

const blank = (value: unknown) => value === null || value === undefined || String(value).trim() === '';
function number(errors: Errors, name: string, label: string, value: unknown, integer: boolean, required: boolean, max = MAX_AREA) {
  if (blank(value)) { if (required) errors[name] = `${label} daxil edilməlidir.`; return; }
  const parsed = parseDecimal(value as string);
  if (Number.isNaN(parsed) || parsed < 0) errors[name] = `${label} mənfi olmayan ədəd olmalıdır.`;
  else if (integer && !Number.isInteger(parsed)) errors[name] = `${label} tam ədəd olmalıdır.`;
  else if (parsed > max) errors[name] = `${label} çox böyükdür.`;
}

export function validateBuilding(building: BuildingData, catalog: HouseholdCatalog): Errors {
  const errors: Errors = {}, f = building.fields, year = new Date().getFullYear();
  for (const field of buildingFields) {
    if (!visible(field, f, catalog)) continue;
    const value = f[field.name];
    if (field.kind === 'address') {
      if (!f.addressAdminUnitId) errors.addressAdminUnitId = 'Tikili ünvanı (inzibati ərazi) seçilməlidir.';
      validateAddress('address', f, catalog, errors, true);
    } else if (field.kind === 'decimal' || field.kind === 'integer') number(errors, field.name, field.label, value, field.kind === 'integer', !!field.required, field.kind === 'integer' ? 2147483647 : MAX_AREA);
    else if (field.required && blank(value)) errors[field.name] = `${field.label} daxil edilməlidir.`;
    else if (field.maxLength && typeof value === 'string' && value.trim().length > field.maxLength) errors[field.name] = `${field.label} ${field.maxLength} simvoldan çox ola bilməz.`;
  }
  if (!blank(f.constructionYear) && (Number(f.constructionYear) < 1000 || Number(f.constructionYear) > year)) errors.constructionYear = 'Tikildiyi il düzgün daxil edilməlidir.';
  if (f.isSharedOwnership === true && !blank(f.sharedOwnershipPersonalAccountNumber) && !/^\d+$/.test(String(f.sharedOwnershipPersonalAccountNumber).trim()))
    errors.sharedOwnershipPersonalAccountNumber = 'Şəxsi hesab nömrəsi yalnız rəqəmlərdən ibarət olmalıdır.';
  const auxiliaries = building.auxiliaries.filter(x => !blank(x.area) || x.typeId);
  if (auxiliaries.some(x => !x.typeId || blank(x.area) || Number.isNaN(parseDecimal(x.area)) || parseDecimal(x.area) < 0 || parseDecimal(x.area) > MAX_AREA))
    errors.auxiliaries = 'Yardımçı tikilinin növünü və sahəsini düzgün daxil edin.';
  else if (new Set(auxiliaries.map(x => x.typeId)).size !== auxiliaries.length) errors.auxiliaries = 'Eyni yardımçı tikili növü təkrar seçilib.';
  const devices = building.devices.filter(x => !blank(x.count) || x.typeId);
  if (devices.some(x => !x.typeId || !/^\d+$/.test(String(x.count).trim())))
    errors.devices = 'Texnoloji cihazın növünü və sayını düzgün daxil edin.';
  else if (new Set(devices.map(x => x.typeId)).size !== devices.length) errors.devices = 'Eyni texnoloji cihaz növü təkrar seçilib.';
  return errors;
}

export function validateVehicles(vehicles: VehicleData, catalog: HouseholdCatalog): Errors {
  const errors: Errors = {};
  for (const type of catalog.vehicleTypes) {
    if (type.isComputed) continue;
    if ((vehicles.operational[type.id] ?? 0) > (vehicles.counts[type.id] ?? 0))
      errors[`vehicle:${type.id}`] = `${type.label}: saz vəziyyətdə olanların sayı ümumi saydan böyük ola bilməz.`;
  }
  const others = vehicles.others.filter(x => x.typeId || x.count || x.operational);
  if (others.some(x => !x.typeId)) errors.others = 'Digər texnikanın növü seçilməlidir.';
  else if (others.some(x => x.operational > x.count)) errors.others = 'Saz vəziyyətdə olanların sayı ümumi saydan böyük ola bilməz.';
  else if (new Set(others.map(x => x.typeId)).size !== others.length) errors.others = 'Eyni digər texnika növü bir dəfədən artıq seçilə bilməz.';
  return errors;
}

/** The computed vehicle totals: the tractor total is the sum of its children. */
export function vehicleTotal(vehicles: VehicleData, catalog: HouseholdCatalog, id: number, operational: boolean): number {
  const values = operational ? vehicles.operational : vehicles.counts;
  const type = catalog.vehicleTypes.find(x => x.id === id);
  if (!type?.isComputed) return values[id] ?? 0;
  return catalog.vehicleTypes.filter(x => x.parentId === id).reduce((sum, child) => sum + (values[child.id] ?? 0), 0);
}

/** A typed-in "ondan" count is part of its parent and may not exceed it, as the server checks. */
export function validateLivestock(livestock: LivestockData, catalog: HouseholdCatalog): Errors {
  const errors: Errors = {}, types = catalog.animals, byId = new Map(types.map(x => [x.id, x]));
  const parents = new Set(types.filter(x => x.parentId != null).map(x => x.parentId));
  for (const part of types) {
    const parent = part.parentId != null ? byId.get(part.parentId) : undefined;
    const herd = parent?.parentId != null ? byId.get(parent.parentId) : undefined;
    if (parents.has(part.id) || !parent || parent.isComputed || !herd || herd.parentId == null) continue;
    if ((livestock.counts[part.id] ?? 0) > (livestock.counts[parent.id] ?? 0))
      errors[`animal:${part.id}`] = `${part.label.replace(/:$/, '')}: ondan olanların sayı ümumi saydan çox ola bilməz.`;
  }
  for (const name of PRODUCTION_FIELDS) number(errors, name, 'İstehsal', livestock.production[name], name.endsWith('Count'), false,
    name.endsWith('Count') ? 2147483647 : MAX_AREA);
  return errors;
}

/** The land's usage entries, as the calculator reads them. */
export function usageEntries(land: LandData): UsageEntry[] {
  const numbers = (values: Record<string, string>) => Object.fromEntries(Object.entries(values).map(([k, v]) => [k, parseDecimal(v) || 0]));
  return Object.entries(land.usage).flatMap(([code, value]) => [{ code, metrics: numbers(value.metrics) }, ...value.rows.map(row => ({ code, metrics: numbers(row.metrics) }))]);
}
/** The calculated totals of one land record: the categories by code, as the server computes them. */
export function landCalculation(land: LandData, catalog: HouseholdCatalog) {
  const byCode: Record<string, number> = {};
  for (const category of catalog.landCategories) {
    const value = land.areas[category.id];
    if (value !== undefined && !category.isComputed) byCode[category.code] = parseDecimal(value) || 0;
  }
  const usage = usageTotals(usageEntries(land));
  return { ...calculateLand(byCode, usage), usage };
}

export function validateLand(land: LandData, catalog: HouseholdCatalog): Errors {
  const errors: Errors = {};
  for (const [id, value] of Object.entries(land.areas)) {
    const parsed = parseDecimal(value);
    if (Number.isNaN(parsed) || parsed < 0 || parsed > MAX_AREA) errors[`area:${id}`] = `${catalog.landCategories.find(x => String(x.id) === id)?.label ?? 'Sahə'}: dəyəri düzgün daxil edin.`;
  }
  for (const category of USAGE) {
    const entry = land.usage[category.code];
    if (!entry) continue;
    const check = (metrics: Record<string, string>, label: string) => {
      for (const value of Object.values(metrics)) {
        const parsed = parseDecimal(value);
        if (Number.isNaN(parsed) || parsed < 0 || parsed > MAX_AREA) { errors[`usage:${category.code}`] = `${label}: dəyəri düzgün daxil edin.`; return; }
      }
      for (const part of METRIC_PARTS)
        if (category.metrics.includes(part.metric) && category.metrics.includes(part.whole) && (parseDecimal(metrics[part.metric]) || 0) > (parseDecimal(metrics[part.whole]) || 0))
          errors[`usage:${category.code}`] = `${label}: ${part.message}`;
    };
    if (takesDirectValues(category)) check(entry.metrics, category.label);
    entry.rows.forEach(row => check(row.metrics, category.label));
  }
  if (Object.keys(errors).length) return errors;
  const result = landCalculation(land, catalog);
  if (result.farmTotal < 0) errors.farmTotal = 'Başqasına icarəyə (istifadəyə) verilmiş torpaq mövcud torpaq sahələrinin cəmindən çox ola bilməz. Təsərrüfat üzrə cəm mənfi olmamalıdır.';
  if (result.irrigationMethodsTotal !== result.irrigatedTotal) errors.irrigation = 'Suvarma üsulları üzrə cəm faktiki suvarılan torpaqların cəminə bərabər olmalıdır.';
  if (result.usageTotal !== result.farmTotal) errors.usage = 'Torpaqdan istifadə üzrə cəm təsərrüfat üzrə cəmə bərabər olmalıdır.';
  return errors;
}
export const landTotal = (land: LandData, catalog: HouseholdCatalog) => landCalculation(land, catalog).values[LAND.grandTotal] ?? 0;

/** Steps 2-5 have content the server would have to save. */
const laterSteps = (data: HouseholdData) => data.buildings.length > 0 || data.lands.length > 0 || data.isBuildingsSectionCompleted || data.isLandsSectionCompleted
  || data.vehicles.isSectionCompleted || data.vehicles.others.length > 0 || Object.values(data.vehicles.counts).some(Boolean)
  || data.livestock.isSectionCompleted || Object.values(data.livestock.counts).some(Boolean) || Object.values(data.livestock.production).some(x => !!parseDecimal(x));

/** Every step's blocking errors; records' errors are keyed by their device key. */
export function validate(data: HouseholdData, catalog: HouseholdCatalog, step?: number): Errors {
  const errors: Errors = {};
  const add = (value: Errors) => Object.assign(errors, value);
  if (step === undefined || step === 0) add(validateAccountAndMembers(data, catalog, 0));
  if (step === undefined || step === 1) {
    add(validateAccountAndMembers(data, catalog, 1));
    if (!relationshipsComplete(data) && laterSteps(data))
      errors.relationships = 'Növbəti bölmələri göndərmək üçün başçını təyin edin və bütün üzvlərin qohumluq əlaqəsini seçin.';
  }
  if (step === undefined || step === 2) data.buildings.forEach((b, i) => {
    const first = Object.values(validateBuilding(b, catalog))[0];
    if (first) errors[`building:${b.key}`] = `Tikili ${i + 1}: ${first}`;
  });
  if (step === undefined || step === 3) add(validateVehicles(data.vehicles, catalog));
  if (step === undefined || step === 4) data.lands.forEach((l, i) => {
    const first = Object.values(validateLand(l, catalog))[0];
    if (first) errors[`land:${l.key}`] = `Torpaq ${i + 1}: ${first}`;
  });
  if (step === undefined || step === 5) add(validateLivestock(data.livestock, catalog));
  return errors;
}
/** The first form step that blocks syncing, with its errors; null when the record can be sent. */
export function firstIssue(data: HouseholdData, catalog: HouseholdCatalog): { step: number; errors: Errors } | null {
  for (let step = 0; step < STEPS.length; step++) {
    const errors = validate(data, catalog, step);
    if (Object.keys(errors).length) return { step, errors };
  }
  return null;
}
