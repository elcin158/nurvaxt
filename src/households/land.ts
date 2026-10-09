// HouseholdLandCalculator and HouseholdLandUsageCatalog of the server, line for line, so the
// land form shows the same totals offline and refuses what the server would refuse.
export const LAND = {
  agricultural: '1', owned: '1.1', homestead: '1.1.1', rented: '1.2', rentedFromState: '1.2.1', rentedFromMunicipality: '1.2.2',
  rentedFromPrivate: '1.2.3', gratuitous: '1.3', otherUsed: '1.4', rentedOut: '1.5', farmTotal: '1.6', irrigated: '1.7',
  surfaceWater: '1.7.1', gravity: '1.7.1.1', pumped: '1.7.1.2', groundwater: '1.7.2', artesian: '1.7.2.1', subartesian: '1.7.2.2',
  irrigationMethods: '1.8', traditional: '1.8.1', modern: '1.8.2', rainSprinkling: '1.8.2.1', pivot: '1.8.2.1.1',
  sprinkler: '1.8.2.1.2', otherRain: '1.8.2.1.3', drip: '1.8.2.2', usage: '2', forest: '3', other: '4', grandTotal: '5', aquaculture: '6',
} as const;
export const MAX_AREA = 9999999999.99;

export const METRIC_LABELS: Record<string, string> = {
  AreaHa: 'Cəmi', HomesteadAreaHa: 'Ondan həyətyanı sahədə', SownAreaHa: 'Əkilmiş sahə (ha)', HomesteadSownAreaHa: 'Ondan həyətyanı sahədə',
  HarvestKg: 'Yığılmış məhsul (kq)', HomesteadHarvestKg: 'Ondan həyətyanı sahədə', RepeatedSownAreaHa: 'Təkrar əkin sahəsi (ha)',
  RepeatedHarvestKg: 'Təkrar əkindən yığılmış məhsul (kq)', RentedAreaHa: 'İcarəyə götürülmüş örüş sahəsi (cəmi) (2.3.1)',
  RentedHomesteadAreaHa: 'Ondan həyətyanı sahədə',
};
/** "Ondan" metrics: each is a part of another metric of the same entry and may not exceed it. */
export const METRIC_PARTS = [
  { metric: 'HomesteadAreaHa', whole: 'AreaHa', message: 'Ondan həyətyanı sahə cəmi sahədən böyük ola bilməz.' },
  { metric: 'HomesteadSownAreaHa', whole: 'SownAreaHa', message: 'Ondan həyətyanı sahədə əkilmiş sahə əkilmiş sahədən böyük ola bilməz.' },
  { metric: 'HomesteadHarvestKg', whole: 'HarvestKg', message: 'Ondan həyətyanı sahədən yığılmış məhsul yığılmış məhsuldan böyük ola bilməz.' },
  { metric: 'RentedAreaHa', whole: 'AreaHa', message: 'İcarəyə götürülmüş örüş sahəsi örüşlərin cəmi sahəsindən böyük ola bilməz.' },
  { metric: 'RentedHomesteadAreaHa', whole: 'RentedAreaHa', message: 'Ondan həyətyanı sahə icarəyə götürülmüş örüş sahəsindən böyük ola bilməz.' },
];
const LAND_METRICS = ['AreaHa', 'HomesteadAreaHa'];
const PLANTING = [...LAND_METRICS, 'SownAreaHa', 'HomesteadSownAreaHa'];
const ANNUAL = [...PLANTING, 'RepeatedSownAreaHa'];
const PERENNIAL_CROP = [...PLANTING, 'HarvestKg', 'HomesteadHarvestKg'];
const ANNUAL_CROP = [...PERENNIAL_CROP, 'RepeatedSownAreaHa', 'RepeatedHarvestKg'];
const PASTURE = [...LAND_METRICS, 'RentedAreaHa', 'RentedHomesteadAreaHa'];

