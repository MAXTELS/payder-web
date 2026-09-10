'use client';

/**
 * Currency-amount entry field: digits only (no letters, no decimal point —
 * every amount in this app is a whole-Naira figure sent to the backend as a
 * plain numeric string), auto-formatted with thousands separators as the
 * user types (1000000 -> "1,000,000"). `value`/`onChange` always carry the
 * raw digit string with no separators — only the on-screen display is
 * formatted — so every call site's existing "amount" state and payload stay
 * exactly as they were.
 */
export function AmountInput({
  value,
  onChange,
  placeholder,
  className,
  id,
  required,
  disabled,
}: {
  value: string;
  onChange: (rawDigits: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  const display = value ? Number(value).toLocaleString('en-NG') : '';

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digitsOnly = e.target.value.replace(/[^0-9]/g, '');
    // Drop leading zeros (e.g. typing "0", "05", "050" -> "50") but don't
    // collapse a lone "0" so the field can still be cleared/typed from
    // scratch normally.
    const cleaned = digitsOnly.length > 1 ? digitsOnly.replace(/^0+/, '') || '0' : digitsOnly;
    onChange(cleaned);
  }

  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={display}
      onChange={handleChange}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      className={className}
    />
  );
}
