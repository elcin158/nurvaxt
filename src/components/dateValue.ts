export type DateFieldProps = { label: string; value: string; onChange(value: string): void; required?: boolean; error?: string };
export function localDateValue(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}
export function pickerDate(value: string): Date {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!parts) return new Date();
  const result = new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]), 12);
  return Number.isNaN(result.getTime()) ? new Date() : result;
}
