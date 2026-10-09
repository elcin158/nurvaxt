import { validateAddress } from '../temporary-residents/schema';
import type { FieldValue, HouseholdCatalog, HouseholdData, MemberData, Option, PersonalData } from './types';

// Tbu.Web's household member form (FarmsController.MemberSections), field for field, with the
// conditions under which the web form shows each one and the rules HouseholdEditorService
// applies when the member is saved.
export type Field = {
  name: string; label: string; kind?: 'text' | 'date' | 'year' | 'integer' | 'decimal' | 'select' | 'boolean' | 'address';
  lookup?: string; required?: boolean; full?: boolean; maxLength?: number; parent?: string;
  /** The select stores the option's label, not its id, as the web form does for these catalogues. */
  byLabel?: boolean;
  /** An address block with no country of its own; it is always in Azerbaijan. */
  domestic?: boolean;
  when?: (data: PersonalData, catalog: HouseholdCatalog) => boolean;
};
export type Errors = Record<string, string>;
const text = (name: string, label: string, required = false, maxLength = 100): Field => ({ name, label, required, maxLength });
const select = (name: string, label: string, lookup: string, required = false, parent?: string): Field =>
  ({ name, label, kind: 'select', lookup, required, parent });
const date = (name: string, label: string, required = false): Field => ({ name, label, kind: 'date', required });
const yesNo = (name: string, label: string, required = false): Field => ({ name, label, kind: 'boolean', required });
const country = (prefix: string, label: string, required = false) => select(`${prefix}CountryId`, `${label} (ölkə)`, 'country', required);
const address = (prefix: string, label: string, domestic = false): Field => ({ name: prefix, label, kind: 'address', full: true, domestic });
const when = (field: Field, check: Field['when']): Field => ({ ...field, when: check });
const full = (field: Field): Field => ({ ...field, full: true });

const AZERBAIJAN = '031', NO_EDUCATION = 12, WAGE_EMPLOYED = 1, ECONOMICALLY_INACTIVE = 3;
const code = (catalog: HouseholdCatalog, lookup: string, id: FieldValue) =>
  catalog.lookups[lookup]?.find(x => x.id === id)?.code?.toUpperCase();
const displaced = (status: number) => (d: PersonalData) => d.isDisplaced === true && d.displacementStatus === status;
const educated = (d: PersonalData) => d.educationLevelId !== NO_EDUCATION;
const studying = (d: PersonalData) => d.isCurrentlyStudying === true;
const employed = (d: PersonalData, c: HouseholdCatalog) => !!c.employmentStatuses.find(x => x.id === d.employmentStatusId)?.enablesEmploymentDetails;
const movement = (type: number) => (d: PersonalData) => d.membershipMovementType === type;
const deceased = (d: PersonalData, c: HouseholdCatalog) => code(c, 'exitReason', d.exitReasonId) === 'DECEASED';
const leftAlive = (d: PersonalData, c: HouseholdCatalog) => movement(2)(d) && d.exitReasonId != null && !deceased(d, c);

export const documentSeries = ['AZE', 'AA', 'AB'].map(id => ({ id, label: id }));
export const displacementStatuses = [{ id: 1, label: 'Müvəqqəti məskunlaşıb' }, { id: 2, label: 'Geri qayıdıb' }];
export const membershipMovements = [
  { id: 1, label: 'Müvəqqəti qaibdir' }, { id: 2, label: 'Təsərrüfatın tərkibindən tamamilə çıxıb' }, { id: 3, label: 'Daimi yaşamaq üçün yeni gəlib' },
];
const staticLookups: Record<string, { id: string | number; label: string }[]> =
  { documentSeries, displacementStatus: displacementStatuses, membershipMovement: membershipMovements };

