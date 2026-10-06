import { View } from 'react-native';
import { Check, Input, Select } from '../components/ResidentControls';
import type { Catalog, PersonalData } from './types';
import type { Errors } from './schema';
export function AddressFields({ prefix = '', label = 'Ünvan', data, catalog, onChange, errors = {} }: {
  prefix?: string; label?: string; data: PersonalData; catalog: Catalog; onChange(value: PersonalData): void; errors?: Errors;
}) {
  const key = (suffix: string) => prefix ? `${prefix}${suffix}` : suffix[0].toLowerCase() + suffix.slice(1);
  const country = catalog.lookups.country?.find(x => x.id === data[key('CountryId')]);
  if (prefix && country?.code !== '031') return null;
  const admin = Number(data[key('AdminUnitId')]) || null, street = Number(data[key('ThroughFareId')]) || null;
  const isOther = data[key('AddressIsOther')] === true;
  const adminUnits = catalog.adminUnits.filter(x => prefix ? x.countryId === country?.id : x.canSelectAccount);
  return <View style={{ gap: 16 }}>
    <Select label={`${label} (inzibati ərazi)`} required value={admin} items={adminUnits} error={errors[key('AdminUnitId')]}
      onChange={value => onChange({ ...data, [key('AdminUnitId')]: value, [key('ThroughFareId')]: null, [key('EntranceId')]: null })} />
    {prefix !== 'birth' && !isOther && <>
      <Select label="Küçə / prospekt / döngə" disabled={!admin} value={street} items={catalog.streets.filter(x => x.adminUnitId === admin)} error={errors[key('ThroughFareId')]}
        onChange={value => onChange({ ...data, [key('ThroughFareId')]: value, [key('EntranceId')]: null })} />
      <Select label="Bina / ev" disabled={!street} value={Number(data[key('EntranceId')]) || null} items={catalog.entrances.filter(x => x.adminUnitId === admin && x.throughFareId === street)} error={errors[key('EntranceId')]}
        onChange={value => onChange({ ...data, [key('EntranceId')]: value })} />
    </>}
    <Check label="Digər ünvan" checked={isOther} onChange={() => onChange({ ...data, [key('AddressIsOther')]: !isOther,
      [key('AddressOtherNote')]: '', [key('ThroughFareId')]: null, [key('EntranceId')]: null })} />
    {isOther && <Input label="Ünvan üzrə qeyd" maxLength={300} value={String(data[key('AddressOtherNote')] ?? '')} onChangeText={value => onChange({ ...data, [key('AddressOtherNote')]: value })} />}
  </View>;
}
