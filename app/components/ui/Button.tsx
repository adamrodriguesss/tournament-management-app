import React, { type ButtonHTMLAttributes } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  fullWidth?: boolean;
}

export function Button({ variant = 'primary', fullWidth, className = '', children, ...props }: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center px-4 py-2 font-medium rounded-lg transition-all duration-200 outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-indigo-500 text-white hover:bg-indigo-400 hover:-translate-y-[1px]',
    secondary: 'bg-transparent border border-slate-700 text-slate-50 hover:bg-slate-800'
  };

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${widthClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
