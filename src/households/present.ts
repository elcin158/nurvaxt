import { addressText } from '../temporary-residents/present';
import { animalCount } from '../temporary-residents/schema';
import { LAND, METRIC_LABELS, USAGE, parseDecimal, round } from './land';
import { fieldOptions, isAzerbaijan, sections, visible, type Field } from './schema';
import { buildingSections, landCalculation, vehicleTotal } from './steps';
import { PRODUCTION_FIELDS, memberName, type BuildingData, type HouseholdCatalog, type HouseholdData, type LandData, type MemberData, type PersonalData } from './types';

// Turns stored ids and flags into the labels the operator reads. Shared by the read-only
// views and the conflict comparison, so both show a value the same way.
const same = (a: unknown, b: unknown) => a != null && b != null && String(a) === String(b);
export const accountAddress = (data: HouseholdData, catalog: HouseholdCatalog) => addressText('', data as unknown as PersonalData, catalog);
export function display(field: Field, data: PersonalData, catalog: HouseholdCatalog): string {
  const value = data[field.name];
  if (field.kind === 'address') return addressText(field.name, data, catalog);
  if (field.kind === 'boolean') return value === true ? 'Bəli' : value === false ? 'Xeyr' : '';
  if (field.kind === 'date') return typeof value === 'string' ? value.split('-').reverse().join('.') : '';
  if (field.kind === 'select') {
    if (field.byLabel) return value == null ? '' : String(value);
    // A dependent list is read unfiltered, so a saved value still shows after its parent changed.
    const items = field.parent ? catalog.lookups[field.lookup ?? ''] ?? [] : fieldOptions(field, data, catalog);
    return items.find(x => same(x.id, value))?.label ?? '';
  }
  return value == null ? '' : String(value).trim();
}
/** The fields the form shows for this member, in form order. */
export const visibleFields = (personal: PersonalData, catalog: HouseholdCatalog) =>
  sections.map(section => ({ title: section.title, fields: section.fields.filter(field =>
    visible(field, personal, catalog) && (field.kind !== 'address' || isAzerbaijan(field, personal, catalog))) }));
export const fieldLabel = (field: Field) => field.kind === 'address' ? `${field.label} (ünvan)` : field.label;
export const relationship = (member: MemberData, catalog: HouseholdCatalog) => member.isHead ? 'Təsərrüfat başçısı'
  : catalog.lookups.relationship?.find(x => same(x.id, member.personal.householdRelationshipTypeId))?.label ?? '';

export type Difference = { section: string; label: string; local: string; server: string };
/** Whole-record comparison shown before the operator overwrites or adopts the server copy. */
export function diffHousehold(local: HouseholdData, server: HouseholdData, catalog: HouseholdCatalog): Difference[] {
  const result: Difference[] = [];
  const add = (section: string, label: string, a: string, b: string) => { if ((a || '') !== (b || '')) result.push({ section, label, local: a, server: b }); };
  const yesNo = (value: boolean) => value ? 'Bəli' : 'Xeyr';
  add('Şəxsi hesab', 'Ünvan', accountAddress(local, catalog), accountAddress(server, catalog));
  // Members are matched by server id, then by device key; one present on one side only is added or removed.
  const match = (member: MemberData, list: MemberData[]) =>
    list.find(x => member.id != null && x.id === member.id) ?? list.find(x => x.key === member.key);
  for (const member of local.members) {
    const other = match(member, server.members), name = memberName(member) || 'Yeni üzv';
    if (!other) { add('Üzvlər', name, 'Əlavə edilib', '—'); continue; }
    add(name, 'Qohumluq əlaqəsi', relationship(member, catalog), relationship(other, catalog));
    const mine = visibleFields(member.personal, catalog), theirs = visibleFields(other.personal, catalog);
    mine.forEach((section, index) => {
      const fields = [...section.fields, ...theirs[index].fields.filter(f => !section.fields.includes(f))];
      for (const field of fields) add(name, fieldLabel(field), display(field, member.personal, catalog), display(field, other.personal, catalog));
    });
    add(name, 'Əlaqə telefonu', member.phoneNumbers.join(', '), other.phoneNumbers.join(', '));
    add(name, 'Elektron poçt ünvanı', member.emails.join(', '), other.emails.join(', '));
  }
  for (const member of server.members)
    if (!match(member, local.members)) add('Üzvlər', memberName(member) || 'Üzv', '—', 'Serverdə var');
  add('Üzvlərin siyahısı', 'Bölmə tamamlanıb', yesNo(local.isMembersSectionCompleted), yesNo(server.isMembersSectionCompleted));
  // Buildings and lands are matched like members; each is compared line by line as the view shows it.
  const records = <T extends { key: string; id: number | null }>(section: string, mine: T[], theirs: T[], name: string, lines: (item: T) => Line[]) => {
    const find = (item: T, list: T[]) => list.find(x => item.id != null && x.id === item.id) ?? list.find(x => x.key === item.key);
    mine.forEach((item, index) => {
      const other = find(item, theirs), title = `${name} ${index + 1}`;
      if (!other) { add(section, title, 'Əlavə edilib', '—'); return; }
      compareLines(`${section} · ${title}`, lines(item), lines(other), add);
    });
    theirs.filter(item => !find(item, mine)).forEach(() => add(section, name, '—', 'Serverdə var'));
  };
  records('Tikililər', local.buildings, server.buildings, 'Tikili', b => buildingLines(b, catalog));
  add('Tikililər', 'Bölmə tamamlanıb', yesNo(local.isBuildingsSectionCompleted), yesNo(server.isBuildingsSectionCompleted));
  compareLines('Avtonəqliyyat və texnikalar', vehicleLines(local, catalog), vehicleLines(server, catalog), add);
  records('Torpaqlar', local.lands, server.lands, 'Torpaq', l => landLines(l, catalog));
  add('Torpaqlar', 'Bölmə tamamlanıb', yesNo(local.isLandsSectionCompleted), yesNo(server.isLandsSectionCompleted));
  compareLines('Heyvanlar', livestockLines(local, catalog), livestockLines(server, catalog), add);
  return result;
}

