import type { ReferenceData } from './types';

// The forms' lists by the names the operator knows them by, for the reference data screen.
const LOOKUPS: Record<string, string> = {
  settlement: 'Yaşayış məntəqələri', country: 'Ölkələr', citizenshipCountry: 'Vətəndaşlıq', gender: 'Cins', nationality: 'Millət',
  relationship: 'Qohumluq əlaqəsi', rentalBasis: 'Kirayə əsası', finAbsenceReason: 'FİN-in olmama səbəbi', resettlementObject: 'Məskunlaşma obyekti',
  resettlementOrgan: 'Məskunlaşdıran orqan', educationLevel: 'Təhsil səviyyəsi', educationLevelDetail: 'Təhsil pilləsi', scientificDegree: 'Elmi dərəcə',
  academicTitle: 'Elmi ad', educationInstitution: 'Təhsil müəssisəsinin növü', educationInstitutionName: 'Təhsil müəssisələri', educationGrade: 'Sinif / kurs',
  educationSpecialty: 'İxtisaslar', employmentCategory: 'Məşğulluq kateqoriyası', economicActivitySection: 'İqtisadi fəaliyyət bölmələri',
  economicActivityCode: 'İqtisadi fəaliyyət kodları', departureReason: 'Gəlmə səbəbi', exitReason: 'Çıxma səbəbi', membershipEntryBasis: 'Üzvlüyə daxil olma əsası',
  pension: 'Pensiya növü', disabilityAssessment: 'Əlilliyin qiymətləndirilməsi', disabilityDegree: 'Əlillik dərəcəsi', disabilityReason: 'Əlilliyin səbəbi',
  disabilityReasonSubcategory: 'Əlillik səbəbinin alt növü', militaryObligation: 'Hərbi mükəlləfiyyət', position: 'Vəzifələr',
  buildingDwelling: 'Yaşayış binasının növü', buildingHousingFund: 'Mənzil fondu', buildingPurpose: 'Tikilinin təyinatı', buildingAuxiliary: 'Köməkçi tikililər',
  buildingSupply: 'Kommunal təchizat', buildingInternet: 'İnternet', buildingTechnologyDevice: 'Texnoloji cihazlar', landCropType: 'Bitki növləri',
};

/** Every list of the reference data with its row count, named and sorted for the operator. */
export function listSummary(data: ReferenceData): { name: string; count: number }[] {
  return [
    ...Object.entries(data.lookups).map(([key, items]) => ({ name: LOOKUPS[key] ?? key, count: items.length })),
    { name: 'Məşğulluq statusları', count: data.employmentStatuses.length }, { name: 'Avtonəqliyyat növləri', count: data.vehicleTypes.length },
    { name: 'Digər texnika', count: data.otherEquipmentTypes.length }, { name: 'Heyvan növləri', count: data.animals.length },
    { name: 'Torpaq kateqoriyaları', count: data.landCategories.length },
  ].sort((a, b) => a.name.localeCompare(b.name, 'az'));
}
