import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { test } from 'node:test';
const require = createRequire(import.meta.url);
const { ResidentStore } = require('../src/temporary-residents/store.ts');
const { ResidentSync } = require('../src/temporary-residents/sync.ts');
const { newResidentData, pending } = require('../src/temporary-residents/types.ts');
const { validate, updatePersonal, fieldOptions, animalCount } = require('../src/temporary-residents/schema.ts');
const { diffResident } = require('../src/temporary-residents/present.ts');
const { editable } = require('../src/temporary-residents/types.ts');
const { ApiConnectionError, ApiError } = require('../src/auth/api.ts');
function fixture() {
  const values = new Map();
  const storage = {
    read: (owner, key) => values.get(`${owner}:${key}`) ?? null,
    write: (owner, key, value) => { values.set(`${owner}:${key}`, value); },
    list: owner => [...values.entries()].filter(([key]) => key.startsWith(`${owner}:draft:`)).map(([, value]) => value),
    remove: (owner, key) => { values.delete(`${owner}:${key}`); },
  };
  return { values, storage, store: new ResidentStore(storage, 'user.1', randomUUID) };
}
const state = (extra = {}) => ({ rootReportId: 123, reportId: 123, version: 3, status: 1, statusName: 'Formalaşmış', canEdit: true, returnReason: null, ...extra });
const receipt = draft => ({ clientId: draft.id, revision: draft.revision, personalAccountNumber: 'MY-123', state: state({ version: draft.revision * 3 }) });
const catalog = {
  version: 1, downloadedAt: new Date().toISOString(), reportYear: new Date().getUTCFullYear(),
  lookups: { country: [{ id: 1031, label: 'Azərbaycan', code: '031' }, { id: 2, label: 'Xarici ölkə', code: '002' }],
    educationSpecialty: [{ id: 4, code: 'OTHER' }] }, employmentStatuses: [], animals: [],
  adminUnits: [{ id: 1, countryId: 1031, canSelectAccount: true }], streets: [{ id: 2, adminUnitId: 1 }], entrances: [{ id: 3, adminUnitId: 1, throughFareId: 2 }],
};
function validData() { return { ...newResidentData(catalog.reportYear), adminUnitId: 1, personal: {
  fin: 'ABC1234', identityDocumentSeries: 'AA', identityDocumentNumber: '1234567', lastName: 'Test', firstName: 'Test', fatherName: 'Test',
  genderTypeId: 1, birthDate: '2000-02-29', birthCountryId: 2, nationalityTypeId: 1, citizenshipCountryId: 1031,
  permanentResidenceCountryId: 2, arrivalDate: '2020-01-01', arrivalFromCountryId: 2, currentlyStudying: false,
} }; }
test('drafts and catalog survive reopening and are isolated by user and executive', () => {
  const { store, storage } = fixture(), draft = store.create(validData()); store.saveCatalog(catalog);
  const reopened = new ResidentStore(storage, 'user.1', randomUUID);
  assert.deepEqual(reopened.get(draft.id), draft); assert.deepEqual(reopened.catalog(), catalog);
  const other = new ResidentStore(storage, 'user.2', randomUUID);
  assert.deepEqual(other.list(), []); assert.equal(other.get(draft.id), null); assert.equal(other.catalog(), null);
});
test('only explicitly selected pending records upload; successful records are skipped', async () => {
  const { store } = fixture(), a = store.create(validData()), b = store.create(validData()), sent = [];
  const sync = new ResidentSync(store, async d => { sent.push(d.id); return receipt(d); }, () => undefined);
  await sync.selected([a.id, a.id]); assert.deepEqual(sent, [a.id]);
  assert.equal(pending(store.get(a.id)), false); assert.equal(pending(store.get(b.id)), true);
  await sync.selected([a.id]); assert.deepEqual(sent, [a.id]);
});
test('editing during upload acknowledges only the sent revision and preserves the edit', async () => {
  const { store } = fixture(), a = store.create(validData());
  const sync = new ResidentSync(store, async d => { store.save(a.id, { ...a.data, addressOtherNote: 'new' }); return receipt(d); }, () => undefined);
  await sync.selected([a.id]); const actual = store.get(a.id);
  assert.equal(actual.syncedRevision, 1); assert.equal(actual.revision, 2); assert.equal(actual.data.addressOtherNote, 'new'); assert.equal(pending(actual), true);
});
test('partial failures retain data and do not re-upload successful records on retry', async () => {
  const { store } = fixture(), a = store.create(validData()), b = store.create(validData()); let fail = true; const sent = [];
  const sync = new ResidentSync(store, async d => { sent.push(d.id); if (d.id === b.id && fail) throw new ApiError(400, 'Validation'); return receipt(d); }, () => undefined);
  const result = await sync.selected([a.id, b.id]); assert.equal(result.succeeded, 1); assert.equal(result.failed, 1);
  assert.equal(store.get(b.id).lastError, 'Validation'); assert.deepEqual(store.get(b.id).data, b.data);
  fail = false; await sync.selected([a.id, b.id]); assert.deepEqual(sent, [a.id, b.id, b.id]);
});
test('network loss stops the batch, preserves pending entries and retries stable client IDs', async () => {
  const { store } = fixture(), a = store.create(validData()), b = store.create(validData()); const sent = []; let online = false;
  const sync = new ResidentSync(store, async d => { sent.push([d.id, d.revision]); if (!online) throw new ApiConnectionError(true); return receipt(d); }, () => undefined);
  await sync.selected([a.id, b.id]); assert.equal(sent.length, 1); assert.equal(pending(store.get(a.id)), true);
  online = true; await sync.selected([a.id, b.id]); assert.deepEqual(sent.slice(0, 2), [[a.id, 1], [a.id, 1]]);
});
test('double taps cannot start overlapping sync batches; locking stops subsequent requests', async () => {
  const { store } = fixture(), a = store.create(validData()), b = store.create(validData()); let release; let active = true; let count = 0;
  const gate = new Promise(resolve => { release = resolve; });
  const sync = new ResidentSync(store, async d => { count++; await gate; active = false; return receipt(d); }, () => undefined);
  const first = sync.selected([a.id, b.id], undefined, () => active);
  await assert.rejects(sync.selected([a.id]), /artıq/); release(); await first;
  assert.equal(count, 1); assert.equal(pending(store.get(b.id)), true);
});
test('invalid or mismatched server acknowledgements never mark data synced', async () => {
  const { store } = fixture(), a = store.create(validData());
  const sync = new ResidentSync(store, async d => ({ ...receipt(d), clientId: randomUUID() }), () => undefined);
  await sync.selected([a.id]); assert.equal(pending(store.get(a.id)), true); assert.match(store.get(a.id).lastError, /uyğun deyil/);
});
test('local validation prevents sending invalid form data', async () => {
  const { store } = fixture(), a = store.create(newResidentData(catalog.reportYear)); let sent = false;
  const sync = new ResidentSync(store, async d => { sent = true; return receipt(d); }, d => Object.values(validate(d.data, catalog))[0]);
  await sync.selected([a.id]); assert.equal(sent, false); assert.match(store.get(a.id).lastError, /ərazi/);
  assert.deepEqual(validate(validData(), catalog), {});
});
test('dates, FIN, address relationships and counts are checked before sync', () => {
  const data = validData(); data.personal.birthDate = '2001-02-29'; data.personal.fin = 'invalid'; data.throughFareId = 77; data.counts = { 1: -1 };
  const errors = validate(data, catalog); assert.ok(errors.birthDate); assert.ok(errors.fin); assert.ok(errors.throughFareId); assert.ok(errors.animals);
  data.personal.birthCountryId = 1031; assert.ok(validate(data, catalog).birthAdminUnitId);
});
test('dependent hidden values clear when FIN, education, employment or location changes', () => {
  let data = { ...validData().personal, educationLevelId: 1, educationLevelDetailId: 3, educationInstitutionCountryId: 1031, currentlyStudying: true, educationInstitutionAdminUnitId: 1 };
  data = updatePersonal(data, 'hasNoFin', true, catalog); assert.equal(data.fin, null); assert.equal(data.identityDocumentNumber, null);
  data = updatePersonal(data, 'educationLevelId', 12, catalog); assert.equal(data.educationLevelDetailId, null);
  data = updatePersonal(data, 'currentlyStudying', false, catalog); assert.equal(data.educationInstitutionCountryId, null); assert.equal(data.educationInstitutionAdminUnitId, null);
  data = updatePersonal({ ...data, birthAdminUnitId: 1 }, 'birthCountryId', 2, catalog); assert.equal(data.birthAdminUnitId, null);
});
test('institution filtering supports untyped foreign institutions and postgraduate mappings', () => {
  const options = [{ id: 1, parentId: 2, parentIds: null }, { id: 2, parentId: 2, parentIds: [10, 11, 12] }, { id: 3, parentId: 2, parentIds: [1] }];
  assert.deepEqual(fieldOptions({ name: 'educationInstitutionNameId', parent: 'educationInstitutionCountryId', lookup: 'educationInstitutionName' },
    { educationInstitutionCountryId: 2, educationInstitutionTypeId: 11 }, { ...catalog, lookups: { educationInstitutionName: options } }).map(x => x.id), [1, 2]);
});
test('animal totals include computed branches without double counting subset details', () => {
  const c = { ...catalog, animals: [{ id: 1, parentId: null }, { id: 2, parentId: 1, isComputed: true }, { id: 3, parentId: 2 }, { id: 4, parentId: 3 }, { id: 5, parentId: 2 }] };
  assert.equal(animalCount(1, c, { 3: 8, 4: 3, 5: 2 }), 10);
});