/** A label and its value as the read-only view shows them; empty values are left out. */
export type Line = { label: string; value: string };
function compareLines(section: string, mine: Line[], theirs: Line[], add: (section: string, label: string, a: string, b: string) => void) {
  const labels = [...new Set([...mine, ...theirs].map(x => x.label))];
  for (const label of labels) add(section, label, mine.find(x => x.label === label)?.value ?? '', theirs.find(x => x.label === label)?.value ?? '');
}
const label = (catalog: HouseholdCatalog, lookup: string, id: unknown) => catalog.lookups[lookup]?.find(x => same(x.id, id))?.label ?? '';
export function buildingLines(building: BuildingData, catalog: HouseholdCatalog): Line[] {
  const lines = buildingSections.flatMap(section => section.fields.filter(field => visible(field, building.fields, catalog))
    .map(field => ({ label: fieldLabel(field), value: display(field, building.fields, catalog) })));
  building.auxiliaries.filter(x => x.typeId).forEach(x => lines.push({ label: `Yardımçı tikili: ${label(catalog, 'buildingAuxiliary', x.typeId)}`, value: `${x.area} kv. m` }));
  building.devices.filter(x => x.typeId).forEach(x => lines.push({ label: `Texnoloji cihaz: ${label(catalog, 'buildingTechnologyDevice', x.typeId)}`, value: x.count }));
  return lines.filter(x => x.value);
}
export function vehicleLines(data: HouseholdData, catalog: HouseholdCatalog): Line[] {
  const lines = catalog.vehicleTypes.map(type => {
    const count = vehicleTotal(data.vehicles, catalog, type.id, false), operational = vehicleTotal(data.vehicles, catalog, type.id, true);
    return { label: type.label, value: count || operational ? `${count} (saz: ${operational})` : '' };
  });
  data.vehicles.others.filter(x => x.typeId).forEach(x => lines.push({
    label: catalog.otherEquipmentTypes.find(t => t.id === x.typeId)?.label ?? 'Digər texnika', value: `${x.count} (saz: ${x.operational})` }));
  lines.push({ label: 'Bölmə tamamlanıb', value: data.vehicles.isSectionCompleted ? 'Bəli' : 'Xeyr' });
  return lines.filter(x => x.value);
}
export function landLines(land: LandData, catalog: HouseholdCatalog): Line[] {
  const result = landCalculation(land, catalog), usageCodes = new Set(USAGE.map(x => x.code));
  const lines: Line[] = catalog.landCategories.filter(x => !usageCodes.has(x.code)).map(category => {
    const value = category.isComputed ? result.values[category.code] ?? 0 : parseDecimal(land.areas[category.id] ?? '') || 0;
    return { label: `${category.code}. ${category.label}`, value: value ? `${round(value)} ha` : '' };
  });
  for (const category of USAGE) {
    const total = result.usage[category.code] ?? {};
    const values = category.metrics.filter(m => total[m]).map(m => `${METRIC_LABELS[m]}: ${total[m]}`).join(', ');
    lines.push({ label: `${category.code}. ${category.label}`, value: values });
    (land.usage[category.code]?.rows ?? []).forEach((row, index) => lines.push({
      label: `${category.code}. ${label(catalog, 'landCropType', row.cropTypeId) || `Sətir ${index + 1}`}`,
      value: category.metrics.filter(m => parseDecimal(row.metrics[m] ?? '')).map(m => `${METRIC_LABELS[m]}: ${row.metrics[m]}`).join(', ') }));
  }
  lines.push({ label: 'Cəmi', value: `${round(result.values[LAND.grandTotal] ?? 0)} ha` });
  return lines.filter(x => x.value);
}
const PRODUCTION_LABELS: Record<string, string> = {
  slaughterCattleAndBuffaloWeightKg: '8.1 Kəsim: inək və camış (kq)', slaughterSheepAndGoatWeightKg: '8.1 Kəsim: qoyun və keçi (kq)',
  slaughterPigWeightKg: '8.1 Kəsim: donuz (kq)', slaughterPoultryWeightKg: '8.1 Kəsim: quş (kq)', cattleAndBuffaloMilkKg: '8.2 İnək və camış südü (kq)',
  sheepAndGoatMilkKg: '8.2 Qoyun və keçi südü (kq)', chickenEggCount: '8.3 Toyuq yumurtası (ədəd)', otherEggCount: '8.3 Digər yumurta (ədəd)',
  sheepWoolKg: '8.4 Qoyun yunu (kq)', silkwormCocoonKg: '8.5 Barama (kq)',
};
export function livestockLines(data: HouseholdData, catalog: HouseholdCatalog): Line[] {
  const lines = catalog.animals.map(type => {
    const children = catalog.animals.some(x => x.parentId === type.id);
    const value = children ? animalCount(type.id, catalog, data.livestock.counts) : data.livestock.counts[type.id] ?? 0;
    return { label: type.label.replace(/:$/, ''), value: value ? String(value) : '' };
  });
  PRODUCTION_FIELDS.forEach(name => lines.push({ label: PRODUCTION_LABELS[name], value: parseDecimal(data.livestock.production[name] ?? '') ? String(data.livestock.production[name]) : '' }));
  lines.push({ label: 'Bölmə tamamlanıb', value: data.livestock.isSectionCompleted ? 'Bəli' : 'Xeyr' });
  return lines.filter(x => x.value);
}
