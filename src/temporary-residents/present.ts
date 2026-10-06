import { documentSeries, sections, settlementStatuses, type Field } from './schema';
import type { Animal, Catalog, PersonalData, ResidentData } from './types';

// Turns stored ids and flags into the labels the operator reads. Shared by the read-only
// views and the conflict comparison, so both show a value the same way.
const same = (a: unknown, b: unknown) => a != null && b != null && String(a) === String(b);
export function addressText(prefix: string, data: PersonalData, catalog: Catalog) {
  const key = (suffix: string) => prefix ? `${prefix}${suffix}` : suffix[0].toLowerCase() + suffix.slice(1);
  if (data[key('AddressIsOther')] === true) return String(data[key('AddressOtherNote')] || 'Digər ünvan');
  return [catalog.adminUnits.find(x => same(x.id, data[key('AdminUnitId')]))?.label,
    catalog.streets.find(x => same(x.id, data[key('ThroughFareId')]))?.label,
    catalog.entrances.find(x => same(x.id, data[key('EntranceId')]))?.label].filter(Boolean).join(', ');
}
export const accountAddress = (data: ResidentData, catalog: Catalog) => addressText('', data as unknown as PersonalData, catalog);
export function display(field: Field, data: PersonalData, catalog: Catalog): string {
  const value = data[field.name];
  if (field.kind === 'address') return addressText(field.name, data, catalog);
  if (field.kind === 'boolean') return value === true ? 'Bəli' : value === false ? 'Xeyr' : '';
  if (field.kind === 'date') return typeof value === 'string' ? value.split('-').reverse().join('.') : '';
  if (field.kind === 'select') {
    const items = field.lookup === 'documentSeries' ? documentSeries : field.lookup === 'settlementStatus' ? settlementStatuses
      : field.lookup === 'employmentStatus' ? catalog.employmentStatuses : catalog.lookups[field.lookup ?? ''] ?? [];
    return items.find(x => same(x.id, value))?.label ?? '';
  }
  return value == null ? '' : String(value).trim();
}
/** The fields the form shows for this data, in form order, with address labels distinguished. */
export function visibleFields(personal: PersonalData, catalog: Catalog) {
  return sections.map(section => ({ title: section.title, fields: section.fields.filter(field =>
    (!field.when || field.when(personal, catalog)) &&
    (field.kind !== 'address' || catalog.lookups.country?.find(x => same(x.id, personal[`${field.name}CountryId`]))?.code === '031')) }));
}
export const fieldLabel = (field: Field) => field.kind === 'address' ? `${field.label} (ünvan)` : field.label;
/** Non-zero animal counts as an indented tree; branches show their computed totals. */
export function animalLines(data: ResidentData, catalog: Catalog, count: (id: number) => number) {
  const lines: { id: number; label: string; count: number; depth: number }[] = [];
  const walk = (item: Animal, depth: number) => {
    const children = catalog.animals.filter(x => x.parentId === item.id);
    const value = children.length ? count(item.id) : data.counts[item.id] ?? 0;
    if (!value) return;
    lines.push({ id: item.id, label: item.label.replace(/:$/, ''), count: value, depth });
    children.forEach(child => walk(child, depth + 1));
  };
  catalog.animals.filter(x => x.parentId == null && !x.label.includes('Digər')).forEach(x => walk(x, 0));
  return lines;
}

export type Difference = { section: string; label: string; local: string; server: string };
/** Whole-record comparison shown before the operator overwrites or adopts the server copy. */
export function diffResident(local: ResidentData, server: ResidentData, catalog: Catalog): Difference[] {
  const result: Difference[] = [];
  const add = (section: string, label: string, a: string, b: string) => { if ((a || '') !== (b || '')) result.push({ section, label, local: a, server: b }); };
  add('Şəxsi hesab', 'Hesabat ili', String(local.reportYear), String(server.reportYear));
  add('Şəxsi hesab', 'Ünvan', accountAddress(local, catalog), accountAddress(server, catalog));
  const localSections = visibleFields(local.personal, catalog), serverSections = visibleFields(server.personal, catalog);
  localSections.forEach((section, index) => {
    const fields = [...section.fields, ...serverSections[index].fields.filter(f => !section.fields.includes(f))];
    for (const field of fields) add(section.title, fieldLabel(field), display(field, local.personal, catalog), display(field, server.personal, catalog));
  });
  const yesNo = (value: boolean) => value ? 'Bəli' : 'Xeyr';
  add('Şəxsin məlumatları', 'Bölmə tamamlanıb', yesNo(local.isPersonalSectionCompleted), yesNo(server.isPersonalSectionCompleted));
  const ids = new Set([...Object.keys(local.counts), ...Object.keys(server.counts)]);
  for (const id of ids) {
    const a = local.counts[id] ?? 0, b = server.counts[id] ?? 0;
    if (a !== b) add('Heyvanlar', catalog.animals.find(x => same(x.id, id))?.label.replace(/:$/, '') ?? `Heyvan #${id}`, String(a), String(b));
  }
  const others = (data: ResidentData) => data.otherAnimals.filter(x => x.count > 0).map(x => `${x.name.trim()}: ${x.count}`).join(', ');
  add('Heyvanlar', 'Digər heyvan növləri', others(local), others(server));
  add('Heyvanlar', 'Bölmə tamamlanıb', yesNo(local.isAnimalsSectionCompleted), yesNo(server.isAnimalsSectionCompleted));
  return result;
}