const serverCopy = (data, extra = {}) => ({ accountNumber: 'MY-123', address: null, state: state(extra),
  actions: { canEdit: true, canDelete: false, canSubmitForApproval: false, canSubmitForApprovalWhenCompleted: true, canClose: false, closeRequiresDescription: false }, data });
test('a version conflict keeps local data, records the server copy and lets other records sync', async () => {
  const { store } = fixture(), a = store.create(validData()), b = store.create(validData());
  const changed = { ...validData(), personal: { ...validData().personal, firstName: 'Server' } };
  const sync = new ResidentSync(store, async d => {
    if (d.id === a.id) throw new ApiError(409, 'Hesabat serverdə dəyişdirilib.', 'VERSION_CONFLICT', { server: serverCopy(changed, { version: 9, status: 4, statusName: 'Təsdiqdən geri qaytarılıb', returnReason: 'Adı düzəldin' }) });
    return receipt(d);
  }, () => undefined);
  const result = await sync.selected([a.id, b.id]);
  assert.equal(result.conflicts, 1); assert.equal(result.succeeded, 1);
  const kept = store.get(a.id);
  assert.deepEqual(kept.data, a.data); assert.equal(pending(kept), true);
  assert.equal(kept.conflict.code, 'VERSION_CONFLICT'); assert.equal(kept.conflict.server.data.personal.firstName, 'Server');
  assert.equal(kept.status.returnReason, 'Adı düzəldin'); assert.equal(kept.status.changed, true);
});
test('a locked report closes editing and a deleted report stops syncing', async () => {
  const { store } = fixture(), a = store.create(validData()), b = store.create(validData());
  const sync = new ResidentSync(store, async d => {
    if (d.id === a.id) throw new ApiError(409, 'Hesabat təsdiq gözləyir.', 'REPORT_LOCKED', { server: serverCopy(validData(), { status: 2, canEdit: false }) });
    throw new ApiError(410, 'Hesabat serverdə silinib.', 'REPORT_DELETED');
  }, () => undefined);
  await sync.selected([a.id, b.id]);
  assert.equal(editable(store.get(a.id)), false); assert.equal(store.get(b.id).deleted, true);
  const sent = []; await new ResidentSync(store, async d => { sent.push(d.id); return receipt(d); }, () => undefined).selected([b.id]);
  assert.deepEqual(sent, []);
});
test('adopting the server copy replaces data, clears the conflict and stays ahead of the receipt revision', () => {
  const { store } = fixture(), a = store.create(validData()); store.save(a.id, { ...a.data, addressOtherNote: 'local' });
  store.conflict(a.id, { code: 'VERSION_CONFLICT', message: 'x', server: serverCopy(validData()), at: '' });
  const adopted = store.adopt(a.id, 1, serverCopy({ ...validData(), addressOtherNote: 'server' }, { reportId: 130, version: 12 }));
  assert.equal(adopted.data.addressOtherNote, 'server'); assert.equal(adopted.conflict, undefined); assert.equal(pending(adopted), false);
  assert.equal(adopted.revision, 2); assert.equal(adopted.server.reportId, 130); assert.equal(adopted.server.version, 12);
  const edited = store.save(a.id, adopted.data); assert.equal(edited.revision, 3); assert.equal(pending(edited), true);
});
test('a checked-out report is a synced device record bound to its chain', () => {
  const { store } = fixture();
  const draft = store.adopt('device-1', 4, serverCopy(validData(), { rootReportId: 50, reportId: 77, version: 5 }));
  assert.equal(draft.server.downloaded, true); assert.equal(draft.server.rootReportId, 50); assert.equal(pending(draft), false);
  assert.equal(store.findByRoot(50).id, 'device-1');
});
test('removing a record with unsent changes needs explicit discard', () => {
  const { store } = fixture(), a = store.create(validData());
  assert.throws(() => store.remove(a.id), /Göndərilməmiş/); assert.notEqual(store.get(a.id), null);
  store.remove(a.id, true); assert.equal(store.get(a.id), null);
});
test('status refresh marks returned, changed and deleted reports without touching data', () => {
  const { store } = fixture(), a = store.create(validData());
  store.acknowledge(a, receipt(a));
  store.applyStatus({ clientId: a.id, deleted: false, changed: true, state: state({ reportId: 140, status: 4, statusName: 'Geri qaytarılıb', returnReason: 'Səbəb' }) });
  let current = store.get(a.id);
  assert.equal(current.status.changed, true); assert.equal(current.status.reportId, 140); assert.deepEqual(current.data, a.data); assert.equal(current.server.reportId, 123);
  store.applyStatus({ clientId: a.id, deleted: true, changed: false, state: null }); current = store.get(a.id);
  assert.equal(current.deleted, true); assert.equal(editable(current), false);
});
test('differences list changed fields, animals and completion in the form wording', () => {
  const c = { ...catalog, lookups: { ...catalog.lookups, gender: [{ id: 1, label: 'Kişi' }, { id: 2, label: 'Qadın' }] }, animals: [{ id: 7, label: 'Qoyun:', parentId: null }] };
  const local = { ...validData(), counts: { 7: 12 } }, server = { ...validData(), counts: { 7: 10 }, isAnimalsSectionCompleted: true,
    personal: { ...validData().personal, genderTypeId: 2, birthDate: '2000-03-01' } };
  const byLabel = Object.fromEntries(diffResident(local, server, c).map(d => [d.label, [d.local, d.server]]));
  assert.deepEqual(byLabel['Cinsi'], ['Kişi', 'Qadın']); assert.deepEqual(byLabel['Doğum tarixi'], ['29.02.2000', '01.03.2000']);
  assert.deepEqual(byLabel['Qoyun'], ['12', '10']); assert.deepEqual(byLabel['Bölmə tamamlanıb'], ['Xeyr', 'Bəli']);
  assert.equal(diffResident(local, local, c).length, 0);
});
