import React from 'react';

export interface BadgeProps {
  status: string;
  className?: string;
  children?: React.ReactNode;
}

export function Badge({ status, className = '', children }: BadgeProps) {
  let colorClasses = '';

  switch (status.toLowerCase()) {
    // Green (Open / Confirmed / Ongoing in some contexts)
    case 'registration_open':
    case 'confirmed':
      colorClasses = 'bg-pixel-green/10 text-pixel-green-dim border-pixel-green-dim';
      break;

    // Cyan (Ongoing)
    case 'ongoing':
    case 'active':
      colorClasses = 'bg-pixel-cyan/10 text-pixel-cyan-dim border-pixel-cyan-dim';
      break;

    // Red (Cancelled / Rejected / Disqualified)
    case 'cancelled':
    case 'rejected':
    case 'disqualified':
      colorClasses = 'bg-pixel-red/10 text-pixel-red border-pixel-red';
      break;

    // Amber/Gold (Pending / Draft)
    case 'pending':
    case 'draft':
      colorClasses = 'bg-amber-500/10 text-amber-400 border-amber-500';
      break;

    // Slate/Blue (Completed / Upcoming)
    case 'upcoming':
      colorClasses = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      break;
    case 'completed':
      colorClasses = 'bg-pixel-slate/10 text-pixel-slate border-pixel-border';
      break;

    default:
      colorClasses = 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  }

  const displayText = children || status.replace(/_/g, ' ').toUpperCase();

  return (
    <span
      className={`font-[family-name:var(--font-pixel)] text-[12px] px-2 py-1 border-2 tracking-wide ${colorClasses} ${className}`}
    >
      {displayText}
    </span>
  );
}
