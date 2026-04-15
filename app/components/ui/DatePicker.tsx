import React from 'react';

export interface DatePickerProps {
  label?: string;
  value?: string; // YYYY-MM-DD
  onChange?: (value: string) => void;
  min?: string;
  max?: string;
  required?: boolean;
  error?: string;
}


export function DatePicker({ label, value = '', onChange, min, max, required, error }: DatePickerProps) {
  return (
    <div className="w-full flex flex-col space-y-2">
      {label && (
        <label className="font-[family-name:var(--font-pixel)] text-[10px] text-pixel-gold uppercase tracking-[2px] leading-relaxed">
          {label}
        </label>
      )}
      <input
        type="date"
        className={`
          w-full px-4 py-3
          bg-pixel-black border-[3px] text-pixel-slate-light
          font-[family-name:var(--font-vt)] text-[22px]
          outline-none transition-colors duration-100
          [box-shadow:inset_2px_2px_0_rgba(0,0,0,0.5)]
          cursor-pointer
          ${error
            ? 'border-pixel-red focus:border-pixel-red'
            : 'border-pixel-border focus:border-pixel-cyan-dim'
          }
          [color-scheme:dark]
        `}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        min={min}
        max={max}
        required={required}
      />
      {error && (
        <span className="font-[family-name:var(--font-pixel)] text-[12px] text-pixel-red tracking-wide leading-relaxed">
          ⚠ {error}
        </span>
      )}
    </div>
  );
}

