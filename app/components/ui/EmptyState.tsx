import React from 'react';

export interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  className?: string;
}

export function EmptyState({ icon, title, description, className = '' }: EmptyStateProps) {
  return (
    <div
      className={`bg-pixel-card border-[3px] border-pixel-border p-12 text-center ${className}`}
      style={{ boxShadow: '3px 3px 0 var(--color-pixel-border)' }}
    >
      <span className="text-5xl mb-4 block opacity-40">{icon}</span>
      <h3 className="font-[family-name:var(--font-pixel)] text-[12px] text-pixel-slate-light mb-2 leading-relaxed tracking-wide">
        {title.toUpperCase()}
      </h3>
      <p className="font-[family-name:var(--font-vt)] text-[22px] text-pixel-slate">
        {description}
      </p>
    </div>
  );
}
