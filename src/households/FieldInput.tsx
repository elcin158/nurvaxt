import { Input, Select } from '../components/ResidentControls';
import { DateField } from '../components/DateField';
import { AddressFields } from '../temporary-residents/AddressFields';
import { fieldOptions, isAzerbaijan, type Errors, type Field } from './schema';
import type { FieldValue, HouseholdCatalog, PersonalData } from './types';
import { RadioGroup, Stepper } from './web';

/** One field of a household form, in the control the web form uses for its kind, with its paper form number. */
export function FieldInput({ field, data, catalog, errors, set, setAll, number }: {
  field: Field; data: PersonalData; catalog: HouseholdCatalog; errors: Errors; number?: string;
  set(name: string, value: FieldValue): void; setAll(data: PersonalData): void;
}) {
  const value = data[field.name];
  if (field.kind === 'address') return isAzerbaijan(field, data, catalog) ? <AddressFields prefix={field.name} label={field.label} data={data} catalog={catalog}
    errors={errors} domestic={field.domestic} required={field.required ?? !field.domestic} onChange={setAll} /> : null;
  if (field.kind === 'boolean') return <RadioGroup label={field.label} number={number} required={field.required} error={errors[field.name]} value={value}
    onChange={(v: boolean) => set(field.name, v)} />;
  if (field.kind === 'select') return <Select label={field.label} number={number} value={value as string | number | null} required={field.required} error={errors[field.name]}
    items={fieldOptions(field, data, catalog)} onChange={v => set(field.name, v)} />;
  if (field.kind === 'date') return <DateField label={field.label} number={number} value={String(value ?? '')} required={field.required} error={errors[field.name]}
    onChange={v => set(field.name, v || null)} />;
  // The web form's counts are number steppers.
  if (field.kind === 'integer') return <Stepper label={field.label} number={number} required={field.required} error={errors[field.name]}
    value={value == null ? '' : String(value)} onChange={v => set(field.name, v ? Number(v) : null)} />;
  if (field.kind === 'year') return <Input label={field.label} number={number} required={field.required} error={errors[field.name]}
    value={value == null ? '' : String(value)} maxLength={4} keyboardType="number-pad" placeholder="İİİİ"
    onChangeText={v => { const digits = v.replace(/\D/g, ''); set(field.name, digits ? Number(digits) : null); }} />;
  // Decimals are kept as typed, so "12," can be finished; they are parsed when sent.
  if (field.kind === 'decimal') return <Input label={field.label} number={number} required={field.required} error={errors[field.name]} value={String(value ?? '')}
    maxLength={14} keyboardType="decimal-pad" placeholder="Daxil edin" onChangeText={v => set(field.name, v.replace(/[^0-9.,]/g, '') || null)} />;
  return <Input label={field.label} number={number} required={field.required} error={errors[field.name]} value={String(value ?? '')} maxLength={field.maxLength}
    autoCapitalize={field.name === 'fin' ? 'characters' : 'sentences'}
    keyboardType={field.name === 'sharedOwnershipPersonalAccountNumber' ? 'number-pad' : 'default'}
    onChangeText={v => set(field.name, field.name === 'fin' ? v.toUpperCase().replace(/[^A-Z0-9]/g, '') : v)} />;
}
