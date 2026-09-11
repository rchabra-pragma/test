import React, { useContext } from 'react';
import { ThemeCtx, dark } from './index';
import type { DateFieldProps } from './DateField';

/** Web: the browser's own date input — a real calendar popover on every desktop and mobile browser, zero JS. */
export default function DateField({ value, onChange, label }: DateFieldProps) {
  const c = useContext(ThemeCtx);
  return (
    <input
      type="date"
      aria-label={label ?? 'Date'}
      value={value}
      max={new Date().toISOString().slice(0, 10)}
      onChange={(e) => e.target.value && onChange(e.target.value)}
      style={{
        color: c.text,
        backgroundColor: c.card2,
        border: `1px solid ${c.border}`,
        borderRadius: 13,
        padding: '12px 14px',
        fontSize: 15,
        fontFamily: 'inherit',
        width: '100%',
        boxSizing: 'border-box',
        colorScheme: c === dark ? 'dark' : 'light',
      }}
    />
  );
}
