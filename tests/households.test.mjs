import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { test } from 'node:test';
const require = createRequire(import.meta.url);
const { HouseholdStore } = require('../src/households/store.ts');
const { HouseholdSync } = require('../src/households/sync.ts');
const { newHouseholdData, newMember, pending } = require('../src/households/types.ts');
const { validateMember, updateMember, fieldOptions, sections } = require('../src/households/schema.ts');
const { validate, firstIssue, validateBuilding, validateVehicles, validateLivestock, validateLand, landCalculation, updateBuilding } = require('../src/households/steps.ts');
const { newBuilding, newLand } = require('../src/households/types.ts');
const { toServer, fromServer } = require('../src/households/server.ts');
const { diffHousehold } = require('../src/households/present.ts');
const { ApiError } = require('../src/auth/api.ts');
const { memoryAddressBook } = require('../src/reference/types.ts');

function fixture() {
  const values = new Map();
  const storage = {
    read: (owner, key) => values.get(`${owner}:${key}`) ?? null,
    write: (owner, key, value) => { values.set(`${owner}:${key}`, value); },
    list: owner => [...values.entries()].filter(([key]) => key.startsWith(`${owner}:draft:`)).map(([, value]) => value),
    remove: (owner, key) => { values.delete(`${owner}:${key}`); },
  };
  return { storage, store: new HouseholdStore(storage, 'user.1', randomUUID) };
}
const state = (extra = {}) => ({ rootReportId: 7, reportId: 7, version: 2, status: 1, statusName: 'Formalaşmış', canEdit: true, returnReason: null, ...extra });
const catalog = {
  version: 2, downloadedAt: new Date().toISOString(), reportYear: new Date().getUTCFullYear(),
  lookups: {
    country: [{ id: 1031, label: 'Azərbaycan', code: '031' }, { id: 2, label: 'Türkiyə', code: '792' }],
    exitReason: [{ id: 5, label: 'Vəfat edib', code: 'DECEASED' }, { id: 6, label: 'Köçüb' }],
    educationGrade: [{ id: 1, label: '1-ci sinif', parentIds: [3] }, { id: 2, label: '1-ci kurs', parentIds: [4] }],
    educationInstitutionName: [{ id: 9, label: 'BDU', parentId: 1031, parentIds: [4] }, { id: 10, label: 'Məktəb', parentId: 1031, parentIds: [3] }],
    relationship: [{ id: 2, label: 'Həyat yoldaşı' }],
  },
  employmentStatuses: [{ id: 1, label: 'Muzdlu', enablesEmploymentDetails: true }, { id: 3, label: 'Qeyri-fəal', enablesEmploymentDetails: false }],
  accountAdminUnitIds: [1], addresses: memoryAddressBook({ adminUnits: [{ id: 1, countryId: 1031, canSelectAccount: true, label: 'Kənd' }] }),
  vehicleTypes: [{ id: 1, parentId: null, label: 'Traktorlar - cəmi', isComputed: true }, { id: 2, parentId: 1, label: 'Təkərli', isComputed: false },
    { id: 3, parentId: 1, label: 'Tırtıllı', isComputed: false }, { id: 4, parentId: null, label: 'Kombayn', isComputed: false }],
  otherEquipmentTypes: [{ id: 7, label: 'Motoblok' }],
  animals: [{ id: 10, parentId: null, label: 'İribuynuzlu', isComputed: true }, { id: 11, parentId: 10, label: 'İnəklər', isComputed: false },
    { id: 12, parentId: 11, label: 'İnək', isComputed: false }, { id: 13, parentId: 12, label: 'ondan sağılan', isComputed: false }],
  landCategories: [['1', null, true], ['1.1', '1', false], ['1.2', '1', true], ['1.2.1', '1.2', false], ['1.5', '1', false], ['1.6', '1', true],
    ['1.7', null, true], ['1.7.1', '1.7', true], ['1.7.1.1', '1.7.1', false], ['1.8', null, true], ['1.8.1', '1.8', false], ['5', null, true]]
    .map(([code, parent, isComputed], index, all) => ({ id: index + 100, parentId: parent ? all.findIndex(x => x[0] === parent) + 100 : null, code, label: code, isComputed })),
};
const area = code => String(catalog.landCategories.find(x => x.code === code).id);
function person(extra = {}) {
  return { identityDocumentSeries: 'AA', hasNoFin: false, fin: 'ABC1234', identityDocumentNumber: '1234567', lastName: 'Məmmədov', firstName: 'Əli',
    fatherName: 'Vəli', genderTypeId: 1, birthDate: '1980-05-01', birthCountryId: 2, nationalityTypeId: 1, citizenshipCountryId: 1031,
    permanentResidenceSinceYear: 2000, isRegisteredAtThisAddress: true, isRented: false, isDisplaced: false, isCurrentlyStudying: false, ...extra };
}
function household(members = [{ ...newMember('head', true), personal: person() }]) {
  return { ...newHouseholdData(catalog.reportYear), adminUnitId: 1, members };
}
const receipt = (draft, members = {}, rest = {}) => ({ clientId: draft.id, revision: draft.revision, personalAccountNumber: 'ET-1', state: state(), ids: { members, buildings: {}, lands: {}, ...rest } });

