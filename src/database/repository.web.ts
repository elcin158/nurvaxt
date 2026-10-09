// Browser preview uses the same verified package. Native Android/iOS use indexed SQLite queries.
import * as Crypto from 'expo-crypto';
import { datasetSchema, type PrayerDay, type Dataset } from '../types/data';
import { validateDataset } from '../services/validation';
import locations from '../../data/locations.json';
import { webDatasets } from './webRecords';
export async function assertDataset(input: unknown) {
  const data = datasetSchema.parse(input);
  const report = validateDataset(
    data,
    locations.map((l) => l.id),
  );
  if (report.errors.length || report.rejected) throw new Error('Təqvim məlumatları yoxlanmadı.');
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    JSON.stringify(data.records),
  );
  if (hash !== data.checksum) throw new Error('Məlumatların bütövlüyü pozulub.');
  return data;
}
let ready: Promise<Dataset[]> | undefined;
export function getDatabase() {
  return (ready ??= Promise.all(webDatasets.map(assertDataset)));
}
export async function readDays(
  locationId: string,
  start: string,
  end: string,
): Promise<PrayerDay[]> {
  const data = await getDatabase();
  return data.flatMap((d) =>
    d.records.filter(
      (r) => r.verified && r.locationId === locationId && r.date >= start && r.date <= end,
    ),
  );
}
export async function readMetadata(year: number): Promise<Omit<Dataset, 'records'> | null> {
  const data = (await getDatabase()).find((d) => d.year === year);
  if (!data) return null;
  const { records: _r, ...metadata } = data;
  return metadata;
}
