import React, { type InputHTMLAttributes, forwardRef } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="w-full flex flex-col space-y-1.5">
        {label && (
          <label className="text-[14px] font-medium text-slate-400 uppercase tracking-wide">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`
            w-full px-3 py-2 bg-slate-950 border text-slate-50 rounded-lg
            transition-colors duration-200 outline-none
            focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 focus:border-indigo-500
            ${error ? 'border-red-500 focus:ring-red-500' : 'border-slate-700'}
            ${className}
          `}
          {...props}
        />
        {error && <span className="text-sm font-medium text-red-500">{error}</span>}
      </div>
    );
  }
);
Input.displayName = 'Input';