test('a valid household passes both steps; an empty account blocks on the first', () => {
  assert.equal(firstIssue(household(), catalog), null);
  assert.equal(firstIssue(newHouseholdData(catalog.reportYear), catalog).step, 0);
});
test('member rules follow the server: names, FİN, years, dates, phones and the relationship to the head', () => {
  const data = household();
  const other = { ...newMember('m2', false), personal: person({ lastName: 'Ali1', fin: 'AB', permanentResidenceSinceYear: 1800 }), phoneNumbers: ['0501234567'] };
  data.members.push(other);
  const errors = validateMember(other, data, catalog);
  assert.ok(errors.lastName); assert.ok(errors.fin); assert.ok(errors.permanentResidenceSinceYear); assert.ok(errors.phoneNumbers);
  assert.ok(errors.householdRelationshipTypeId, 'a head exists, so the relationship is required');
  const ok = { ...other, personal: person({ householdRelationshipTypeId: 2 }), phoneNumbers: ['(050) 123-45-67'] };
  assert.deepEqual(validateMember(ok, { ...data, members: [data.members[0], ok] }, catalog), {});
  // Without a head no relationship is asked, as on the web form.
  assert.equal(validateMember(other, { ...data, members: [other] }, catalog).householdRelationshipTypeId, undefined);
});
test('completing the member section needs a head', () => {
  const member = { ...newMember('m', false), personal: person() };
  const errors = validate({ ...household([member]), isMembersSectionCompleted: true }, catalog, 1);
  assert.ok(errors.members);
});
test('membership movement shows its own fields and hides the others; hidden values are cleared', () => {
  let p = updateMember(person(), 'membershipMovementType', 2, catalog);
  p = updateMember(p, 'exitDate', '2020-01-01', catalog);
  p = updateMember(p, 'exitReasonId', 6, catalog);
  p = updateMember(p, 'exitDestinationCountryId', 2, catalog);
  const member = { ...newMember('x', true), personal: p };
  assert.deepEqual(validateMember(member, household([member]), catalog), {});
  p = updateMember(p, 'exitReasonId', 5, catalog);
  assert.equal(p.exitDestinationCountryId, null, 'a deceased member has no destination');
  p = updateMember(p, 'membershipMovementType', 1, catalog);
  assert.equal(p.exitDate, null); assert.equal(p.exitReasonId, null);
  assert.ok(validateMember({ ...member, personal: p }, household([member]), catalog).departureReasonId);
});
test('institution names and grades are narrowed by country and institution type; names are stored by label', () => {
  const field = name => sections.flatMap(s => s.fields).find(f => f.name === name);
  let p = updateMember(person(), 'isCurrentlyStudying', true, catalog);
  assert.equal(p.educationInstitutionCountryId, 1031, 'Azerbaijan is offered first');
  p = updateMember(p, 'educationInstitutionTypeId', 4, catalog);
  assert.deepEqual(fieldOptions(field('educationInstitutionName'), p, catalog), [{ id: 'BDU', label: 'BDU' }]);
  assert.deepEqual(fieldOptions(field('educationGradeId'), p, catalog).map(x => x.id), [2]);
  p = updateMember({ ...p, educationGradeId: 2, educationInstitutionName: 'BDU' }, 'educationInstitutionTypeId', 3, catalog);
  assert.equal(p.educationGradeId, null); assert.equal(p.educationInstitutionName, null);
});
test('the server shape carries the movement as flags and round-trips to the form shape', () => {
  const member = { ...newMember('k', true), id: 12, personal: person({ membershipMovementType: 3, newArrivalDate: '2021-02-03', note: '' }), phoneNumbers: ['(050) 123-45-67', ' '] };
  const sent = toServer(household([member])).members[0];
  assert.equal(sent.data.newResident, true); assert.equal(sent.data.temporarilyAbsent, false);
  assert.equal(sent.data.membershipMovementType, undefined); assert.equal(sent.data.note, undefined);
  assert.deepEqual(sent.data.phoneNumbers, ['(050) 123-45-67']);
  const back = fromServer({ ...household(), members: [{ ...sent, data: { ...sent.data, newArrivalDate: '2021-02-03T00:00:00' } }] }).members[0];
  assert.equal(back.personal.membershipMovementType, 3); assert.equal(back.personal.newArrivalDate, '2021-02-03');
  assert.equal(back.id, 12); assert.equal(back.isHead, true); assert.deepEqual(back.phoneNumbers, ['(050) 123-45-67']);
});
test('a sync receipt gives new members their server ids without losing an edit made during upload', async () => {
  const { store } = fixture(), draft = store.create(household());
  const sync = new HouseholdSync(store, async d => {
    const edited = store.get(d.id);
    store.save(d.id, { ...edited.data, members: [...edited.data.members, { ...newMember('late', false), personal: person() }] });
    return receipt(d, { head: 41 });
  }, () => undefined);
  await sync.selected([draft.id]);
  const actual = store.get(draft.id);
  assert.equal(actual.data.members.find(x => x.key === 'head').id, 41);
  assert.equal(actual.data.members.find(x => x.key === 'late').id, null);
  assert.equal(pending(actual), true, 'the member added during upload is still to be sent');
  assert.equal(actual.server.personalAccountNumber, 'ET-1');
  await new HouseholdSync(store, async d => receipt(d, { head: 41 }), () => undefined).selected([actual.id]);
  assert.equal(store.get(actual.id), null, 'a household sent in full leaves the device');
});
test('a version conflict keeps local data and stores the server copy for the decision', async () => {
  const { store } = fixture(), draft = store.create(household());
  const server = { accountNumber: 'ET-1', address: null, state: state({ version: 9 }), actions: {}, data: household([]) };
  const sync = new HouseholdSync(store, async () => { throw new ApiError(409, 'Dəyişib', 'VERSION_CONFLICT', { server }); }, () => undefined);
  const result = await sync.selected([draft.id]);
  assert.equal(result.conflicts, 1);
  const actual = store.get(draft.id);
  assert.deepEqual(actual.data, draft.data); assert.equal(actual.conflict.server.state.version, 9); assert.equal(pending(actual), true);
  const differences = diffHousehold(actual.data, actual.conflict.server.data, catalog);
  assert.ok(differences.some(x => x.label === 'Məmmədov Əli Vəli' && x.local === 'Əlavə edilib'));
});
test('records are isolated per user and a record with unsent changes is not removed silently', () => {
  const { store, storage } = fixture(), draft = store.create(household());
  assert.deepEqual(new HouseholdStore(storage, 'user.2', randomUUID).list(), []);
  assert.throws(() => store.remove(draft.id));
  store.remove(draft.id, true); assert.equal(store.get(draft.id), null);
});

