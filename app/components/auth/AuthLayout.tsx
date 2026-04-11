import React from 'react';

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-pixel-black p-4">
      {/* scanline texture */}
      <div className="fixed inset-0 pointer-events-none z-0"
        style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)' }}
      />

      <div className="relative z-10 w-full max-w-md bg-pixel-panel border-[3px] border-pixel-border p-8"
        style={{ boxShadow: '5px 5px 0 var(--color-pixel-border)' }}
      >
        {/* top accent bar */}
        <div className="absolute top-0 left-0 right-0 h-[3px]"
          style={{ background: 'linear-gradient(90deg, var(--color-pixel-gold), var(--color-pixel-purple))' }}
        />

        <div className="text-center mb-8">
          <p className="font-[family-name:var(--font-pixel)] text-[12px] text-pixel-gold tracking-[4px] uppercase mb-4">
            ★ FestFlow ★
          </p>
          <h1 className="font-[family-name:var(--font-pixel)] text-[26px] text-pixel-slate-light leading-relaxed tracking-wide mb-3">
            {title}
          </h1>
          {subtitle && (
            <p className="font-[family-name:var(--font-vt)] text-[24px] text-pixel-slate">
              {subtitle}
            </p>
          )}
        </div>

        {children}
      </div>
    </div>
  );
}
