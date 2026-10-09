// Tbu.Web's HouseholdInputNumbers: the row numbers of the 2026 paper form shown beside each
// input. They are display references only; ids and field names are unaffected.
const MEMBER: Record<string, string> = {
  lastName: '1.1', firstName: '1.2', fatherName: '1.3', fin: '2.1', hasNoFin: '2.2', finAbsenceReasonId: '2.3',
  householdRelationshipTypeId: '3', genderTypeId: '4', birthDate: '5.1', birthCountryId: '5.2', birthPlaceNote: '5.5',
  citizenshipCountryId: '6', nationalityTypeId: '7.1', otherNationality: '7.2', permanentResidenceSinceYear: '8',
  isRegisteredAtThisAddress: '9.1', registrationCountryId: '9.2', registrationSinceYear: '9.5',
  isRented: '10.1', rentalBasisId: '10.2', isDisplaced: '11.1', displacementStatus: '11.2',
  resettlementCountryId: '11.3', resettlementDate: '11.6', resettlementObjectTypeId: '11.7', resettlementObjectOrgan: '11.8',
  displacementReturnDate: '11.11', educationLevelId: '12.1', educationLevelDetailId: '12.2', scientificDegreeId: '12.3',
  academicTitleId: '12.4', isCurrentlyStudying: '13.1', educationInstitutionCountryId: '13.2', educationInstitutionTypeId: '13.4',
  educationInstitutionName: '13.5', educationGradeId: '13.6', educationSpecialtyId: '13.7',
  employmentStatusId: '14.1', employmentCategoryId: '14.2', employerName: '14.3', economicActivitySectionId: '14.4',
  economicActivityCodeId: '14.5', positionId: '14.6', membershipMovementType: '15.1', departureReasonId: '15.2',
  departureDate: '15.3', returnDate: '15.4', departureCountryId: '15.5', departureNote: '15.8',
  exitDate: '16.1', exitReasonId: '16.2', hasDeathCertificate: '16.3', deathCertificateSeriesNumber: '16.4',
  exitDestinationCountryId: '16.5', exitDestinationVillage: '16.7', newArrivalDate: '17.1', arrivalFromCountryId: '17.2',
  arrivalFromNote: '17.5', membershipEntryBasisId: '17.6', pensionTypeId: '18.1', otherPaymentNote: '18.2',
  disabilityAssessmentId: '19.1', disabilityDegreeId: '19.2', disabilityReasonId: '19.3', disabilityReasonSubcategoryId: '19.4',
  militaryObligationId: '20.1', militaryRegistrationDate: '20.2', militaryRegistrationPlace: '20.3', phoneNumbers: '21.1', emails: '21.2',
};
// The address blocks' admin unit inputs, by block name.
const MEMBER_ADDRESS: Record<string, string> = {
  birth: '5.3', registration: '9.3', resettlement: '11.4', educationInstitution: '13.3', departure: '15.6', arrivalFrom: '17.3',
};
const BUILDING: Record<string, string> = {
  dwellingType: '1.1', otherBuildingNote: '1.2', constructionYear: '1.3', totalAreaSqm: '1.1.1', roomCount: '1.2.1',
  roomsAreaSqm: '1.2.2', floorCount: '1.3.1', hasElevator: '1.3.2', housingFundType: '1.4', purposeType: '1.5',
  waterSupplyTypeId: '3.1', hasSanitaryFacility: '3.2', hasBathOrShower: '3.3', hotWaterSupplyTypeId: '3.4',
  hasSewerage: '3.5', heatingSystemTypeId: '3.6', gasSupplyTypeId: '3.7', hasLandline: '3.8', internetTypeId: '3.9',
};
const VEHICLE: Record<string, string> = {
  'minik avtomobilləri': '1', 'yük avtomobilləri': '2', 'tırtıllı traktorlar': '3.1', 'tırtıllı traktor': '3.1',
  'təkərli traktorlar': '3.2', 'təkərli traktor': '3.2', 'taxılyığan kombaynlar': '4', 'taxılyığan kombayn': '4',
  'ot və küləş presləyənlər': '5', 'ot-küləş presləyən': '5', kotanlar: '6', kotan: '6', taxılsəpənlər: '7', taxılsəpən: '7',
};
const LAND_SAME = ['1', '1.1', '1.1.1', '1.2', '1.2.1', '1.2.2', '1.2.3', '1.3', '1.4', '1.5', '1.6', '1.6.1', '1.7', '1.7.1',
  '1.7.1.1', '1.7.1.2', '1.7.2', '1.7.2.1', '1.7.2.2', '1.8', '1.8.1', '1.8.2', '1.8.2.1', '1.8.2.1.1', '1.8.2.1.2',
  '1.8.2.1.3', '1.8.2.2', '3'];
// The closing rows follow the document order instead of the internal codes.
const LAND: Record<string, string> = { ...Object.fromEntries(LAND_SAME.map(x => [x, x])), 6: '4', 4: '5', 5: '6', '5.1': '6.1', '5.2': '6.1.1' };
const ANIMAL = new Set(['1.1.2', '1.1.2.1', '1.1.3', '1.1.4', '1.1.4.1', '1.1.5', '1.1.6', '1.1.7', '1.1.8',
  '1.2.1', '1.2.2', '1.2.3', '1.2.4', '1.2.4.1', '1.2.5', '1.2.6', '1.2.7', '1.2.8',
  '2.1.1', '2.1.2', '2.1.3', '2.1.4', '2.1.5', '2.2.1', '2.2.2', '2.2.3', '2.2.4', '2.2.5']);
// Pig and horse codes are data keys; the form numbers them by the document instead.
const ANIMAL_DISPLAY: Record<string, string> = { 4.1: '3.1', 4.2: '3.2', 4.3: '3.3', 4.4: '3.4', 5.1: '4.1', 5.2: '4.2', 5.3: '4.3', 5.4: '4.4' };

export const numbers = {
  member: (name: string) => MEMBER[name],
  memberAddress: (block: string) => MEMBER_ADDRESS[block],
  building: (name: string) => BUILDING[name],
  vehicle: (label: string, operational: boolean) => {
    const row = VEHICLE[label.trim().toLowerCase()];
    return row ? `${row}.${operational ? 2 : 1}` : undefined;
  },
  land: (code: string) => LAND[code],
  animal: (code: string | null | undefined) => code ? ANIMAL_DISPLAY[code] ?? (ANIMAL.has(code) ? code : undefined) : undefined,
};
