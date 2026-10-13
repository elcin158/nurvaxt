import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { test } from 'node:test';
const require = createRequire(import.meta.url);
const { ResidentStore } = require('../src/temporary-residents/store.ts');
const { ResidentSync } = require('../src/temporary-residents/sync.ts');
const { newResidentData, pending } = require('../src/temporary-residents/types.ts');
const { validate, updatePersonal, fieldOptions, animalCount, firstIssue } = require('../src/temporary-residents/schema.ts');
const { diffResident } = require('../src/temporary-residents/present.ts');
const { editable } = require('../src/temporary-residents/types.ts');
const { ApiConnectionError, ApiError } = require('../src/auth/api.ts');
const { memoryAddressBook } = require('../src/reference/types.ts');
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
  downloadedAt: new Date().toISOString(), reportYear: new Date().getUTCFullYear(),
  lookups: { country: [{ id: 1031, label: 'Azərbaycan', code: '031' }, { id: 2, label: 'Xarici ölkə', code: '002' }],
    educationSpecialty: [{ id: 4, code: 'OTHER' }] }, employmentStatuses: [], animals: [],
  accountAdminUnitIds: [1],
  addresses: memoryAddressBook({ adminUnits: [{ id: 1, countryId: 1031, canSelectAccount: true }], streets: [{ id: 2, adminUnitId: 1 }],
    entrances: [{ id: 3, adminUnitId: 1, throughFareId: 2 }] }),
};
function validData() { return { ...newResidentData(catalog.reportYear), adminUnitId: 1, personal: {
  fin: 'ABC1234', identityDocumentSeries: 'AA', identityDocumentNumber: '1234567', lastName: 'Test', firstName: 'Test', fatherName: 'Test',
  genderTypeId: 1, birthDate: '2000-02-29', birthCountryId: 2, nationalityTypeId: 1, citizenshipCountryId: 1031,
  permanentResidenceCountryId: 2, arrivalDate: '2020-01-01', arrivalFromCountryId: 2, currentlyStudying: false,
} }; }
test('drafts survive reopening and are isolated by user and executive', () => {
  const { store, storage } = fixture(), draft = store.create(validData());
  const reopened = new ResidentStore(storage, 'user.1', randomUUID);
  assert.deepEqual(reopened.get(draft.id), draft);
  const other = new ResidentStore(storage, 'user.2', randomUUID);
  assert.deepEqual(other.list(), []); assert.equal(other.get(draft.id), null);
});
test('only explicitly selected pending records upload; a record sent in full leaves the device', async () => {
  const { store } = fixture(), a = store.create(validData()), b = store.create(validData()), sent = [];
  const sync = new ResidentSync(store, async d => { sent.push(d.id); return receipt(d); }, () => undefined);
  await sync.selected([a.id, a.id]); assert.deepEqual(sent, [a.id]);
  assert.equal(store.get(a.id), null); assert.equal(pending(store.get(b.id)), true);
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
  assert.ok(adopted.adoptedAt, 'an open form must see that its data was replaced');
  const edited0 = store.save(a.id, adopted.data); assert.equal(edited0.adoptedAt, adopted.adoptedAt); store.save(a.id, adopted.data);
  assert.equal(adopted.revision, 2); assert.equal(adopted.server.reportId, 130); assert.equal(adopted.server.version, 12);
  const edited = store.get(a.id); assert.equal(edited.revision, 4); assert.equal(pending(edited), true);
});
test('a checked-out report is a synced device record bound to its chain', () => {
  const { store } = fixture();
  const draft = store.adopt('device-1', 4, serverCopy(validData(), { rootReportId: 50, reportId: 77, version: 5 }));
  assert.equal(draft.server.downloaded, true); assert.equal(draft.server.rootReportId, 50); assert.equal(pending(draft), false);
  assert.equal(store.findByRoot(50).id, 'device-1');
});
test('only a server record with nothing left to send is released from the device', () => {
  const { store } = fixture(), local = store.create(validData());
  const opened = store.adopt('device-1', 1, serverCopy(validData(), { rootReportId: 50 }));
  const edited = store.adopt('device-2', 1, serverCopy(validData(), { rootReportId: 51 })); store.save(edited.id, edited.data);
  assert.equal(store.release(local.id), false); assert.equal(store.release(edited.id), false);
  assert.equal(store.release(opened.id), true); assert.equal(store.get(opened.id), null);
  assert.notEqual(store.get(local.id), null); assert.notEqual(store.get(edited.id), null);
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
test('local records use AES-256-GCM compatible with the native cipher and still open v1 records', async () => {
  const crypto = await import('node:crypto');
  const { seal, open } = require('../src/storage/cipher.ts');
  const { gcm } = require('@noble/ciphers/aes.js');
  const { bytesToHex, utf8ToBytes } = require('@noble/hashes/utils.js');
  const key = crypto.randomBytes(32), nonce = crypto.randomBytes(12), aad = 'user.1:catalog', text = JSON.stringify({ label: 'Şəki rayonu', n: 1 });
  const sealed = seal(key, nonce, aad, text);
  assert.equal(sealed.v, 2);
  // Node's API is the one react-native-quick-crypto implements, so this mirrors cipher.native.ts.
  const body = Buffer.from(sealed.data, 'base64'), decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(sealed.nonce, 'base64'));
  decipher.setAAD(Buffer.from(aad)); decipher.setAuthTag(body.subarray(body.length - 16));
  assert.equal(Buffer.concat([decipher.update(body.subarray(0, body.length - 16)), decipher.final()]).toString('utf8'), text);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, nonce); cipher.setAAD(Buffer.from(aad));
  const native = { v: 2, nonce: nonce.toString('base64'), data: Buffer.concat([cipher.update(text, 'utf8'), cipher.final(), cipher.getAuthTag()]).toString('base64') };
  assert.equal(open(key, aad, native), text);
  const legacy = { nonce: bytesToHex(nonce), data: bytesToHex(gcm(key, nonce, utf8ToBytes(aad)).encrypt(utf8ToBytes(text))) };
  assert.equal(open(key, aad, legacy), text);
  assert.throws(() => open(key, 'user.2:catalog', sealed));
});

test('the first blocking step is reported so the form opens where the record is incomplete', () => {
  assert.equal(firstIssue(validData(), catalog), null);
  assert.equal(firstIssue({ ...validData(), adminUnitId: null }, catalog).step, 0);
  const badFin = { ...validData(), personal: { ...validData().personal, fin: 'abc' } };
  const issue = firstIssue(badFin, catalog);
  assert.equal(issue.step, 1); assert.match(issue.errors.fin, /FİN/);
});

test('an account address offers the user areas, held to the record settlement once it leaves "Formed"', () => {
  const book = memoryAddressBook({ adminUnits: [
    { id: 10, label: 'Rayon', countryId: 1031, canSelectAccount: false },
    { id: 11, parentId: 10, label: 'Kənd A', countryId: 1031, canSelectAccount: true, settlementId: 5 },
    { id: 12, parentId: 10, label: 'Kənd B', countryId: 1031, canSelectAccount: true, settlementId: 6 },
    { id: 13, parentId: 10, label: 'Kənd C', countryId: 1031, canSelectAccount: false },
  ] });
  const ids = scope => book.children(10, scope).filter(x => book.selectable(x, scope)).map(x => x.id);
  assert.deepEqual(ids({ account: true }), [11, 12]);
  assert.deepEqual(ids({ account: true, settlementId: 6 }), [12]);
  assert.deepEqual(book.children(null, { account: true, settlementId: 0 }), []);
});
