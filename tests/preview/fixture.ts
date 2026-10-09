import type { Catalog, ResidentData } from '../../src/temporary-residents/types';
import { memoryAddressBook } from '../../src/reference/types';
export const catalog: Catalog = {
  downloadedAt: '2026-10-06T06:00:00Z', reportYear: 2026,
  lookups: {
    country: [{ id: 1031, label: 'Azərbaycan', code: '031' }, { id: 2, label: 'Türkiyə', code: '792' },
      ...['Gürcüstan', 'Rusiya Federasiyası', 'İran İslam Respublikası', 'Qazaxıstan', 'Özbəkistan', 'Ukrayna', 'Belarus', 'Almaniya', 'Fransa', 'İtaliya', 'Böyük Britaniya və Şimali İrlandiya Birləşmiş Krallığı', 'Amerika Birləşmiş Ştatları', 'Kanada', 'Çin Xalq Respublikası', 'Yaponiya']
        .map((label, i) => ({ id: 100 + i, label, code: String(100 + i) }))],
    gender: [{ id: 1, label: 'Kişi' }, { id: 2, label: 'Qadın' }], nationality: [{ id: 1, label: 'Azərbaycanlı' }],
    finAbsenceReason: [{ id: 1, label: 'Şəxsiyyət sənədi yoxdur' }], educationLevel: [{ id: 1, label: 'Ali təhsil' }, { id: 12, label: 'Təhsili yoxdur' }],
    educationLevelDetail: [{ id: 1, parentId: 1, label: 'Bakalavriat' }], scientificDegree: [], academicTitle: [],
    educationInstitution: [{ id: 10, label: 'Ali təhsil müəssisəsi' }], educationInstitutionName: [], educationGrade: [], educationSpecialty: [],
    employmentCategory: [], economicActivitySection: [], economicActivityCode: [], position: [],
  },
  employmentStatuses: [{ id: 1, label: 'Muzdlu işçi', enablesEmploymentDetails: true }, { id: 2, label: 'İşsiz', enablesEmploymentDetails: false }],
  accountAdminUnitIds: [1, 2],
  addresses: memoryAddressBook({
    adminUnits: [{ id: 1, label: 'Şamaxı rayonu, Mədrəsə qəsəbəsi', countryId: 1031, canSelectAccount: true, hasStreet: true }, { id: 2, label: 'Şamaxı rayonu, Meysəri kəndi', countryId: 1031, canSelectAccount: true, hasStreet: true }],
    streets: [{ id: 1, adminUnitId: 1, label: 'Mərkəz küçəsi', hasEntrance: true }], entrances: [{ id: 1, adminUnitId: 1, throughFareId: 1, label: 'Ev 12' }],
  }),
  animals: [{ id: 1, parentId: null, label: 'İribuynuzlu mal-qara' }, { id: 2, parentId: 1, label: 'İnəklər', isComputed: true }, { id: 3, parentId: 2, label: 'Südlük inəklər' }, { id: 4, parentId: 2, label: 'Digər inəklər' }, { id: 5, parentId: null, label: 'Qoyunlar' }, { id: 6, parentId: null, label: 'Keçilər' }],
};
export const formData: ResidentData = {
  reportYear: 2026, adminUnitId: 1, throughFareId: 1, entranceId: 1, addressIsOther: false, addressOtherNote: '',
  personal: { hasNoFin: false, fin: 'TEST123', identityDocumentSeries: 'AA', identityDocumentNumber: '1234567', lastName: 'Sınaq', firstName: 'Nümunə', fatherName: 'Test', genderTypeId: 1, birthDate: '1990-06-15', birthCountryId: 1031, birthAdminUnitId: 1,
    nationalityTypeId: 1, citizenshipCountryId: 1031, permanentResidenceCountryId: 1031, permanentResidenceAdminUnitId: 1, arrivalDate: '2026-01-10', arrivalFromCountryId: 2, currentlyStudying: false, educationLevelId: 1, employmentStatusId: 2 },
  counts: { 3: 3, 4: 2, 5: 12 }, otherAnimals: [], isPersonalSectionCompleted: false, isAnimalsSectionCompleted: false,
};