export const sections: { title: string; fields: Field[] }[] = [
  { title: 'Şəxsi məlumatlar', fields: [
    when(text('fin', 'Fərdi identifikasiya nömrəsi (FİN)', true, 7), d => !d.hasNoFin),
    when(select('identityDocumentSeries', 'Sənəd seriyası', 'documentSeries', true), d => !d.hasNoFin),
    when(text('identityDocumentNumber', 'Seriya nömrəsi', true, 8), d => !d.hasNoFin),
    { name: 'hasNoFin', label: 'FİN barədə məlumat yoxdur.', kind: 'boolean', full: true },
    when(full(select('finAbsenceReasonId', 'FİN barədə məlumat olmamasının səbəbi', 'finAbsenceReason', true)), d => d.hasNoFin === true),
    text('lastName', 'Soyadı', true), text('firstName', 'Adı', true), text('fatherName', 'Atasının adı', true),
    select('genderTypeId', 'Cinsi', 'gender', true), date('birthDate', 'Doğum tarixi', true),
    country('birth', 'Doğulduğu yer', true), address('birth', 'Doğulduğu yer'),
    full(text('birthPlaceNote', 'Doğulduğu yer (qeyd)', false, 500)),
    select('nationalityTypeId', 'Milliyəti', 'nationality', true),
    when(text('otherNationality', 'Digər milliyyət', false, 200), (d, c) => code(c, 'nationality', d.nationalityTypeId) === 'OTHER'),
    select('citizenshipCountryId', 'Vətəndaşlığı', 'citizenshipCountry', true),
  ] },
  { title: 'Qeydiyyat və yaşayış məlumatları', fields: [
    { name: 'permanentResidenceSinceYear', label: 'Təsərrüfat ünvanında daimi yaşayır (bu ildən)', kind: 'year', required: true },
    yesNo('isRegisteredAtThisAddress', 'Təsərrüfat ünvanında qeydiyyatdadır', true),
    when(country('registration', 'Qeydiyyat yeri', true), d => d.isRegisteredAtThisAddress === false),
    when(address('registration', 'Qeydiyyat yeri'), d => d.isRegisteredAtThisAddress === false),
    { name: 'registrationSinceYear', label: 'Qeydiyyatda olduğu il', kind: 'year' },
    yesNo('isRented', 'Kirayədə qalır', true),
    when(select('rentalBasisId', 'Kirayə əsası', 'rentalBasis', true), d => d.isRented === true),
  ] },
  { title: 'Məcburi köçkün məlumatları', fields: [
    full(yesNo('isDisplaced', 'Məcburi köçkündür', true)),
    when(full(select('displacementStatus', 'Məcburi köçkün statusu', 'displacementStatus', true)), d => d.isDisplaced === true),
    when(country('resettlement', 'Məcburi köçkünün məskunlaşdığı yer'), displaced(1)),
    when(address('resettlement', 'Məcburi köçkünün məskunlaşdığı yer'), displaced(1)),
    when(date('resettlementDate', 'Məskunlaşdığı tarix'), displaced(1)),
    when(select('resettlementObjectTypeId', 'Məskunlaşdığı obyektin növü', 'resettlementObject'), displaced(1)),
    when({ ...select('resettlementObjectOrgan', 'Məskunlaşdığı obyektin nümayəndə orqanı', 'resettlementOrgan'), byLabel: true, maxLength: 300 }, displaced(1)),
    when(address('displacementReturn', 'Qayıtdığı yer', true), displaced(2)),
    when(date('displacementReturnDate', 'Qayıtdığı tarix'), displaced(2)),
  ] },
  { title: 'Təhsil məlumatları', fields: [
    select('educationLevelId', 'Təhsil pilləsi', 'educationLevel'),
    when(select('educationLevelDetailId', 'Təhsil səviyyəsi', 'educationLevelDetail', false, 'educationLevelId'), educated),
    when(select('scientificDegreeId', 'Elmi dərəcəsi', 'scientificDegree'), educated),
    when(select('academicTitleId', 'Elmi adı', 'academicTitle'), educated),
    yesNo('isCurrentlyStudying', 'Hazırda təhsil alır', true),
    when(select('educationInstitutionTypeId', 'Təhsil müəssisəsinin tipi', 'educationInstitution'), studying),
    when(country('educationInstitution', 'Təhsil müəssisəsinin yeri'), studying),
    when(address('educationInstitution', 'Təhsil müəssisəsinin yeri'), studying),
    when({ ...full(select('educationInstitutionName', 'Təhsil müəssisəsinin adı', 'educationInstitutionName', false, 'educationInstitutionCountryId')), byLabel: true, maxLength: 300 }, studying),
    when(select('educationGradeId', 'Oxuduğu sinif/kurs', 'educationGrade', false, 'educationInstitutionTypeId'), studying),
    when(select('educationSpecialtyId', 'İxtisas', 'educationSpecialty', false, 'educationInstitutionTypeId'), studying),
    when(text('educationSpecialtyOtherName', 'Digər ixtisas', true, 300), (d, c) => studying(d) && code(c, 'educationSpecialty', d.educationSpecialtyId) === 'OTHER'),
  ] },
  { title: 'Məşğulluq məlumatları', fields: [
    select('employmentStatusId', 'Məşğulluq statusu', 'employmentStatus'),
    select('employmentCategoryId', 'Kateqoriyası', 'employmentCategory', false, 'employmentStatusId'),
    when(full(text('employerName', 'İdarə/müəssisə/təşkilat/fiziki şəxsin adı', false, 300)), d => d.employmentStatusId === WAGE_EMPLOYED),
    when(select('economicActivitySectionId', 'Fəaliyyət sahəsi', 'economicActivitySection'), employed),
    when(select('economicActivityCodeId', 'Fəaliyyət kodu', 'economicActivityCode', false, 'economicActivitySectionId'), employed),
    when(full(select('positionId', 'Vəzifəsi', 'position')), employed),
  ] },
  { title: 'Təsərrüfat üzvlüyünə daxil olma/xaric olma məlumatları', fields: [
    full(select('membershipMovementType', 'Üzvlük vəziyyəti', 'membershipMovement')),
    when(select('departureReasonId', 'Getməsinin səbəbi', 'departureReason', true), movement(1)),
    when(date('departureDate', 'Getdiyi tarix', true), movement(1)),
    when(date('returnDate', 'Qayıtdığı tarix', true), movement(1)),
    when(country('departure', 'Müvəqqəti yaşadığı yer', true), movement(1)),
    when(address('departure', 'Müvəqqəti yaşadığı yer'), movement(1)),
    when(full(text('departureNote', 'Müvəqqəti yaşadığı yer (qeyd)', false, 500)), movement(1)),
    when(date('exitDate', 'Çıxdığı tarix', true), movement(2)),
    when(full(select('exitReasonId', 'Çıxmasının səbəbi', 'exitReason', true)), movement(2)),
    when(yesNo('hasDeathCertificate', 'Ölüm aktı var'), (d, c) => movement(2)(d) && deceased(d, c)),
    when(text('deathCertificateSeriesNumber', 'Aktın seriya və nömrəsi', false, 10), (d, c) => movement(2)(d) && deceased(d, c) && d.hasDeathCertificate === true),
    when(country('exitDestination', 'Daimi yaşamağa getdiyi yer', true), leftAlive),
    when({ ...select('exitDestinationVillage', 'Daimi yaşamağa getdiyi yer (məntəqə)', 'settlement'), byLabel: true, maxLength: 200 }, leftAlive),
    when(date('newArrivalDate', 'Gəldiyi tarix', true), movement(3)),
    when(country('arrivalFrom', 'Haradan gəlib', true), movement(3)),
    when(address('arrivalFrom', 'Haradan gəlib'), movement(3)),
    when(full(text('arrivalFromNote', 'Haradan gəlib (qeyd)', false, 500)), movement(3)),
    when(select('membershipEntryBasisId', 'Təsərrüfata daxilolma əsası', 'membershipEntryBasis'), movement(3)),
  ] },
  { title: 'Sosial təminat məlumatları', fields: [
    select('pensionTypeId', 'Sosial ödəniş növü', 'pension'),
    when(text('otherPaymentNote', 'Digər ödəniş növü üzrə qeyd', false, 500), (d, c) => code(c, 'pension', d.pensionTypeId) === 'OTHER'),
  ] },
  { title: 'Əlillik haqqında məlumatlar', fields: [
    select('disabilityAssessmentId', 'Əlillik qiymətləndirməsi', 'disabilityAssessment'),
    select('disabilityDegreeId', 'Əlillik dərəcəsi', 'disabilityDegree'),
    select('disabilityReasonId', 'Əlilliyin səbəbi', 'disabilityReason'),
    select('disabilityReasonSubcategoryId', 'Əlilliyin səbəbi alt-kateqoriya', 'disabilityReasonSubcategory', false, 'disabilityReasonId'),
  ] },
  { title: 'Hərbi məlumatlar', fields: [
    select('militaryObligationId', 'Hərbi mükəlləfiyyəti', 'militaryObligation'),
    date('militaryRegistrationDate', 'Uçota alındığı tarix'),
    full(text('militaryRegistrationPlace', 'Uçota alındığı yer', false, 300)),
  ] },
];
const allFields = sections.flatMap(section => section.fields);
const ADDRESS_PARTS = ['AdminUnitId', 'ThroughFareId', 'EntranceId', 'AddressIsOther', 'AddressOtherNote'];

