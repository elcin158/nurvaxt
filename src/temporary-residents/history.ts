import { stepChange, type StepChange } from '../history/events';
import type { ResidentData } from './types';

const account = (data: ResidentData) => ({ reportYear: data.reportYear, adminUnitId: data.adminUnitId, throughFareId: data.throughFareId,
  entranceId: data.entranceId, addressIsOther: data.addressIsOther, addressOtherNote: data.addressOtherNote });
/** The report's steps as Tbu.Web names them in its history. */
export const residentSteps = (before: ResidentData, after: ResidentData): StepChange[] => [
  ...stepChange('Şəxsi hesab', account(before), account(after)),
  ...stepChange('Şəxsin məlumatları', { personal: before.personal, isPersonalSectionCompleted: before.isPersonalSectionCompleted },
    { personal: after.personal, isPersonalSectionCompleted: after.isPersonalSectionCompleted }),
  ...stepChange('Heyvanlar', { counts: before.counts, otherAnimals: before.otherAnimals, isAnimalsSectionCompleted: before.isAnimalsSectionCompleted },
    { counts: after.counts, otherAnimals: after.otherAnimals, isAnimalsSectionCompleted: after.isAnimalsSectionCompleted }),
];
