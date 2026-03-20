import React from 'react';

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-md bg-slate-800 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.4)] border border-slate-700 p-8">
        <div className="text-center mb-8">
          <p className="text-sm font-bold text-indigo-400 tracking-widest uppercase mb-3">FestFlow</p>
          <h1 className="text-3xl font-bold text-slate-50 mb-2">{title}</h1>
          {subtitle && <p className="text-slate-400">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}
