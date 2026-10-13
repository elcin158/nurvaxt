import type { Fix } from '../location/fix';

/** One field a step save changed; `entity` is the device key of the member, building or land it belongs to. */
export type FieldChange = { entity: string | null; field: string; oldValue: string | null; newValue: string | null };
/**
 * A step saved on the device, as Tbu.Web records a "Yadda saxla": the step's name as the web
 * history writes it, when and where it was saved, and what it changed. It goes with the next sync
 * and becomes that history row on the server. `location` is null until a GPS position confirms it.
 */
export type HistoryEvent = { id: string; at: string; step: string; location: Fix | null; changes: FieldChange[] };
/** What a module's diff finds between two copies of its data: one entry per web history row. */
export type StepChange = { step: string; changes: FieldChange[] };

const MAX_VALUE = 1000, MAX_CHANGES = 500;
/** Saves of the same step and record this close together are one sitting, as one web save would be. */
const MERGE_MS = 10 * 60 * 1000;
/** Text written on the device's own history row when the step is not known (a record saved before the history existed). */
export const UNKNOWN_STEP = 'Cihazda saxlanmış dəyişikliklər';

/** Every leaf value by its path; list items by their device key. Empty values are absent, as the forms store them. */
function flatten(value: unknown, prefix = '', out: Record<string, string> = {}): Record<string, string> {
  if (value === null || value === undefined || value === '') return out;
  if (Array.isArray(value)) {
    value.forEach((item, index) => flatten(item, `${prefix}[${item && typeof item === 'object' && 'key' in item ? String(item.key) : index}]`, out));
    return out;
  }
  if (typeof value === 'object') {
    // The device key names the record; the server id is filled in by a sync, not by the operator.
    for (const [key, item] of Object.entries(value)) if (key !== 'key' && key !== 'id') flatten(item, prefix ? `${prefix}.${key}` : key, out);
    return out;
  }
  out[prefix] = String(value);
  return out;
}
const clip = (value: string | undefined) => value === undefined ? null : value.length > MAX_VALUE ? value.slice(0, MAX_VALUE) : value;
export function fieldChanges(before: unknown, after: unknown, entity: string | null = null): FieldChange[] {
  const a = flatten(before), b = flatten(after);
  return [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(key => a[key] !== b[key]).sort()
    .map(field => ({ entity, field, oldValue: clip(a[field]), newValue: clip(b[field]) }));
}
/** A list step: one row per record saved, and one per record removed, as the web writes them. */
export function recordChanges<T extends { key: string }>(before: T[], after: T[], saved: string, removed: string): StepChange[] {
  const old = new Map(before.map(item => [item.key, item])), keys = new Set(after.map(item => item.key));
  const result: StepChange[] = [];
  for (const item of after) {
    const changes = fieldChanges(old.get(item.key), item, item.key);
    if (changes.length) result.push({ step: saved, changes });
  }
  for (const item of before) if (!keys.has(item.key)) result.push({ step: removed, changes: fieldChanges(item, undefined, item.key) });
  return result;
}
export const stepChange = (step: string, before: unknown, after: unknown): StepChange[] => {
  const changes = fieldChanges(before, after);
  return changes.length ? [{ step, changes }] : [];
};

const entityOf = (event: { changes: FieldChange[] }) => event.changes[0]?.entity ?? null;
/** Adds the step saves to a record's history; a save continuing the last one is merged into it. */
export function appendEvents(events: HistoryEvent[] | undefined, steps: StepChange[], location: Fix | null, uuid: () => string, now: string): HistoryEvent[] {
  const list = [...events ?? []];
  for (const step of steps) {
    const last = list[list.length - 1];
    if (last && last.step === step.step && entityOf(last) === entityOf(step) && Date.parse(now) - Date.parse(last.at) <= MERGE_MS) {
      list[list.length - 1] = { ...last, at: now, location: location ?? last.location, changes: merge(last.changes, step.changes) };
      continue;
    }
    list.push({ id: uuid(), at: now, step: step.step, location, changes: step.changes.slice(0, MAX_CHANGES) });
  }
  return list;
}
/** The first value a field had and the last it was given; a field set back to where it was drops out. */
function merge(first: FieldChange[], then: FieldChange[]): FieldChange[] {
  const result = new Map(first.map(change => [`${change.entity}|${change.field}`, change]));
  for (const change of then) {
    const key = `${change.entity}|${change.field}`, earlier = result.get(key);
    result.set(key, earlier ? { ...earlier, newValue: change.newValue } : change);
  }
  return [...result.values()].filter(change => change.oldValue !== change.newValue).slice(0, MAX_CHANGES);
}
/** A position taken at the record confirms the saves still waiting for one. */
export const locateEvents = (events: HistoryEvent[] | undefined, location: Fix) =>
  (events ?? []).map(event => event.location ? event : { ...event, location });
/** Why a record cannot be sent yet, if its history is not ready. */
export function historyIssue(events: HistoryEvent[] | undefined, pendingData: boolean): string | undefined {
  if (pendingData && !events?.length || events?.some(event => !event.location))
    return 'Dəyişikliklər GPS məkanı ilə təsdiqlənməyib. Qeydi açın və GPS tutulduqdan sonra bağlayın.';
  if ((events?.length ?? 0) > 200) return 'Göndərilməmiş addım çox olduğu üçün qeyd göndərilə bilmir.';
  return undefined;
}
/** The request form of the device's history: the server takes each entry as one history row. */
export const eventsToServer = (events: HistoryEvent[] | undefined) => (events ?? []).filter(event => event.location).map(event => ({
  id: event.id, at: event.at, step: event.step, changes: event.changes,
  location: { latitude: event.location!.latitude, longitude: event.location!.longitude, accuracy: event.location!.accuracy,
    isMock: event.location!.isMock, capturedAt: event.location!.capturedAt },
}));
