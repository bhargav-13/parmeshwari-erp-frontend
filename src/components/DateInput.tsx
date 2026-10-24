import React, { useEffect, useRef, useState } from 'react';
import { formatDate, parseDmy } from '../utils/format';

type DateInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> & {
  /** yyyy-mm-dd, or '' for no date — the same value a native date input uses */
  value: string | null | undefined;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
};

const ICON_WIDTH = 30;
const CALENDAR_ICON =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' " +
  "fill='none' stroke='%235b6b7a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E" +
  "%3Crect x='3' y='4' width='18' height='18' rx='2'/%3E%3Cline x1='16' y1='2' x2='16' y2='6'/%3E" +
  "%3Cline x1='8' y1='2' x2='8' y2='6'/%3E%3Cline x1='3' y1='10' x2='21' y2='10'/%3E%3C/svg%3E\")";

const toText = (value: string | null | undefined) => (value ? formatDate(value) : '');

/**
 * A date field that always shows and accepts dd/mm/yyyy. The browser's own date input follows the
 * computer's language (mm/dd/yyyy on most Windows machines), so this shows the date as text with a
 * calendar icon that opens a hidden native input's calendar. Drop-in for <input type="date">: it is
 * the same single input element (same classes and layout), and value/onChange still use yyyy-mm-dd.
 */
const DateInput: React.FC<DateInputProps> = ({
  value,
  onChange,
  name,
  min,
  max,
  disabled,
  placeholder = 'dd/mm/yyyy',
  style,
  onBlur,
  onClick,
  onKeyDown,
  ...rest
}) => {
  const [text, setText] = useState(toText(value));
  const pickerRef = useRef<HTMLInputElement>(null);

  // Follow the value when it changes from outside (a reset, an edit form loading)
  useEffect(() => {
    setText(toText(value));
  }, [value]);

  const emit = (iso: string) => {
    if (!onChange) return;
    const target = { name: name ?? '', value: iso, type: 'date' } as unknown as HTMLInputElement;
    onChange({ target, currentTarget: target } as React.ChangeEvent<HTMLInputElement>);
  };

  const handleType = (e: React.ChangeEvent<HTMLInputElement>) => {
    let next = e.target.value.replace(/[^\d/]/g, '').slice(0, 10);
    if (/^\d{3,8}$/.test(next)) {
      // Digits only, typed fast or pasted: 24102026 -> 24/10/2026
      next = [next.slice(0, 2), next.slice(2, 4), next.slice(4)].filter(Boolean).join('/');
    }
    // Add the slashes while typing forward: 2410 -> 24/10/
    if (next.length > text.length && /^\d{2}$|^\d{1,2}\/\d{2}$/.test(next)) {
      next += '/';
    }
    setText(next);
    if (next === '') {
      emit('');
      return;
    }
    const iso = parseDmy(next);
    if (iso) emit(iso);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Half-typed or impossible dates go back to the last valid value
    if (text !== '' && !parseDmy(text)) setText(toText(value));
    onBlur?.(e);
  };

  const openCalendar = () => {
    const picker = pickerRef.current;
    if (!picker || disabled) return;
    try {
      picker.showPicker();
    } catch {
      picker.focus();
      picker.click();
    }
  };

  return (
    <>
      <input
        {...rest}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        name={name}
        value={text}
        placeholder={placeholder}
        disabled={disabled}
        onChange={handleType}
        onBlur={handleBlur}
        onClick={(e) => {
          // The calendar icon is drawn at the right edge of the box
          if (e.nativeEvent.offsetX > e.currentTarget.clientWidth - ICON_WIDTH) openCalendar();
          onClick?.(e);
        }}
        onKeyDown={(e) => {
          if (e.altKey && e.key === 'ArrowDown') openCalendar();
          onKeyDown?.(e);
        }}
        title={rest.title ?? 'dd/mm/yyyy — click the calendar icon to pick a date'}
        style={{
          backgroundImage: CALENDAR_ICON,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 9px center',
          backgroundSize: '14px 14px',
          paddingRight: ICON_WIDTH,
          ...style,
        }}
      />
      {/* Only for its calendar; no left/top keeps it right after the box, taking no space */}
      <input
        ref={pickerRef}
        type="date"
        value={value || ''}
        min={min}
        max={max}
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => emit(e.target.value)}
        style={{
          position: 'absolute',
          width: 0,
          height: 0,
          padding: 0,
          margin: 0,
          border: 0,
          opacity: 0,
          pointerEvents: 'none',
        }}
      />
    </>
  );
};

export default DateInput;
