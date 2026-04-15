import React from 'react';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  color?: 'primary' | 'secondary' | 'danger';
}

export function Spinner({ size = 'md', className = '', color = 'primary' }: SpinnerProps) {
  let sizeClass = 'w-6 h-6 border-[3px]';
  if (size === 'sm') sizeClass = 'w-4 h-4 border-[2px]';
  if (size === 'lg') sizeClass = 'w-10 h-10 border-[4px]';

  let colorClass = 'border-pixel-dark/30 border-t-pixel-cyan';
  if (color === 'secondary') colorClass = 'border-pixel-dark/30 border-t-pixel-gold';
  if (color === 'danger') colorClass = 'border-pixel-dark/30 border-t-pixel-red';

  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <div 
        className={`rounded-none animate-spin ${sizeClass} ${colorClass}`}
      />
    </div>
  );
}
