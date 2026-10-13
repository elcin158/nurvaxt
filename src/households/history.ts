import { recordChanges, stepChange, type StepChange } from '../history/events';
import type { HouseholdData } from './types';

const account = (data: HouseholdData) => ({ reportYear: data.reportYear, adminUnitId: data.adminUnitId, throughFareId: data.throughFareId,
  entranceId: data.entranceId, addressIsOther: data.addressIsOther, addressOtherNote: data.addressOtherNote });
/** The household's steps as Tbu.Web names them in its history: a row per member, building and land saved or removed. */
export const householdSteps = (before: HouseholdData, after: HouseholdData): StepChange[] => [
  ...stepChange('Şəxsi hesab', account(before), account(after)),
  ...recordChanges(before.members, after.members, 'Təsərrüfat üzvü', 'Təsərrüfat üzvü silindi'),
  ...stepChange('Üzvlərin siyahısı', { isSectionCompleted: before.isMembersSectionCompleted }, { isSectionCompleted: after.isMembersSectionCompleted }),
  ...recordChanges(before.buildings, after.buildings, 'Tikili məlumatı', 'Tikili məlumatı silindi'),
  ...stepChange('Tikililər', { isSectionCompleted: before.isBuildingsSectionCompleted }, { isSectionCompleted: after.isBuildingsSectionCompleted }),
  ...stepChange('Avtonəqliyyat və texnikalar', before.vehicles, after.vehicles),
  ...recordChanges(before.lands, after.lands, 'Torpaq məlumatı', 'Torpaq məlumatı silindi'),
  ...stepChange('Torpaqlar', { isSectionCompleted: before.isLandsSectionCompleted }, { isSectionCompleted: after.isLandsSectionCompleted }),
  ...stepChange('Heyvanlar', before.livestock, after.livestock),
];