/** The member form's country for an address block; a domestic block is always in Azerbaijan. */
export const isAzerbaijan = (field: Field, data: PersonalData, catalog: HouseholdCatalog) => field.domestic ||
  catalog.lookups.country?.find(x => x.id === data[`${field.name}CountryId`])?.code === AZERBAIJAN;
export const visible = (field: Field, data: PersonalData, catalog: HouseholdCatalog) => !field.when || field.when(data, catalog);

// Dependent lists are filtered from catalogues of up to ~30k rows on every form render; the
// result depends only on the catalogue and the parent values, so it is cached per catalogue.
const optionCache = new WeakMap<HouseholdCatalog, Map<string, { id: string | number; label: string }[]>>();
export function fieldOptions(field: Field, data: PersonalData, catalog: HouseholdCatalog): { id: string | number; label: string }[] {
  if (field.lookup && staticLookups[field.lookup]) return staticLookups[field.lookup];
  const items: Option[] = field.lookup === 'employmentStatus' ? catalog.employmentStatuses : catalog.lookups[field.lookup ?? ''] ?? [];
  const parentId = field.parent ? data[field.parent] : null;
  if (field.parent && !parentId) return [];
  const typeId = field.name === 'educationInstitutionName' ? data.educationInstitutionTypeId ?? '' : '';
  const key = `${field.name}|${parentId ?? ''}|${typeId}`;
  let cache = optionCache.get(catalog);
  if (!cache) optionCache.set(catalog, cache = new Map());
  const cached = cache.get(key);
  if (cached) return cached;
  let result: Option[] = items;
  if (field.name === 'educationInstitutionName')
    result = items.filter(x => x.parentId === parentId && (!typeId || x.parentIds == null || x.parentIds.includes(Number(typeId))));
  else if (field.parent)
    result = items.filter(x => x.parentIds ? x.parentIds.includes(Number(parentId)) : x.parentId === parentId);
  const choices = field.byLabel ? result.map(x => ({ id: x.label, label: x.label })) : result;
  cache.set(key, choices);
  return choices;
}