export type UsageCategory = { code: string; parent: string | null; label: string; metrics: string[]; rows?: { add: string; type: string } };
const c = (code: string, parent: string | null, label: string, metrics: string[], rows?: [string, string]): UsageCategory =>
  ({ code, parent, label, metrics, rows: rows && { add: rows[0], type: rows[1] } });
/** Form order. The codes are those of the land category catalogue. */
export const USAGE: UsageCategory[] = [
  c('2', null, 'Torpaqdan istifadə', ANNUAL),
  c('2.1', '2', 'Birillik bitkilər', ANNUAL),
  c('2.1.1', '2.1', 'Dənli (çəltikdən başqa), paxlalı və yağlı bitkilər', ANNUAL_CROP),
  c('2.1.1.1', '2.1.1', 'Dənli bitkilər', ANNUAL_CROP, ['Dənli bitki əlavə et', 'Dənli bitkinin növü']),
  c('2.1.1.2', '2.1.1', 'Paxlalı bitkilər', ANNUAL_CROP, ['Paxlalı bitki əlavə et', 'Paxlalı bitkinin növü']),
  c('2.1.1.3', '2.1.1', 'Yağlı bitkilər', ANNUAL_CROP, ['Yağlı bitki əlavə et', 'Yağlı bitkinin növü']),
  c('2.1.2', '2.1', 'Təmizlənməmiş çəltik', ANNUAL_CROP),
  c('2.1.3', '2.1', 'Tərəvəz, bostan, kökümeyvəlilər və köküyumrular', ANNUAL_CROP, ['Tərəvəz, bostan, kökümeyvəli və ya köküyumru əlavə et', 'Bitkinin növü']),
  c('2.1.4', '2.1', 'Fermentasiya edilməmiş tütün', ANNUAL_CROP),
  c('2.1.5', '2.1', 'Pambıq', ANNUAL_CROP),
  c('2.1.6', '2.1', 'Yem bitkiləri', ANNUAL_CROP, ['Yem bitkisi əlavə et', 'Yem bitkisinin növü']),
  c('2.2', '2', 'Çoxillik əkmələr', PLANTING),
  c('2.2.1', '2.2', 'Meyvələr', PERENNIAL_CROP),
  c('2.2.1.1', '2.2.1', 'Tumlu və çəyirdəkli meyvələr', PERENNIAL_CROP, ['Tumlu və ya çəyirdəkli meyvə əlavə et', 'Meyvənin növü']),
  c('2.2.1.2', '2.2.1', 'Qərzəkli meyvələr', PERENNIAL_CROP, ['Qərzəkli meyvə əlavə et', 'Meyvənin növü']),
  c('2.2.1.3', '2.2.1', 'Tropik və subtropik meyvələr', PERENNIAL_CROP, ['Tropik və ya subtropik meyvə əlavə et', 'Meyvənin növü']),
  c('2.2.1.4', '2.2.1', 'Yağlı meyvələr', PERENNIAL_CROP, ['Yağlı meyvə əlavə et', 'Meyvənin növü']),
  c('2.2.1.5', '2.2.1', 'Sitrus meyvələri', PERENNIAL_CROP, ['Sitrus meyvəsi əlavə et', 'Meyvənin növü']),
  c('2.2.2', '2.2', 'Giləmeyvələr', PERENNIAL_CROP, ['Giləmeyvə əlavə et', 'Giləmeyvənin növü']),
  c('2.2.3', '2.2', 'Üzüm', PERENNIAL_CROP, ['Üzüm əlavə et', 'Üzümün növü']),
  c('2.2.4', '2.2', 'Yaşıl çay yarpağı', PERENNIAL_CROP),
  c('2.2.5', '2.2', 'Digər çoxillik bitkilər', PERENNIAL_CROP),
  c('2.3', '2', 'Örüşlər', PASTURE),
  c('2.4', '2', 'Biçənəklər', LAND_METRICS),
  c('2.5', '2', 'Dincə qoyulmuş torpaqlar', LAND_METRICS),
  c('2.6', '2', 'Əkilməyən torpaqlar', LAND_METRICS),
];
export const usageChildren = (code: string) => USAGE.filter(x => x.parent === code);
export const usageCategory = (code: string) => USAGE.find(x => x.code === code);
/** A category without children or crop rows takes its values directly. */
export const takesDirectValues = (category: UsageCategory) => !category.rows && !usageChildren(category.code).length;

