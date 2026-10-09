// Visual fixture of the household wizard: a catalogue shaped like the server's (land categories,
// vehicle and livestock trees) and one household with members, a building and a land record.
import { catalog as base } from './fixture';
import { newHouseholdData, newBuilding, newLand, newMember, type HouseholdCatalog, type HouseholdData } from '../../src/households/types';

let id = 1000;
const land = (code: string, label: string, parent: string | null, isComputed = false) => ({ id: ++id, code, label, parent, isComputed });
const LANDS = [
  land('1', 'Kənd təsərrüfatına yararlı torpaqlar', null, true),
  land('1.6', 'Təsərrüfat üzrə cəmi', '1', true), land('1.6.1', 'Dəmyə torpaqlar', '1.6'),
  land('1.1', 'Təsərrüfatın mülkiyyətində və (və ya) istifadəsində olan torpaq', '1.6'), land('1.1.1', 'Ondan həyətyanı sahə', '1.1'),
  land('1.2', 'İcarəyə götürülmüş torpaq', '1.6', true), land('1.2.1', 'Dövlətdən', '1.2'), land('1.2.2', 'Bələdiyyədən', '1.2'), land('1.2.3', 'Fiziki şəxsdən', '1.2'),
  land('1.3', 'Başqasından əvəzsiz istifadəyə götürülmüş torpaq', '1.6'), land('1.4', 'İstifadə etdiyi digər torpaqlar', '1.6'),
  land('1.5', 'Başqasına icarəyə (istifadəyə) verilmiş torpaq', '1.6'),
  land('1.7', 'Faktiki suvarılan torpaqlar', null, true),
  land('1.7.1', 'Səth sularından', '1.7', true), land('1.7.1.1', 'Özüaxımla', '1.7.1'), land('1.7.1.2', 'Nasosla', '1.7.1'),
  land('1.7.2', 'Yeraltı sulardan', '1.7', true), land('1.7.2.1', 'Artezian quyuları', '1.7.2'), land('1.7.2.2', 'Subartezian quyuları', '1.7.2'),
  land('1.8', 'Suvarma üsulları', null, true), land('1.8.1', 'Ənənəvi suvarma', '1.8'),
  land('1.8.2', 'Müasir suvarma', '1.8', true), land('1.8.2.1', 'Yağışyağdırma (cəmi)', '1.8.2', true), land('1.8.2.1.1', 'Pivot ilə', '1.8.2.1'),
  land('1.8.2.1.2', 'Sprinkler', '1.8.2.1'), land('1.8.2.1.3', 'Digər', '1.8.2.1'), land('1.8.2.2', 'Damcı', '1.8.2'),
  land('2', 'Torpaqdan istifadə', null, true),
  land('3', 'Meşə və meşə zolaqları', null), land('6', 'Akvakultura üçün istifadə olunan torpaq', null), land('4', 'Digər torpaqlar', null),
  land('5', 'Torpaqların cəmi', null, true), land('5.1', 'Örtülü torpaqlar', '5'), land('5.2', 'İstixanalar', '5'),
];
const byCode = new Map(LANDS.map(x => [x.code, x.id]));
let typeId = 0;
const tree = <T extends object>(label: string, parentId: number | null, extra: T) => ({ id: ++typeId, label, parentId, isComputed: false, ...extra });
const tractors = 3;
const animals = [
  tree('İribuynuzlu mal-qara cəmi', null, { isComputed: true, code: '1' }),
  tree('İnəklər', 1, { isComputed: true, code: '1.1' }), tree('Cins inəklər', 2, { code: '1.1.2' }), tree('Ondan: sağılan', 3, { code: '1.1.2.1' }),
  tree('Düyələr', 2, { code: '1.1.3' }), tree('Camışlar', 1, { isComputed: true, code: '1.2' }), tree('Camış inəkləri', 6, { code: '1.2.1' }),
  tree('Qoyun və keçilər cəmi', null, { isComputed: true, code: '2' }), tree('Ana qoyun', 8, { code: '2.1.1' }), tree('Quzu', 8, { code: '2.1.5' }),
  tree('Arı ailələri', null, { code: '9' }),
];
export const householdCatalog = {
  ...base, version: 2,
  lookups: { ...base.lookups, relationship: [{ id: 1, label: 'Həyat yoldaşı' }, { id: 2, label: 'Oğlu' }, { id: 3, label: 'Qızı' }],
    buildingDwelling: [{ id: 1, label: 'Fərdi yaşayış evi', code: 'HOUSE' }, { id: 2, label: 'Mənzil' }, { id: 3, label: 'Digər', code: 'OTHER' }],
    buildingHousingFund: [{ id: 1, label: 'Xüsusi', code: 'PRIVATE' }], buildingPurpose: [], buildingSupply: [{ id: 1, label: 'Mərkəzləşdirilmiş' }],
    buildingInternet: [{ id: 1, label: 'Fiber optik' }], buildingAuxiliary: [{ id: 1, label: 'Tövlə' }, { id: 2, label: 'Anbar' }],
    buildingTechnologyDevice: [{ id: 1, label: 'Kondisioner' }], landCropType: [{ id: 1, label: 'Buğda', code: '2.1.1.1' }],
    rentalBasis: [], displacementStatus: [] },
  vehicleTypes: [tree('Minik avtomobilləri', null, {}), tree('Yük avtomobilləri', null, {}), tree('Traktorlar – cəmi', null, { isComputed: true }),
    tree('Tırtıllı traktorlar', tractors, {}), tree('Təkərli traktorlar', tractors, {}), tree('Taxılyığan kombaynlar', null, {})].map((x, i) => ({ ...x, id: i + 1 })),
  otherEquipmentTypes: [{ id: 1, label: 'Motoblok' }],
  animals: animals.map(x => ({ ...x })),
  landCategories: LANDS.map(x => ({ id: x.id, code: x.code, label: x.label, parentId: x.parent ? byCode.get(x.parent)! : null, isComputed: x.isComputed })),
} as unknown as HouseholdCatalog;

const head = newMember('m1', true), spouse = newMember('m2', false);
head.personal = { ...head.personal, fin: 'TEST123', identityDocumentSeries: 'AA', identityDocumentNumber: '1234567', lastName: 'Məmmədov', firstName: 'Əli', fatherName: 'Vəli',
  genderTypeId: 1, birthDate: '1975-03-02', birthCountryId: 1031, nationalityTypeId: 1, citizenshipCountryId: 1031 };
spouse.personal = { ...spouse.personal, lastName: 'Məmmədova', firstName: 'Leyla', fatherName: 'Həsən', birthDate: '1980-11-20', householdRelationshipTypeId: 1 };
const building = newBuilding('b1');
building.fields = { ...building.fields, isAtHouseholdAddress: true, dwellingType: 1, totalAreaSqm: '120' };
const plot = newLand('l1');
plot.areas = { [byCode.get('1.1')!]: '2.5', [byCode.get('1.1.1')!]: '0.3', [byCode.get('1.7.1.1')!]: '1' };
export const householdData: HouseholdData = { ...newHouseholdData(2026), adminUnitId: 1, throughFareId: 1, entranceId: 1,
  members: [head, spouse], buildings: [building], lands: [plot] };