test('the land calculator reproduces the server: farm total, irrigation balance and usage total', () => {
  const land = { ...newLand('l'), areas: { [area('1.1')]: '2.5', [area('1.2.1')]: '1,25', [area('1.5')]: '0.75', [area('1.7.1.1')]: '1', [area('1.8.1')]: '1' },
    usage: { '2.1.1.1': { metrics: {}, rows: [{ key: 'r', cropTypeId: null, metrics: { AreaHa: '2', SownAreaHa: '2' } }] }, '2.4': { metrics: { AreaHa: '1' }, rows: [] } } };
  const result = landCalculation(land, catalog);
  assert.equal(result.farmTotal, 3); assert.equal(result.values['1.2'], 1.25); assert.equal(result.values['1.7'], 1);
  assert.equal(result.usageTotal, 3); assert.equal(result.usage['2.1'].AreaHa, 2);
  assert.deepEqual(validateLand(land, catalog), {});
  assert.ok(validateLand({ ...land, areas: { ...land.areas, [area('1.8.1')]: '0.5' } }, catalog).irrigation);
  assert.ok(validateLand({ ...land, areas: { ...land.areas, [area('1.5')]: '9' } }, catalog).farmTotal);
  assert.ok(validateLand({ ...land, usage: { '2.4': { metrics: { AreaHa: '1', HomesteadAreaHa: '2' }, rows: [] } } }, catalog)['usage:2.4']);
});
test('building rules follow the server and the web form hides what does not apply', () => {
  const building = newBuilding('b');
  const errors = validateBuilding(building, catalog);
  for (const name of ['dwellingType', 'constructionYear', 'totalAreaSqm', 'roomCount', 'roomsAreaSqm', 'floorCount', 'isSharedOwnership']) assert.ok(errors[name], name);
  let fields = updateBuilding(building.fields, 'isAtHouseholdAddress', false, catalog);
  assert.ok(validateBuilding({ ...building, fields }, catalog).addressAdminUnitId, 'a building elsewhere needs its admin unit');
  fields = updateBuilding({ ...fields, addressAdminUnitId: 1 }, 'isAtHouseholdAddress', true, catalog);
  assert.equal(fields.addressAdminUnitId, null);
  const ok = { ...building, fields: { isAtHouseholdAddress: true, dwellingType: 1, constructionYear: 1990, totalAreaSqm: '120,5', roomCount: 4, roomsAreaSqm: '80', floorCount: 1, isSharedOwnership: false },
    auxiliaries: [{ typeId: 1, area: '10' }, { typeId: 1, area: '5' }] };
  assert.ok(validateBuilding(ok, catalog).auxiliaries, 'a type is listed once');
  assert.deepEqual(validateBuilding({ ...ok, auxiliaries: [{ typeId: 1, area: '10' }] }, catalog), {});
});
test('vehicle and livestock counts follow the server rules; the tractor total is computed', () => {
  const vehicles = { counts: { 2: 3, 3: 1 }, operational: { 2: 4 }, others: [{ typeId: null, count: 1, operational: 0 }], isSectionCompleted: false };
  const errors = validateVehicles(vehicles, catalog);
  assert.ok(errors['vehicle:2']); assert.ok(errors.others);
  const { vehicleTotal } = require('../src/households/steps.ts');
  assert.equal(vehicleTotal(vehicles, catalog, 1, false), 4);
  const livestock = { counts: { 12: 2, 13: 3 }, production: { chickenEggCount: '1.5', sheepWoolKg: '2,5' }, isSectionCompleted: false };
  const animalErrors = validateLivestock(livestock, catalog);
  assert.ok(animalErrors['animal:13'], 'a part may not exceed its parent'); assert.ok(animalErrors.chickenEggCount); assert.equal(animalErrors.sheepWoolKg, undefined);
});
test('later steps wait for the member relationships, as the web sidebar does', () => {
  const member = { ...newMember('m', false), personal: person() };
  const data = { ...household([member]), buildings: [newBuilding('b')] };
  assert.ok(validate(data, catalog, 1).relationships);
  assert.equal(validate({ ...data, buildings: [] }, catalog, 1).relationships, undefined);
});
test('steps 3-6 round-trip through the server shape and receive their server ids', async () => {
  const building = { ...newBuilding('b'), fields: { isAtHouseholdAddress: false, addressAdminUnitId: 1, addressAddressIsOther: true, addressAddressOtherNote: 'x', totalAreaSqm: '12,5' },
    auxiliaries: [{ typeId: 1, area: '3' }, { typeId: null, area: '' }], devices: [] };
  const land = { ...newLand('l'), areas: { 100: '1.5', 101: '' }, usage: { '2.4': { metrics: { AreaHa: '1' }, rows: [] } } };
  const data = { ...household(), buildings: [building], lands: [land], vehicles: { counts: { 2: 1 }, operational: {}, others: [], isSectionCompleted: true },
    livestock: { counts: { 12: 2 }, production: { sheepWoolKg: '2,5' }, isSectionCompleted: false } };
  const sent = toServer(data);
  assert.equal(sent.buildings[0].data.addressIsOther, true); assert.equal(sent.buildings[0].data.addressOtherNote, 'x');
  assert.equal(sent.buildings[0].data.totalAreaSqm, 12.5); assert.equal(sent.buildings[0].data.auxiliaries.length, 1);
  assert.deepEqual(sent.lands[0].data.areas, { 100: 1.5 }); assert.equal(sent.livestock.production.sheepWoolKg, 2.5);
  assert.equal(sent.vehicles.operationalCounts[2], undefined);
  const back = fromServer(JSON.parse(JSON.stringify(sent)));
  assert.equal(back.buildings[0].fields.addressAddressOtherNote, 'x'); assert.equal(back.buildings[0].fields.totalAreaSqm, '12.5');
  assert.equal(back.lands[0].areas[100], '1.5'); assert.equal(back.lands[0].usage['2.4'].metrics.AreaHa, '1');
  assert.equal(back.vehicles.counts[2], 1); assert.equal(back.livestock.production.sheepWoolKg, '2.5');
  const { store } = fixture(), draft = store.create(data);
  store.acknowledge(draft, receipt(draft, { head: 1 }, { buildings: { b: 5 }, lands: { l: 6 } }));
  const saved = store.get(draft.id).data;
  assert.equal(saved.buildings[0].id, 5); assert.equal(saved.lands[0].id, 6);
});
test('a record saved before steps 3-6 existed opens with them empty', () => {
  const { storage } = fixture();
  const old = { id: 'x', owner: 'user.1', revision: 1, syncedRevision: 0, createdAt: '', updatedAt: '', data: { ...household() } };
  for (const key of ['buildings', 'lands', 'vehicles', 'livestock']) delete old.data[key];
  storage.write('user.1', 'draft:x', JSON.stringify(old));
  const data = new HouseholdStore(storage, 'user.1', randomUUID).get('x').data;
  assert.deepEqual(data.buildings, []); assert.deepEqual(data.vehicles.counts, {}); assert.equal(firstIssue(data, catalog), null);
});
