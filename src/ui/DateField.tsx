import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useContext, useState } from 'react';
import { Platform, Pressable, Text } from 'react-native';
import { fromISO, toISO } from '../lib/logic';
import { ThemeCtx, s as ui } from './index';

export type DateFieldProps = {
  value: string; // YYYY-MM-DD
  onChange: (iso: string) => void;
  label?: string;
};

/** Tap to open the OS date picker: calendar dialog on Android, inline calendar on iOS. */
export default function DateField({ value, onChange, label }: DateFieldProps) {
  const c = useContext(ThemeCtx);
  const [open, setOpen] = useState(false);
  const date = fromISO(value);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label ?? 'Pick a date'}
        accessibilityValue={{ text: value }}
        onPress={() => setOpen(true)}
        style={[ui.row, ui.field, { backgroundColor: c.card2, borderColor: c.border }]}
      >
        <Text style={{ color: c.text, fontSize: 15, flex: 1 }}>
          {date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
        </Text>
        <Text style={{ fontSize: 16 }}>📅</Text>
      </Pressable>

      {open && (
        <DateTimePicker
          value={date}
          mode="date"
          // ponytail: inline calendar on iOS 14+, system dialog elsewhere. Add a spinner fallback only if an old-iOS bug shows up.
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          maximumDate={new Date()}
          onChange={(e, picked) => {
            setOpen(false);
            if (e.type !== 'dismissed' && picked) onChange(toISO(picked));
          }}
        />
      )}
    </>
  );
}
