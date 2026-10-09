import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { colors, Input, Select, type Choice } from '../components/ResidentControls';
import type { AdminScope } from '../reference/types';
import { AdminUnitPicker } from '../components/AdminUnitPicker';
import type { AddressCatalog, PersonalData, Street } from './types';
import type { Errors } from './schema';

// Tbu.Web's address block: the street list appears when the admin unit has streets and the
// entrance list when the street has entrances. "Digər" is the last option of both lists and
// stands in for the part the catalogue lacks; either one sets the block's single AddressIsOther
// and opens its one note. A street "Digər" keeps no street, an entrance "Digər" keeps the street.
const OTHER = 'other';
const SPACE = ' ';

/** Streets in tree order, children indented under their parent as on the web form. */
function streetOptions(streets: Street[]): Choice[] {
  const children = new Map<number | null, Street[]>();
  for (const street of streets) {
    const parent = streets.some(x => x.id === street.parentId) ? street.parentId ?? null : null;
    children.set(parent, [...children.get(parent) ?? [], street]);
  }
  const result: Choice[] = [];
  const walk = (parent: number | null, depth: number) => {
    for (const street of children.get(parent) ?? []) {
      result.push({ id: street.id, label: depth ? `${SPACE.repeat(depth * 3)}↳ ${street.label.trim()}` : street.label.trim() });
      walk(street.id, depth + 1);
    }
  };
  walk(null, 0);
  return result;
}

/** `domestic` is a block with no country of its own: always inside Azerbaijan, as the household return address. */
export function AddressFields({ prefix = '', label = 'Ünvan', data, catalog, onChange, errors = {}, domestic = false, required = !domestic }: {
  prefix?: string; label?: string; data: PersonalData; catalog: AddressCatalog; onChange(value: PersonalData): void; errors?: Errors; domestic?: boolean; required?: boolean;
}) {
  const key = (suffix: string) => prefix ? `${prefix}${suffix}` : suffix[0].toLowerCase() + suffix.slice(1);
  const country = domestic ? catalog.lookups.country?.find(x => x.code === '031') : catalog.lookups.country?.find(x => x.id === data[key('CountryId')]);
  const admin = Number(data[key('AdminUnitId')]) || null, street = Number(data[key('ThroughFareId')]) || null;
  const entrance = Number(data[key('EntranceId')]) || null, isOther = data[key('AddressIsOther')] === true;
  const book = catalog.addresses;
  // An account address offers the user's areas; any other block every unit of its country.
  const scope = useMemo<AdminScope>(() => prefix ? { countryId: country?.id ?? 0 } : { account: true }, [prefix, country?.id]);
  const unit = book.adminUnit(admin);
  const streets = useMemo(() => admin ? [...streetOptions(book.streets(admin)), { id: OTHER, label: 'Digər' }] : [], [book, admin]);
  const entrances = useMemo(() => admin && street ? [...book.entrances(admin, street), { id: OTHER, label: 'Digər' }] : [], [book, admin, street]);
  if (prefix && country?.code !== '031') return null;
  if (!book.ready) return <View style={{ gap: 8 }}>
    <Select label={`${label} (inzibati ərazi)`} required={required} value={null} items={[]} disabled error={errors[key('AdminUnitId')]} onChange={() => {}} />
    <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>Ünvanlar hələ bu cihaza yüklənməyib. Menyudakı «Arayışlar» bölməsindən yükləyin.</Text>
  </View>;
  // As on the web form, the birth place is an admin unit only: no street, entrance or note.
  const fullAddress = prefix !== 'birth';
  const selectedStreet = book.street(street);
  const streetIsOther = isOther && !street, entranceIsOther = isOther && !!street && !entrance;
  const showStreets = fullAddress && !!admin && (unit?.hasStreet || !!street || streetIsOther);
  const showEntrances = showStreets && !!street && (selectedStreet?.hasEntrance || !!entrance || entranceIsOther);
  // "X (inzibati ərazi)" names its note "X (qeyd)", as on the web form.
  const noteLabel = `${label} (qeyd)`;
  const set = (patch: PersonalData) => onChange({ ...data, ...patch });
  const summary = [book.path(admin).map(x => x.label).join(' / '), streetIsOther ? null : selectedStreet?.label.trim(),
    entranceIsOther ? null : book.entrance(entrance)?.label, isOther ? String(data[key('AddressOtherNote')] ?? '').trim() : null]
    .filter(Boolean).join(', ');
  return <View style={{ gap: 16 }}>
    <AdminUnitPicker label={`${label} (inzibati ərazi)`} required={required} value={admin} book={book} scope={scope} error={errors[key('AdminUnitId')]}
      onChange={value => { if (value !== admin) set({ [key('AdminUnitId')]: value, [key('ThroughFareId')]: null, [key('EntranceId')]: null, [key('AddressIsOther')]: false, [key('AddressOtherNote')]: '' }); }} />
    {showStreets && <Select label="Küçə / prospekt / yol" value={streetIsOther ? OTHER : street} items={streets} error={errors[key('ThroughFareId')]}
      onChange={value => value === OTHER
        ? set({ [key('ThroughFareId')]: null, [key('EntranceId')]: null, [key('AddressIsOther')]: true })
        : set({ [key('ThroughFareId')]: value, [key('EntranceId')]: null, [key('AddressIsOther')]: false, [key('AddressOtherNote')]: '' })} />}
    {showEntrances && <Select label="Giriş / ünvan nömrəsi" value={entranceIsOther ? OTHER : entrance} items={entrances} error={errors[key('EntranceId')]}
      onChange={value => value === OTHER
        ? set({ [key('EntranceId')]: null, [key('AddressIsOther')]: true })
        : set({ [key('EntranceId')]: value, [key('AddressIsOther')]: false, [key('AddressOtherNote')]: '' })} />}
    {fullAddress && isOther && <Input label={noteLabel} maxLength={300} value={String(data[key('AddressOtherNote')] ?? '')} error={errors[key('AddressOtherNote')]}
      onChangeText={value => set({ [key('AddressOtherNote')]: value })} />}
    {fullAddress && (!!street || isOther) && !!summary && <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>{summary}</Text>}
  </View>;
}
