import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { test } from 'node:test';
const require = createRequire(import.meta.url);
const { appendEvents, eventsToServer, historyIssue, UNKNOWN_STEP } = require('../src/history/events.ts');
const { residentSteps } = require('../src/temporary-residents/history.ts');
const { householdSteps } = require('../src/households/history.ts');
const { ResidentStore } = require('../src/temporary-residents/store.ts');
const { newResidentData, pending } = require('../src/temporary-residents/types.ts');
const { newHouseholdData, newMember } = require('../src/households/types.ts');
const { acceptable } = require('../src/location/fix.ts');

const fix = (extra = {}) => ({ latitude: 40.409264, longitude: 49.867092, accuracy: 12, isMock: null, capturedAt: new Date().toISOString(), ...extra });
function store() {
  const values = new Map();
  return new ResidentStore({
    read: (owner, key) => values.get(`${owner}:${key}`) ?? null,
    write: (owner, key, value) => { values.set(`${owner}:${key}`, value); },
    list: owner => [...values.entries()].filter(([key]) => key.startsWith(`${owner}:draft:`)).map(([, value]) => value),
    remove: (owner, key) => { values.delete(`${owner}:${key}`); },
  }, 'user.1', randomUUID);
}
const state = { rootReportId: 7, reportId: 7, version: 2, status: 1, statusName: 'Formalaşmış', canEdit: true, returnReason: null };

test('a resident step save is named as the web history names it, with what changed', () => {
  const before = newResidentData(2026), after = { ...before, adminUnitId: 5, personal: { ...before.personal, firstName: 'Əli' } };
  assert.deepEqual(residentSteps(before, before), []);
  const steps = residentSteps(before, after);
  assert.deepEqual(steps.map(x => x.step), ['Şəxsi hesab', 'Şəxsin məlumatları']);
  assert.deepEqual(steps[1].changes, [{ entity: null, field: 'personal.firstName', oldValue: null, newValue: 'Əli' }]);
});
test('household records give one row each, removals their own, and server ids are not a change', () => {
  const before = { ...newHouseholdData(2026), members: [newMember('a', true), newMember('b', false)] };
  const after = { ...before, members: [{ ...before.members[0], id: 15 }, newMember('c', false)] };
  after.members[1].personal.firstName = 'Nərgiz';
  const steps = householdSteps(before, after);
  assert.deepEqual(steps.map(x => [x.step, x.changes[0].entity]), [['Təsərrüfat üzvü', 'c'], ['Təsərrüfat üzvü silindi', 'b']]);
});
test('saves of the same step in one sitting merge, keeping the first old value; a value set back drops out', () => {
  const t0 = '2026-10-13T08:00:00.000Z', t1 = '2026-10-13T08:05:00.000Z', t2 = '2026-10-13T09:00:00.000Z';
  const change = (field, oldValue, newValue) => ({ step: 'Torpaq məlumatı', changes: [{ entity: 'l', field, oldValue, newValue }] });
  let events = appendEvents([], [change('areas.1', '1.2', '1.5')], fix(), randomUUID, t0);
  events = appendEvents(events, [change('areas.1', '1.5', '1.8'), ], fix(), randomUUID, t1);
  assert.equal(events.length, 1);
  assert.deepEqual(events[0].changes, [{ entity: 'l', field: 'areas.1', oldValue: '1.2', newValue: '1.8' }]);
  events = appendEvents(events, [change('areas.1', '1.8', '1.2')], fix(), randomUUID, t1);
  assert.deepEqual(events[0].changes, []);
  events = appendEvents(events, [change('areas.1', '1.2', '2')], fix(), randomUUID, t2);
  assert.equal(events.length, 2);
});
test('a sync clears only the saves it sent; taking the server copy discards the rest', () => {
  const local = store(), draft = local.create(newResidentData(2026));
  local.record(draft.id, [{ step: 'Şəxsi hesab', changes: [] }], fix());
  const sent = local.get(draft.id);
  local.save(draft.id, { ...sent.data, adminUnitId: 3 });
  local.record(draft.id, [{ step: 'Heyvanlar', changes: [] }], fix());
  local.acknowledge(sent, { clientId: sent.id, revision: sent.revision, personalAccountNumber: 'X', state });
  assert.deepEqual(local.get(draft.id).events.map(x => x.step), ['Heyvanlar']);
  local.adopt(draft.id, 9, { accountNumber: 'X', address: null, state, actions: {}, data: newResidentData(2026) });
  assert.equal(local.get(draft.id).events, undefined);
});
test('a save without a GPS position holds the record back until a position confirms it', () => {
  const local = store(), draft = local.create(newResidentData(2026));
  assert.match(historyIssue(undefined, pending(draft)), /GPS/);
  local.record(draft.id, [{ step: 'Şəxsi hesab', changes: [] }], null);
  assert.match(historyIssue(local.get(draft.id).events, true), /GPS/);
  assert.deepEqual(eventsToServer(local.get(draft.id).events), []);
  local.record(draft.id, [], fix());
  const events = local.get(draft.id).events;
  assert.equal(historyIssue(events, true), undefined);
  assert.deepEqual(Object.keys(eventsToServer(events)[0]).sort(), ['at', 'changes', 'id', 'location', 'step']);
  assert.equal(UNKNOWN_STEP.length > 0, true);
});
test('only a real, recent GPS-grade position is taken', () => {
  assert.equal(acceptable(fix(), 50), true);
  assert.equal(acceptable(fix({ accuracy: 120 }), 50), false);
  assert.equal(acceptable(fix({ isMock: true }), 50), false);
  assert.equal(acceptable(fix({ capturedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString() }), 50), false);
});
