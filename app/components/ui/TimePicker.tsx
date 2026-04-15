import React from 'react';

interface TimePickerProps {
  label?: string;
  value?: string; // HH:mm
  onChange?: (value: string) => void;
  required?: boolean;
}

export function TimePicker({ label, value = '', onChange, required }: TimePickerProps) {
  return (
    <div className="w-full flex flex-col space-y-2">
      {label && (
        <label className="font-[family-name:var(--font-pixel)] text-[10px] text-pixel-gold uppercase tracking-[2px] leading-relaxed">
          {label}
        </label>
      )}
      <input
        type="time"
        className={`
          w-full px-4 py-3
          bg-pixel-black border-[3px] border-pixel-border text-pixel-slate-light
          font-[family-name:var(--font-vt)] text-[22px]
          outline-none transition-colors duration-100
          [box-shadow:inset_2px_2px_0_rgba(0,0,0,0.5)]
          cursor-pointer focus:border-pixel-cyan-dim
          [color-scheme:dark]
        `}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        required={required}
      />
    </div>
  );
}

