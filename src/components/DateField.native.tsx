import { useState } from 'react';
import { Modal, Platform, Pressable, Text, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Button, colors, FieldShell, ui, useReadOnly } from './ResidentControls';
import { localDateValue, pickerDate, type DateFieldProps } from './dateValue';
export function DateField({ label, value, onChange, required, error, number }: DateFieldProps) {
  const [open, setOpen] = useState(false), [selected, setSelected] = useState(new Date()), readOnly = useReadOnly();
  function show() {
    const date = pickerDate(value);
    if (Platform.OS === 'android') DateTimePickerAndroid.open({ value: date, mode: 'date', maximumDate: new Date(),
      onValueChange: (_, next) => onChange(localDateValue(next)), positiveButton: { label: 'Seç' }, negativeButton: { label: 'Ləğv et' } });
    else { setSelected(date); setOpen(true); }
  }
  return <FieldShell label={label} required={required} error={error} number={number}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value || 'Tarix seçin'}`} accessibilityState={{ disabled: readOnly }} disabled={readOnly}
      onPress={show} style={[ui.input, ui.select, readOnly && ui.selectDisabled]}>
      <Text style={[ui.label, !value && { color: colors.muted }]}>{value ? value.split('-').reverse().join('.') : readOnly ? '' : 'Tarix seçin'}</Text><Text style={{ color: colors.muted }}>▦</Text>
    </Pressable>
    {Platform.OS === 'ios' && <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <View style={{ flex: 1, backgroundColor: '#0006', justifyContent: 'center', padding: 20 }}><View style={{ backgroundColor: '#FFF', padding: 20, borderRadius: 12, gap: 16 }}>
        <Text style={ui.modalTitle}>{label}</Text><DateTimePicker value={selected} mode="date" display="spinner" maximumDate={new Date()} themeVariant="light" onValueChange={(_, date) => setSelected(date)} />
        <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'flex-end' }}><Button secondary label="Ləğv et" onPress={() => setOpen(false)} /><Button label="Seç" onPress={() => { onChange(localDateValue(selected)); setOpen(false); }} /></View>
      </View></View>
    </Modal>}
    {!required && !readOnly && !!value && <Pressable onPress={() => onChange('')} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: colors.primary }}>Tarixi təmizlə</Text></Pressable>}
  </FieldShell>;
}
