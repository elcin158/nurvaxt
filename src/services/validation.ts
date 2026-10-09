import { DateTime } from 'luxon';
import { PRAYER_FIELDS } from '../constants/prayers';
import { datasetSchema, type Dataset, prayerDaySchema } from '../types/data';
export type ValidationReport = {
  accepted: number;
  rejected: number;
  missing: number;
  cities: string[];
  dates: string[];
  errors: string[];
  warnings: string[];
  sourceReferences: string[];
  annualComplete: boolean;
};
export function validateDataset(input: unknown, knownLocations: string[]): ValidationReport {
  const parsed = datasetSchema.safeParse(input);
  const report: ValidationReport = {
    accepted: 0,
    rejected: 0,
    missing: 0,
    cities: [],
    dates: [],
    errors: [],
    warnings: [],
    sourceReferences: [],
    annualComplete: false,
  };
  if (!parsed.success) {
    report.errors.push(parsed.error.message);
    return report;
  }
  const data: Dataset = parsed.data;
  const seen = new Set<string>();
  const previous = new Map<string, Dataset['records'][number]>();
  for (const record of [...data.records].sort((a, b) => a.date.localeCompare(b.date))) {
    const issues: string[] = [];
    const date = DateTime.fromISO(record.date);
    if (!date.isValid || date.toISODate() !== record.date || date.year !== data.year)
      issues.push('invalid date/year');
    if (!knownLocations.includes(record.locationId)) issues.push('unsupported location');
    if (!data.supportedLocations.includes(record.locationId))
      issues.push('location metadata mismatch');
    if (record.sourceId !== data.sourceId || record.sourceVersion !== data.version)
      issues.push('source mapping mismatch');
    if (
      !data.sources.some(
        (s) => s.locationId === record.locationId && s.year === date.year && s.month === date.month,
      )
    )
      issues.push('missing source reference');
    if (!record.verified) issues.push('unverified record');
    if (!prayerDaySchema.safeParse(record).success) issues.push('invalid time');
    const key = `${record.locationId}/${record.date}`;
    if (seen.has(key)) issues.push('duplicate');
    seen.add(key);
    if (issues.length) {
      report.rejected++;
      report.errors.push(`${key}: ${issues.join(', ')}`);
      continue;
    }
    const prev = previous.get(record.locationId);
    if (prev && DateTime.fromISO(prev.date).plus({ days: 1 }).toISODate() === record.date) {
      for (const field of PRAYER_FIELDS) {
        const a = prev[field];
        const b = record[field];
        if (a && b) {
          const minutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
          const difference = Math.abs(minutes(a) - minutes(b));
          if (Math.min(difference, 1440 - difference) > 10)
            report.warnings.push(`${key}/${field}: neighboring-day review required`);
        }
      }
    }
    previous.set(record.locationId, record);
    report.accepted++;
  }
  report.cities = [...new Set(data.records.map((r) => r.locationId))];
  report.dates = [...new Set(data.records.map((r) => r.date))].sort();
  report.sourceReferences = data.sources.map((s) => s.reference);
  for (const source of data.sources) {
    const month = DateTime.local(source.year, source.month, 1);
    const covered = new Set(
      data.records
        .filter(
          (r) =>
            r.verified &&
            r.locationId === source.locationId &&
            r.date.startsWith(month.toFormat('yyyy-MM-')),
        )
        .map((r) => r.date),
    );
    for (let day = 1; day <= month.daysInMonth!; day++) {
      const date = month.set({ day }).toISODate()!;
      if (!covered.has(date))
        report.errors.push(
          `${source.locationId}/${date}: missing record inside reviewed source month`,
        );
    }
  }
  if (report.dates[0] !== data.dateRange.start || report.dates.at(-1) !== data.dateRange.end)
    report.errors.push('date-range metadata mismatch');
  if (
    report.cities.length !== data.supportedLocations.length ||
    data.supportedLocations.some((id) => !knownLocations.includes(id))
  )
    report.errors.push('supported-location metadata mismatch');
  const days = DateTime.local(data.year, 1, 1).daysInYear;
  report.missing = Math.max(0, days * knownLocations.length - report.accepted);
  report.annualComplete =
    report.missing === 0 && report.rejected === 0 && report.errors.length === 0;
  if (!report.annualComplete) report.warnings.push('Full annual coverage is NOT verified.');
  if (report.cities.length !== knownLocations.length)
    report.warnings.push(
      `Location coverage is incomplete: ${report.cities.length}/${knownLocations.length} regions.`,
    );
  return report;
}
