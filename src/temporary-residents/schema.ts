import type { Catalog, FieldValue, Option, PersonalData, ResidentData } from './types';
export type Field = {
  name: string; label: string; kind?: 'text' | 'date' | 'select' | 'boolean' | 'address';
  lookup?: string; required?: boolean; full?: boolean; maxLength?: number; parent?: string;
  when?: (data: PersonalData, catalog: Catalog) => boolean;
};
const text = (name: string, label: string, required = false, maxLength = 100): Field => ({ name, label, required, maxLength });
const select = (name: string, label: string, lookup: string, required = false, parent?: string): Field =>
  ({ name, label, kind: 'select', lookup, required, parent });
const date = (name: string, label: string, required = false): Field => ({ name, label, kind: 'date', required });
const country = (prefix: string, label: string, required = false) => select(`${prefix}CountryId`, `${label} (ölkə)`, 'country', required);
const address = (prefix: string, label: string): Field => ({ name: prefix, label, kind: 'address', full: true });
const when = (field: Field, check: Field['when']): Field => ({ ...field, when: check });
const studying = (data: PersonalData) => data.currentlyStudying === true;
const educated = (data: PersonalData) => data.educationLevelId !== 12;
const status = (value: string) => (data: PersonalData) => data.settlementStatus === value;
const employed = (data: PersonalData, c: Catalog) => !!c.employmentStatuses.find(x => x.id === data.employmentStatusId)?.enablesEmploymentDetails;
export const documentSeries = ['AZE', 'AA', 'AB'].map(id => ({ id, label: id }));
export const settlementStatuses = [{ id: 'settled', label: 'Daimi məskunlaşıb' }, { id: 'left', label: 'Tərk edib' }, { id: 'deceased', label: 'Vəfat edib' }];
export const sections: { title: string; fields: Field[] }[] = [
  { title: 'Şəxsi məlumatlar', fields: [
    when(text('fin', 'Fərdi identifikasiya nömrəsi (FİN)', true, 7), d => !d.hasNoFin),
    when(select('identityDocumentSeries', 'Sənəd seriyası', 'documentSeries', true), d => !d.hasNoFin),
    when(text('identityDocumentNumber', 'Seriya nömrəsi', true, 8), d => !d.hasNoFin),
    { name: 'hasNoFin', label: 'FİN barədə məlumat yoxdur.', kind: 'boolean', full: true },
    when(select('finAbsenceReasonId', 'FİN barədə məlumat olmamasının səbəbi', 'finAbsenceReason', true), d => d.hasNoFin === true),
    text('lastName', 'Soyadı', true), text('firstName', 'Adı', true), text('fatherName', 'Atasının adı', true),
    select('genderTypeId', 'Cinsi', 'gender', true), date('birthDate', 'Doğum tarixi', true),
    country('birth', 'Doğulduğu yer', true), address('birth', 'Doğulduğu yer'),
    text('birthPlaceNote', 'Doğulduğu yer (qeyd)', false, 500),
    select('nationalityTypeId', 'Milliyəti', 'nationality', true), select('citizenshipCountryId', 'Vətəndaşlığı', 'country', true),
  ] },
  { title: 'Qeydiyyat yeri məlumatları', fields: [country('registration', 'Qeydiyyat yeri'), address('registration', 'Qeydiyyat yeri')] },
  { title: 'Yaşayış yeri məlumatları', fields: [
    country('permanentResidence', 'Daimi yaşadığı yer', true), address('permanentResidence', 'Daimi yaşadığı yer'),
    text('permanentResidenceNote', 'Daimi yaşadığı yer (qeyd)', false, 500),
    date('arrivalDate', 'Haradan gəlmişdir (tarix)', true), country('arrivalFrom', 'Haradan gəlmişdir', true),
    address('arrivalFrom', 'Haradan gəlmişdir'), text('arrivalFromNote', 'Haradan gəlmişdir (qeyd)', false, 500),
    { ...select('settlementStatus', 'İnzibati ərazi dairəsində (sahə inzibati ərazi dairəsində) daimi məskunlaşması və ya onu tərk etməsi barədə', 'settlementStatus'), full: true },
    when(date('settlementDate', 'Məskunlaşma tarixi'), status('settled')),
    when(country('settlement', 'Məskunlaşma yeri'), status('settled')), when(address('settlement', 'Məskunlaşma yeri'), status('settled')),
    when(date('departureDate', 'Tərk etmə tarixi'), status('left')),
    when(country('departure', 'Tərk etmə yeri'), status('left')), when(address('departure', 'Tərk etmə yeri'), status('left')),
    when({ name: 'hasDeathCertificate', label: 'Ölüm aktı var', kind: 'boolean' }, status('deceased')),
    when(text('deathCertificateNumber', 'Aktın seriya və nömrəsi', false, 20), status('deceased')),
  ] },
  { title: 'Təhsil məlumatları', fields: [
    select('educationLevelId', 'Təhsil pilləsi', 'educationLevel'),
    when(select('educationLevelDetailId', 'Təhsil səviyyəsi', 'educationLevelDetail', false, 'educationLevelId'), educated),
    when(select('scientificDegreeId', 'Elmi dərəcəsi', 'scientificDegree'), educated),
    when(select('academicTitleId', 'Elmi adı', 'academicTitle'), educated),
    { name: 'currentlyStudying', label: 'Hazırda təhsil alır', kind: 'boolean', required: true },
    when(country('educationInstitution', 'Təhsil müəssisəsinin yeri'), studying),
    when(address('educationInstitution', 'Təhsil müəssisəsinin yeri'), studying),
    when(select('educationInstitutionTypeId', 'Təhsil müəssisəsinin tipi', 'educationInstitution'), studying),
    when(select('educationInstitutionNameId', 'Təhsil müəssisəsinin adı', 'educationInstitutionName', false, 'educationInstitutionCountryId'), studying),
    when(select('educationGradeId', 'Oxuduğu sinif/kurs', 'educationGrade', false, 'educationInstitutionTypeId'), studying),
    when(select('educationSpecialtyId', 'İxtisas', 'educationSpecialty'), studying),
    when(text('educationSpecialtyOtherName', 'Digər ixtisas', true, 300), (d, c) => studying(d) && c.lookups.educationSpecialty?.find(x => x.id === d.educationSpecialtyId)?.code === 'OTHER'),
  ] },
  { title: 'Məşğulluq məlumatları', fields: [
    select('employmentStatusId', 'Məşğulluq statusu', 'employmentStatus'),
    when(select('employmentCategoryId', 'Kateqoriyası', 'employmentCategory', false, 'employmentStatusId'), employed),
    when({ ...text('workplaceName', 'İdarə/müəssisə/təşkilat/fiziki şəxsin adı', false, 300), full: true }, employed),
    when(select('economicActivitySectionId', 'Fəaliyyət sahəsi', 'economicActivitySection'), employed),
    when(select('economicActivityCodeId', 'Fəaliyyət kodu', 'economicActivityCode', false, 'economicActivitySectionId'), employed),
    when(select('positionTypeId', 'Vəzifəsi', 'position'), employed),
  ] },
];
export function fieldOptions(field: Field, data: PersonalData, catalog: Catalog): Option[] {
  const items = field.lookup === 'employmentStatus' ? catalog.employmentStatuses : catalog.lookups[field.lookup ?? ''] ?? [];
  if (!field.parent) return items;
  const parentId = data[field.parent];
  if (!parentId) return [];
  return items.filter(option => {
    if (field.name === 'educationInstitutionNameId')
      return option.parentId === parentId && (!data.educationInstitutionTypeId || option.parentIds == null || option.parentIds.includes(Number(data.educationInstitutionTypeId)));
    return option.parentIds ? option.parentIds.includes(Number(parentId)) : option.parentId === parentId;
  });
}
export function updatePersonal(data: PersonalData, name: string, value: FieldValue, catalog: Catalog): PersonalData {
  const next = { ...data, [name]: value };
  for (const section of sections) for (const field of section.fields) {
    if (field.parent === name || (name === 'educationInstitutionTypeId' && field.name === 'educationInstitutionNameId')) next[field.name] = null;
  }
  if (name.endsWith('CountryId')) {
    const prefix = name.slice(0, -9);
    for (const suffix of ['AdminUnitId', 'ThroughFareId', 'EntranceId', 'AddressIsOther', 'AddressOtherNote']) next[`${prefix}${suffix}`] = null;
  }
  // Hidden controls must not reappear in sync payloads with stale foreign keys.
  for (const section of sections) for (const field of section.fields) {
    if (field.when && !field.when(next, catalog)) {
      if (field.kind === 'address') for (const suffix of ['AdminUnitId', 'ThroughFareId', 'EntranceId', 'AddressIsOther', 'AddressOtherNote']) next[`${field.name}${suffix}`] = null;
      else next[field.name] = null;
    }
  }
  return next;
}
export type Errors = Record<string, string>;
export function validate(data: ResidentData, catalog: Catalog, step?: number): Errors {
  const errors: Errors = {};
  if (step === undefined || step === 0) {
    if (!data.adminUnitId) errors.adminUnitId = 'İnzibati ərazi seçilməlidir.';
    else if (!catalog.adminUnits.some(x => x.id === data.adminUnitId && x.canSelectAccount)) errors.adminUnitId = 'Bu ərazi üzrə qeyd yaratmaq icazəniz yoxdur.';
    if (data.reportYear !== catalog.reportYear) errors.reportYear = 'Hesabat ilini onlayn yeniləyin.';
    validateAddress('', data as unknown as PersonalData, catalog, errors);
  }
  if (step === undefined || step === 1) {
    const personal = data.personal;
    for (const section of sections) for (const field of section.fields) {
      if (field.when && !field.when(personal, catalog)) continue;
      const value = personal[field.name];
      if (field.required && (value === null || value === undefined || String(value).trim() === '')) errors[field.name] = `${field.label} daxil edilməlidir.`;
      if (field.kind === 'date' && value) {
        const raw = String(value), parsed = new Date(`${raw}T00:00:00Z`);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(raw) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== raw)
          errors[field.name] = 'Tarixi İİİİ-AA-GG formatında daxil edin.';
        else if (raw > new Date().toISOString().slice(0, 10)) errors[field.name] = 'Tarix gələcək tarix ola bilməz.';
      }
      if (field.kind === 'address') validateAddress(field.name, personal, catalog, errors);
    }
    if (personal.hasNoFin !== true) {
      if (!/^[A-Z0-9]{7}$/.test(String(personal.fin ?? ''))) errors.fin = 'FİN 7 latın hərfi və ya rəqəmdən ibarət olmalıdır.';
      if (!/^[0-9]{7,8}$/.test(String(personal.identityDocumentNumber ?? ''))) errors.identityDocumentNumber = 'Sənəd nömrəsi 7 və ya 8 rəqəmdən ibarət olmalıdır.';
    }
    if (personal.birthDate && personal.arrivalDate && String(personal.arrivalDate) < String(personal.birthDate)) errors.arrivalDate = 'Gəlmə tarixi doğum tarixindən əvvəl ola bilməz.';
  }
  if (step === undefined || step === 2) {
    if (Object.values(data.counts).some(n => !Number.isInteger(n) || n < 0 || n > 2147483647)) errors.animals = 'Heyvan sayı mənfi olmayan tam ədəd olmalıdır.';
    if (data.otherAnimals.some(a => !a.name.trim() || a.name.length > 200 || !Number.isInteger(a.count) || a.count < 0 || a.count > 2147483647)) errors.animals = 'Digər heyvanın adını və düzgün sayını daxil edin.';
  }
  return errors;
}
function validateAddress(prefix: string, data: PersonalData, catalog: Catalog, errors: Errors) {
  const key = (suffix: string) => prefix ? `${prefix}${suffix}` : suffix[0].toLowerCase() + suffix.slice(1);
  const country = catalog.lookups.country?.find(c => c.id === data[key('CountryId')]);
  if (prefix && country?.code !== '031') return;
  const admin = data[key('AdminUnitId')], street = data[key('ThroughFareId')], entrance = data[key('EntranceId')];
  if (prefix && !admin) errors[key('AdminUnitId')] = 'İnzibati ərazi seçilməlidir.';
  if (street && !catalog.streets.some(x => x.id === street && x.adminUnitId === admin)) errors[key('ThroughFareId')] = 'Küçə seçilmiş inzibati əraziyə aid deyil.';
  if (entrance && !catalog.entrances.some(x => x.id === entrance && x.adminUnitId === admin && x.throughFareId === street)) errors[key('EntranceId')] = 'Bina seçilmiş küçəyə aid deyil.';
}
export function animalCount(id: number, catalog: Catalog, counts: Record<string, number>): number {
  const item = catalog.animals.find(x => x.id === id);
  const children = catalog.animals.filter(x => x.parentId === id);
  if (!children.length || (item?.parentId != null && !item.isComputed)) return counts[id] ?? 0;
  return children.reduce((total, child) => total + animalCount(child.id, catalog, counts), 0);
}
