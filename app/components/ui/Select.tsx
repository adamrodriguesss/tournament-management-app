import React, { type SelectHTMLAttributes, forwardRef } from 'react';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, className = '', options, ...props }, ref) => {
    return (
      <div className="w-full flex flex-col space-y-2">
        {label && (
          <label className="font-[family-name:var(--font-pixel)] text-[10px] text-pixel-gold uppercase tracking-[2px] leading-relaxed">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={`
            w-full px-4 py-3
            bg-pixel-black border-[3px] text-pixel-slate-light
            font-[family-name:var(--font-vt)] text-[22px]
            outline-none transition-colors duration-100
            [box-shadow:inset_2px_2px_0_rgba(0,0,0,0.5)]
            ${error
              ? 'border-pixel-red focus:border-pixel-red'
              : 'border-pixel-border focus:border-pixel-cyan-dim'
            }
            ${className}
          `}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && (
          <span className="font-[family-name:var(--font-pixel)] text-[12px] text-pixel-red tracking-wide leading-relaxed">
            ⚠ {error}
          </span>
        )}
      </div>
    );
  }
);
Select.displayName = 'Select';
