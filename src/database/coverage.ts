import { DateTime } from 'luxon';
import { bundledDatasets, currentDataset } from './bundled';
import { locationName } from '../features/locations/locations';
import { MONTHS } from '../localization/dates';
import type { DatasetSummary } from '../types/data';

export function coverageLabel(data: DatasetSummary) {
  const start = DateTime.fromISO(data.dateRange.start);
  const end = DateTime.fromISO(data.dateRange.end);
  const place =
    data.supportedLocations.length === 1
      ? locationName(data.supportedLocations[0]!)
      : `${data.supportedLocations.length} bölgə`;
  const range =
    start.month === end.month
      ? `${start.day}–${end.day} ${MONTHS[start.month - 1]} ${data.year}`
      : `${start.day} ${MONTHS[start.month - 1]} – ${end.day} ${MONTHS[end.month - 1]} ${data.year}`;
  return `${place} · ${range}`;
}
export const latestCoverage = coverageLabel(currentDataset);
export const availableCoverage = bundledDatasets.map(coverageLabel).join('\n');
export const coveredLocations = new Set(bundledDatasets.flatMap((data) => data.supportedLocations));