/** Sets one member field and clears what the change makes stale, as the web form's cascades do. */
export function updateMember(data: PersonalData, name: string, value: FieldValue, catalog: HouseholdCatalog): PersonalData {
  const next: PersonalData = { ...data, [name]: value };
  for (const field of allFields)
    if (field.parent === name || (name === 'educationInstitutionTypeId' && field.name === 'educationInstitutionName')) next[field.name] = null;
  if (name.endsWith('CountryId')) for (const part of ADDRESS_PARTS) next[`${name.slice(0, -9)}${part}`] = null;
  // The web form offers Azerbaijan first for a member who studies.
  if (name === 'isCurrentlyStudying' && value === true && next.educationInstitutionCountryId == null)
    next.educationInstitutionCountryId = catalog.lookups.country?.find(x => x.code === AZERBAIJAN)?.id ?? null;
  if (name === 'hasNoFin' && value === false && !next.identityDocumentSeries) next.identityDocumentSeries = 'AZE';
  // Hidden controls must not reappear in sync payloads with stale values.
  for (const field of allFields) {
    if (visible(field, next, catalog)) continue;
    if (field.kind === 'address') for (const part of ADDRESS_PARTS) next[`${field.name}${part}`] = null;
    else next[field.name] = null;
  }
  return next;
}

const LETTERS = /^[A-Za-zÇƏĞİÖŞÜçəğıöşü]+(?: +[A-Za-zÇƏĞİÖŞÜçəğıöşü]+)*$/;
const PHONE = /^\([0-9]{3}\) [0-9]{3}-[0-9]{2}-[0-9]{2}$/;
const EMAIL = /^[A-Za-z0-9._%+-]*[A-Za-z][A-Za-z0-9._%+-]*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;
const today = () => new Date().toISOString().slice(0, 10);

