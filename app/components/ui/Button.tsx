import React, { type ButtonHTMLAttributes } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' ;
  fullWidth?: boolean;
}

export function Button({ variant = 'primary', fullWidth, className = '', children, ...props }: ButtonProps) {
  const baseClasses = `
  font-[family-name:var(--font-pixel)] text-[12px] tracking-wide uppercase
  border-[3px] px-6 py-3 cursor-pointer
  transition-transform duration-75 leading-none
  active:translate-x-[3px] active:translate-y-[3px]
  disabled:opacity-40 disabled:cursor-not-allowed
  disabled:active:translate-x-0 disabled:active:translate-y-0
`;

const variants = {
  primary: `
    bg-pixel-gold text-pixel-black border-pixel-gold-dark
    hover:bg-yellow-400
    [box-shadow:3px_3px_0_var(--color-pixel-gold-dark)]
    active:[box-shadow:none]
  `,
  secondary: `
    bg-transparent text-pixel-cyan border-pixel-cyan-dim
    hover:bg-pixel-cyan/5
    [box-shadow:3px_3px_0_var(--color-pixel-cyan-dim)]
    active:[box-shadow:none]
  `,
  danger: `
    bg-transparent text-pixel-red border-pixel-red
    hover:bg-pixel-red/5
    [box-shadow:3px_3px_0_#a01e36]
    active:[box-shadow:none]
  `,
};

  // ✅ FIX HERE
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