// Money-style rounding to two places, away from zero, as decimal.Round(…, MidpointRounding.AwayFromZero).
export const round = (value: number) => Math.sign(value) * Math.round((Math.abs(value) + Number.EPSILON) * 100) / 100;
/** A decimal typed on the form: comma or dot, blank as zero. NaN when it is not a number. */
export const parseDecimal = (value: string | number | null | undefined) => {
  if (typeof value === 'number') return value;
  const text = String(value ?? '').trim().replace(',', '.');
  if (!text) return 0;
  return /^\d*\.?\d*$/.test(text) ? Number(text) : NaN;
};

export type UsageEntry = { code: string; metrics: Record<string, number> };
/** Totals every usage category per metric from its own entries and its children's totals. */
export function usageTotals(entries: UsageEntry[]): Record<string, Record<string, number>> {
  const totals: Record<string, Record<string, number>> = {};
  const total = (category: UsageCategory): Record<string, number> => {
    const sums: Record<string, number> = Object.fromEntries(category.metrics.map(m => [m, 0]));
    const add = (values: Record<string, number>) => { for (const m of category.metrics) if (values[m] !== undefined) sums[m] += round(values[m]); };
    entries.filter(x => x.code === category.code).forEach(x => add(x.metrics));
    usageChildren(category.code).forEach(child => add(total(child)));
    const result = Object.fromEntries(Object.entries(sums).map(([k, v]) => [k, round(v)]));
    totals[category.code] = result;
    return result;
  };
  total(USAGE[0]);
  return totals;
}

export type LandCalculation = { farmTotal: number; irrigatedTotal: number; irrigationMethodsTotal: number; usageTotal: number; grandTotal: number; values: Record<string, number> };
/** The computed land categories from the entered ones (by code) and the usage totals. */
export function calculateLand(values: Record<string, number>, usage: Record<string, Record<string, number>>): LandCalculation {
  const v = (code: string) => round(values[code] ?? 0);
  const sum = (codes: string[]) => round(codes.reduce((s, code) => s + v(code), 0));
  const rented = sum([LAND.rentedFromState, LAND.rentedFromMunicipality, LAND.rentedFromPrivate]);
  const farmTotal = round(v(LAND.owned) + rented + v(LAND.gratuitous) + v(LAND.otherUsed) - v(LAND.rentedOut));
  const surface = sum([LAND.gravity, LAND.pumped]), ground = sum([LAND.artesian, LAND.subartesian]);
  const irrigated = round(surface + ground);
  const rain = sum([LAND.sprinkler, LAND.pivot, LAND.otherRain]);
  const modern = round(rain + v(LAND.drip));
  const methods = round(v(LAND.traditional) + modern);
  const usageTotal = usage[LAND.usage]?.AreaHa ?? 0;
  const grandTotal = round(farmTotal + v(LAND.forest) + v(LAND.aquaculture) + v(LAND.other));
  return {
    farmTotal, irrigatedTotal: irrigated, irrigationMethodsTotal: methods, usageTotal, grandTotal,
    values: { [LAND.agricultural]: farmTotal, [LAND.rented]: rented, [LAND.farmTotal]: farmTotal, [LAND.surfaceWater]: surface,
      [LAND.groundwater]: ground, [LAND.irrigated]: irrigated, [LAND.rainSprinkling]: rain, [LAND.modern]: modern,
      [LAND.irrigationMethods]: methods, [LAND.usage]: usageTotal, [LAND.grandTotal]: grandTotal },
  };
}
