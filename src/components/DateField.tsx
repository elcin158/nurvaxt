import { Input } from './ResidentControls';
import type { DateFieldProps } from './dateValue';
export function DateField({ onChange, ...props }: DateFieldProps) {
  return <Input {...props} placeholder="İİİİ-AA-GG" maxLength={10} onChangeText={onChange} />;
}
