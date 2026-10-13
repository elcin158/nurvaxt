/** A GPS position as recorded with an action. `accuracy` is the device's error radius in metres. */
export type Fix = { latitude: number; longitude: number; accuracy: number; isMock: boolean | null; capturedAt: string };
export const DEFAULT_MAX_ACCURACY = 50;
/** A position older than this no longer says where the operator is. */
export const MAX_AGE_MS = 5 * 60 * 1000;
/** GPS-grade, real and recent: what the server accepts. */
export const acceptable = (fix: Fix | null, maxAccuracy: number, now = Date.now()): fix is Fix =>
  !!fix && fix.isMock !== true && fix.accuracy > 0 && fix.accuracy <= maxAccuracy && now - Date.parse(fix.capturedAt) <= MAX_AGE_MS;