/** The member's errors by field name, under the rules the server applies when it saves the member. */
export function validateMember(member: MemberData, data: HouseholdData, catalog: HouseholdCatalog): Errors {
  const errors: Errors = {}, p = member.personal, year = new Date().getFullYear();
  for (const field of allFields) {
    if (!visible(field, p, catalog)) continue;
    const value = p[field.name];
    if (field.kind === 'address') {
      if (isAzerbaijan(field, p, catalog)) validateAddress(field.name, p, catalog, errors, field.domestic);
      continue;
    }
    if (field.required && (value === null || value === undefined || String(value).trim() === '')) errors[field.name] = `${field.label} daxil edilməlidir.`;
    else if (field.maxLength && typeof value === 'string' && value.trim().length > field.maxLength) errors[field.name] = `${field.label} ${field.maxLength} simvoldan çox ola bilməz.`;
    if (field.kind === 'date' && value) {
      const raw = String(value), parsed = new Date(`${raw}T00:00:00Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(raw) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== raw)
        errors[field.name] = 'Tarixi İİİİ-AA-GG formatında daxil edin.';
      else if (raw > today()) errors[field.name] = 'Tarix gələcək tarix ola bilməz.';
    }
    if (field.kind === 'year' && value != null && value !== '' && (!Number.isInteger(value) || Number(value) < 1900 || Number(value) > year))
      errors[field.name] = `İl 1900 ilə ${year} aralığında olmalıdır.`;
  }
  for (const name of ['lastName', 'firstName', 'fatherName'])
    if (p[name] && !LETTERS.test(String(p[name]).trim())) errors[name] = 'Yalnız hərflərdən ibarət olmalıdır.';
  if (p.hasNoFin !== true) {
    if (!/^[A-Za-z0-9]{7}$/.test(String(p.fin ?? ''))) errors.fin = 'FİN 7 latın hərfi və ya rəqəmdən ibarət olmalıdır.';
    if (!/^[0-9]{7,8}$/.test(String(p.identityDocumentNumber ?? ''))) errors.identityDocumentNumber = 'Sənəd nömrəsi 7 və ya 8 rəqəmdən ibarət olmalıdır.';
  }
  if (p.birthDate && p.resettlementDate && String(p.resettlementDate) < String(p.birthDate))
    errors.resettlementDate = 'Doğum tarixi yaşayış yerində məskunlaşdığı tarixdən sonra ola bilməz.';
  if (p.departureDate && p.returnDate && String(p.returnDate) < String(p.departureDate))
    errors.returnDate = 'Qayıdış tarixi getdiyi tarixdən əvvəl ola bilməz.';
  if (p.employmentStatusId === ECONOMICALLY_INACTIVE && p.birthDate) {
    const limit = new Date(); limit.setFullYear(limit.getFullYear() - 15);
    if (String(p.birthDate) > limit.toISOString().slice(0, 10))
      errors.employmentStatusId = 'İqtisadi qeyri-fəal statusu yalnız 15 və yuxarı yaş üçün seçilə bilər.';
  }
  // Relationships are relative to the head, so they are asked once the household has one.
  if (!member.isHead && data.members.some(x => x.isHead) && !p.householdRelationshipTypeId)
    errors.householdRelationshipTypeId = 'Qohumluq əlaqəsi seçilməlidir.';
  contacts(member.phoneNumbers, PHONE, 'Telefon nömrəsi (999) 999-99-99 formatında olmalıdır.', 'phoneNumbers', errors, false);
  contacts(member.emails, EMAIL, 'Düzgün e-poçt ünvanı daxil edin.', 'emails', errors, true);
  return errors;
}
function contacts(values: string[], format: RegExp, message: string, name: string, errors: Errors, ignoreCase: boolean) {
  const filled = values.map(x => x.trim()).filter(Boolean);
  if (filled.length > 10) errors[name] = 'Ən çox 10 dəyər daxil edilə bilər.';
  else if (filled.some(x => !format.test(x))) errors[name] = message;
  else if (new Set(filled.map(x => ignoreCase ? x.toLowerCase() : x)).size !== filled.length) errors[name] = 'Eyni dəyər təkrar daxil edilib.';
}

/** Step 0 is the account, step 1 the member list; member errors are keyed `member:<key>`. */
export function validateAccountAndMembers(data: HouseholdData, catalog: HouseholdCatalog, step: 0 | 1): Errors {
  const errors: Errors = {};
  if (step === 0) {
    if (!data.adminUnitId) errors.adminUnitId = 'İnzibati ərazi seçilməlidir.';
    else if (!catalog.accountAdminUnitIds.includes(Number(data.adminUnitId))) errors.adminUnitId = 'Bu ərazi üzrə qeyd yaratmaq icazəniz yoxdur.';
    if (data.reportYear !== catalog.reportYear) errors.reportYear = 'Hesabat ilini onlayn yeniləyin.';
    if (data.addressOtherNote.trim().length > 300) errors.addressOtherNote = 'Ünvan üzrə qeyd 300 simvoldan çox ola bilməz.';
    validateAddress('', data as unknown as PersonalData, catalog, errors);
  } else {
    for (const member of data.members) {
      const first = Object.values(validateMember(member, data, catalog))[0];
      if (first) errors[`member:${member.key}`] = `${memberLabel(member)}: ${first}`;
    }
    if (data.isMembersSectionCompleted && data.members.length && !data.members.some(x => x.isHead))
      errors.members = 'Bölməni tamamlamaq üçün təsərrüfat başçısını təyin edin.';
  }
  return errors;
}
/** As on the web form, the steps after the members open once every member is related to a head. */
export const relationshipsComplete = (data: HouseholdData) => !data.members.length ||
  (data.members.some(x => x.isHead) && data.members.every(x => x.isHead || !!x.personal.householdRelationshipTypeId));
export const memberLabel = (member: MemberData) =>
  [member.personal.lastName, member.personal.firstName].filter(Boolean).join(' ') || 'Yeni üzv';

