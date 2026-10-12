import coordinates from '../../../data/coordinates.json';
/** Masjid al-Haram, the Kaaba (WGS84). */
export const KAABA = { latitude: 21.4225, longitude: 39.8262 };
/**
 * Magnetometers read magnetic north; the Qibla bearing is measured from true north. Declination
 * over Azerbaijan runs about +6.0° (Naxçıvan) to +7.0° (Xaçmaz) this decade, so a single constant
 * keeps the correction inside one degree anywhere the timetable ships.
 */
export const MAGNETIC_DECLINATION = 6.5;
const EARTH_RADIUS_KM = 6371;
const radians = (degrees: number) => (degrees * Math.PI) / 180;
const degrees = (value: number) => (value * 180) / Math.PI;
export const normalizeAngle = (value: number) => ((value % 360) + 360) % 360;
export type Coordinates = { latitude: number; longitude: number };
export type Vector = { x: number; y: number; z: number };
/** District-centre coordinates, kept apart from the QMİ timetable file the importer rewrites. */
export function locationCoordinates(id: string): Coordinates | null {
  const pair = (coordinates as Record<string, number[] | undefined>)[id];
  return pair?.length === 2 ? { latitude: pair[0]!, longitude: pair[1]! } : null;
}
/** Initial great-circle bearing to the Kaaba, in degrees clockwise from true north. */
export function qiblaBearing(from: Coordinates): number {
  const latitude = radians(from.latitude);
  const target = radians(KAABA.latitude);
  const delta = radians(KAABA.longitude - from.longitude);
  const y = Math.sin(delta) * Math.cos(target);
  const x =
    Math.cos(latitude) * Math.sin(target) - Math.sin(latitude) * Math.cos(target) * Math.cos(delta);
  return normalizeAngle(degrees(Math.atan2(y, x)));
}
/** Great-circle distance to the Kaaba in kilometres. */
export function distanceToKaaba(from: Coordinates): number {
  const latitude = radians(from.latitude);
  const target = radians(KAABA.latitude);
  const dLat = target - latitude;
  const dLon = radians(KAABA.longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(latitude) * Math.cos(target) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}
/** Signed turn from where the phone points to the Qibla: negative is left, positive is right. */
export function bearingDelta(heading: number, bearing: number) {
  return ((bearing - heading + 540) % 360) - 180;
}
const POINTS = [
  'şimal',
  'şimal-şərq',
  'şərq',
  'cənub-şərq',
  'cənub',
  'cənub-qərb',
  'qərb',
  'şimal-qərb',
];
export function compassPoint(bearing: number) {
  return POINTS[Math.round(normalizeAngle(bearing) / 45) % 8]!;
}
const cross = (a: Vector, b: Vector): Vector => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
const length = (v: Vector) => Math.hypot(v.x, v.y, v.z);
/**
 * Magnetic heading of the phone's top edge, levelled against gravity so a tilted phone still
 * reads true. This is Android's getRotationMatrix/getOrientation construction: east is the
 * field crossed with gravity, north is gravity crossed with east, and the azimuth falls out of
 * their y components. Returns null while either vector is too short to define an axis.
 */
export function magneticHeading(field: Vector, gravity: Vector): number | null {
  const down = length(gravity);
  if (down < 1e-6) return null;
  const level = { x: gravity.x / down, y: gravity.y / down, z: gravity.z / down };
  const east = cross(field, level);
  if (length(east) < 1e-6) return null;
  const north = cross(level, east);
  return normalizeAngle(degrees(Math.atan2(east.y, north.y)));
}
