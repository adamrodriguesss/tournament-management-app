export function EventCard({ event, registration, type }: { event: any; registration: any; type: 'team' | 'individual' }) {
  const statusColor = (s: string) => {
    switch (s) {
      case 'upcoming': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'ongoing': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'completed': return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const formatBadge = (f: string) => {
    switch (f) {
      case 'bracket': return '🏆 Bracket';
      case 'judged': return '⭐ Judged';
      default: return f;
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-700/60 rounded-lg p-4 hover:border-slate-600 transition-colors duration-200">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm truncate">{event.name}</h4>
          {event.tournaments?.name && (
            <p className="text-xs text-slate-500 mt-0.5">{event.tournaments.name}</p>
          )}
        </div>
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border shrink-0 ${statusColor(event.status)}`}>
          {event.status}
        </span>
      </div>

      {event.description && (
        <p className="text-xs text-slate-400 mb-3 line-clamp-2">{event.description}</p>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-700/80 text-slate-300 capitalize">{type}</span>
        <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-700/80 text-slate-300">{formatBadge(event.format)}</span>
        {type === 'team' && event.max_participants_per_team && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            Max {event.max_participants_per_team} players
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
        {event.venue && <span>📍 {event.venue}</span>}
        {event.scheduled_at && <span>🕐 {new Date(event.scheduled_at).toLocaleString()}</span>}
      </div>

      {registration && (
        <div className="mt-3 pt-3 border-t border-slate-700/50 flex items-center justify-between">
          <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            ✓ Registered
          </span>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Pts: 🥇{event.points_first} 🥈{event.points_second} 🥉{event.points_third}</span>
          </div>
        </div>
      )}
    </div>
  );
}
