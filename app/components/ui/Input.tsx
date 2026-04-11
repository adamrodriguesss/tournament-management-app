import React, { type InputHTMLAttributes, forwardRef } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="w-full flex flex-col space-y-2">
        {label && (
          <label className="font-[family-name:var(--font-pixel)] text-[10px] text-pixel-gold uppercase tracking-[2px] leading-relaxed">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`
            w-full px-4 py-3
            bg-pixel-black border-[3px] text-pixel-slate-light
            font-[family-name:var(--font-vt)] text-[22px]
            outline-none transition-colors duration-100
            [box-shadow:inset_2px_2px_0_rgba(0,0,0,0.5)]
            placeholder:text-pixel-border
            ${error
              ? 'border-pixel-red focus:border-pixel-red'
              : 'border-pixel-border focus:border-pixel-cyan-dim'
            }
            ${className}
          `}
          {...props}
        />
        {error && (
          <span className="font-[family-name:var(--font-pixel)] text-[12px] text-pixel-red tracking-wide leading-relaxed">
            ⚠ {error}
          </span>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';
