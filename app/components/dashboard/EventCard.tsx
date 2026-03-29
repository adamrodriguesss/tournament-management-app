export function EventCard({ event, registration, type }: { event: any; registration: any; type: 'team' | 'individual' }) {
  const statusStyles = (s: string) => {
    switch (s) {
      case 'upcoming':  return 'bg-pixel-cyan/10 text-pixel-cyan-dim border-pixel-cyan-dim';
      case 'ongoing':   return 'bg-pixel-green/10 text-pixel-green-dim border-pixel-green-dim';
      case 'completed': return 'bg-pixel-slate/10 text-pixel-slate border-pixel-border';
      default:          return 'bg-pixel-slate/10 text-pixel-slate border-pixel-border';
    }
  };

  const formatBadge = (f: string) => {
    switch (f) {
      case 'bracket': return '🏆 BRACKET';
      case 'judged':  return '⭐ JUDGED';
      default:        return f?.toUpperCase();
    }
  };

  return (
    <div className="bg-pixel-card border-[3px] border-pixel-border p-4 flex flex-col relative
      hover:-translate-x-0.5 hover:-translate-y-0.5 transition-transform duration-100"
      style={{ boxShadow: '3px 3px 0 var(--color-pixel-border)' }}
    >
      {/* purple bottom accent */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-pixel-purple" />

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-[family-name:var(--font-pixel)] text-[10px] text-pixel-slate-light truncate leading-relaxed">
            {event.name.toUpperCase()}
          </h4>
          {event.tournaments?.name && (
            <p className="font-[family-name:var(--font-vt)] text-[24px] text-pixel-slate mt-0.5">
              {event.tournaments.name}
            </p>
          )}
        </div>
        <span className={`font-[family-name:var(--font-pixel)] text-[12px] px-2 py-1 border shrink-0 tracking-wide ${statusStyles(event.status)}`}>
          {event.status?.toUpperCase()}
        </span>
      </div>

      {/* Description */}
      {event.description && (
        <p className="font-[family-name:var(--font-vt)] text-[26px] text-pixel-slate mb-3 line-clamp-2">
          {event.description}
        </p>
      )}

      {/* Badges */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="font-[family-name:var(--font-pixel)] text-[12px] px-2 py-1 bg-pixel-dark border border-pixel-border text-pixel-slate capitalize tracking-wide">
          {type.toUpperCase()}
        </span>
        <span className="font-[family-name:var(--font-pixel)] text-[12px] px-2 py-1 bg-pixel-dark border border-pixel-border text-pixel-slate tracking-wide">
          {formatBadge(event.format)}
        </span>
        {type === 'team' && event.max_participants_per_team && (
          <span className="font-[family-name:var(--font-pixel)] text-[12px] px-2 py-1 bg-pixel-cyan/10 border border-pixel-cyan-dim text-pixel-cyan-dim tracking-wide">
            MAX {event.max_participants_per_team} PLAYERS
          </span>
        )}
      </div>

      {/* Venue / Time */}
      <div className="flex flex-wrap items-center gap-3 font-[family-name:var(--font-vt)] text-[24px] text-pixel-slate">
        {event.venue && <span>📍 {event.venue}</span>}
        {event.scheduled_at && <span>🕐 {new Date(event.scheduled_at).toLocaleString()}</span>}
      </div>

      {/* Registration Footer */}
      {registration && (
        <div className="mt-3 pt-3 border-t-2 border-pixel-border flex items-center justify-between gap-2">
          <span className="font-[family-name:var(--font-pixel)] text-[12px] px-2 py-1 bg-pixel-green/10 border border-pixel-green-dim text-pixel-green-dim tracking-wide">
            ✓ REGISTERED
          </span>
          <span className="font-[family-name:var(--font-vt)] text-[22px] text-pixel-slate">
            🥇{event.points_first} 🥈{event.points_second} 🥉{event.points_third}
          </span>
        </div>
      )}
    </div>
  );
}