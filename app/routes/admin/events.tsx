import { useState } from 'react';
import { redirect, useNavigate, useRevalidator } from 'react-router';
import { getSession, getRoleProfile } from '../../services/auth';
import { getTournamentById } from '../../services/tournaments';
import { getEventsByTournament, createEvent, getEventManagers, assignEventManager, deleteEvent } from '../../services/events';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { formatToDDMMYYTime } from '../../lib/utils';
import type { Route } from './+types/events';

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const session = await getSession();
  if (!session) return redirect("/login");

  const { data: user } = await getRoleProfile(session.user.id);

  if (!user || user.role !== "admin") return redirect("/");

  const tournamentId = params.id;

  const { data: tournament } = await getTournamentById(tournamentId);

  if (!tournament) return redirect("/admin/tournaments");

  const { data: events } = await getEventsByTournament(tournamentId);
  const { data: eventManagers } = await getEventManagers();

  return {
    user: { ...user, id: session.user.id },
    tournament,
    events,
    eventManagers,
  };
}

type EventRow = {
  id: string;
  name: string;
  description: string | null;
  type: string;
  format: string;
  status: string;
  venue: string | null;
  scheduled_at: string | null;
  max_participants_per_team: number | null;
  assigned_to: string | null;
};

type EventManager = {
  id: string;
  full_name: string;
  email: string;
};

type LoaderData = {
  user: { role: string; full_name: string; email: string; id: string };
  tournament: { id: string; name: string; status: string; start_date: string | null; end_date: string | null };
  events: EventRow[];
  eventManagers: EventManager[];
};

export default function AdminEvents({ loaderData }: { loaderData: LoaderData }) {
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const { user, tournament, events, eventManagers } = loaderData;

  const [showCreate, setShowCreate] = useState(false);
  const [assigningEventId, setAssigningEventId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('team');
  const [format, setFormat] = useState('bracket');
  const [pointsFirst, setPointsFirst] = useState('10');
  const [pointsSecond, setPointsSecond] = useState('6');
  const [pointsThird, setPointsThird] = useState('3');
  const [venue, setVenue] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Compute min/max for the datetime-local picker from tournament dates
  const datePickerMin = tournament.start_date
    ? `${tournament.start_date}T00:00`
    : undefined;
  const datePickerMax = tournament.end_date
    ? `${tournament.end_date}T23:59`
    : undefined;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate scheduled_at falls within tournament date range
    if (scheduledAt) {
      const eventDate = new Date(scheduledAt);
      if (tournament.start_date && eventDate < new Date(`${tournament.start_date}T00:00:00`)) {
        setError(`Event date cannot be before the tournament start date (${tournament.start_date}).`);
        setLoading(false);
        return;
      }
      if (tournament.end_date && eventDate > new Date(`${tournament.end_date}T23:59:59`)) {
        setError(`Event date cannot be after the tournament end date (${tournament.end_date}).`);
        setLoading(false);
        return;
      }
    }

    const { error: insertError } = await createEvent({
      tournament_id: tournament.id,
      name,
      description: description || null,
      type,
      format,
      points_first: parseInt(pointsFirst, 10),
      points_second: parseInt(pointsSecond, 10),
      points_third: parseInt(pointsThird, 10),
      venue: venue || null,
      scheduled_at: scheduledAt || null,
      status: 'upcoming',
      created_by: user.id,
      max_participants_per_team: type === 'team' && maxParticipants ? parseInt(maxParticipants, 10) : null
    });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    setName('');
    setDescription('');
    setType('team');
    setFormat('bracket');
    setPointsFirst('10');
    setPointsSecond('6');
    setPointsThird('3');
    setVenue('');
    setScheduledAt('');
    setMaxParticipants('');
    setShowCreate(false);
    setLoading(false);
    revalidator.revalidate();
  };

  const handleAssign = async (eventId: string, managerId: string | null) => {
    setAssigningEventId(eventId);
    await assignEventManager(eventId, managerId);
    setAssigningEventId(null);
    revalidator.revalidate();
  };

  const handleDelete = async (eventId: string, eventName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${eventName}"? This will permanently remove all registrations, matches, and results for this event.`)) {
      return;
    }
    await deleteEvent(eventId);
    revalidator.revalidate();
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'upcoming': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'ongoing': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'cancelled': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const pixelSelect = `
  w-full px-3 py-2.5 bg-pixel-black border-[3px] border-pixel-border
  text-pixel-slate-light font-[family-name:var(--font-vt)] text-[24px]
  outline-none appearance-none cursor-pointer
  focus:border-pixel-cyan-dim
  [box-shadow:inset_2px_2px_0_rgba(0,0,0,0.5)]
`;

const pixelTextarea = `
  w-full px-3 py-2.5 bg-pixel-black border-[3px] border-pixel-border
  text-pixel-slate-light font-[family-name:var(--font-vt)] text-[24px]
  outline-none resize-none focus:border-pixel-cyan-dim
  [box-shadow:inset_2px_2px_0_rgba(0,0,0,0.5)]
  placeholder:text-pixel-border
`;

  //events.tsx
  return (
  <AdminLayout user={user} activeItem="Event Management" tournamentName={tournament.name}>
    <div className="mb-2">
      <Button variant="secondary" onClick={() => navigate('/admin/tournaments')}>
        BACK
      </Button>
    </div>

    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
      <div className="border-l-4 border-pixel-gold pl-4 py-1">
        <h1 className="font-[family-name:var(--font-pixel)] text-[11px] text-pixel-gold leading-relaxed tracking-wide">
          {tournament.name.toUpperCase()}
        </h1>
        <p className="font-[family-name:var(--font-vt)] text-[24px] text-pixel-slate mt-1">Event Management</p>
      </div>
      <Button onClick={() => setShowCreate(!showCreate)}>
        {showCreate ? 'CANCEL' : '+ NEW EVENT'}
      </Button>
    </div>

    {/* Create Form */}
    {showCreate && (
      <div
        className="bg-pixel-panel border-[3px] border-pixel-border p-5 mb-8 relative"
        style={{ boxShadow: '3px 3px 0 var(--color-pixel-border)' }}
      >
        <div className="absolute top-0 left-0 right-0 h-[3px]"
          style={{ background: 'linear-gradient(90deg, var(--color-pixel-gold), var(--color-pixel-purple))' }}
        />
        <h2 className="font-[family-name:var(--font-pixel)] text-[12px] text-pixel-gold mb-5 tracking-wide leading-relaxed">
          CREATE EVENT
        </h2>
        <form onSubmit={handleCreate} className="space-y-4">
          {error && (
            <div className="border-2 border-pixel-red bg-pixel-red/10 p-3 font-[family-name:var(--font-pixel)] text-[12px] text-pixel-red tracking-wide leading-relaxed">
              ⚠ {error}
            </div>
          )}
          <Input label="Event Name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g., Chess Tournament" />

          <div className="w-full flex flex-col space-y-2">
            <label className="font-[family-name:var(--font-pixel)] text-[12px] text-pixel-gold uppercase tracking-[2px]">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of the event..." rows={3} className={pixelTextarea} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="w-full flex flex-col space-y-2">
              <label className="font-[family-name:var(--font-pixel)] text-[12px] text-pixel-gold uppercase tracking-[2px]">Event Type</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className={pixelSelect}>
                <option value="team">Team Based (e.g. Football)</option>
                <option value="individual">Individual (e.g. Solo Dance)</option>
              </select>
            </div>
            <div className="w-full flex flex-col space-y-2">
              <label className="font-[family-name:var(--font-pixel)] text-[12px] text-pixel-gold uppercase tracking-[2px]">Event Format</label>
              <select value={format} onChange={(e) => setFormat(e.target.value)} className={pixelSelect}>
                <option value="bracket">Tournament Bracket (Matches)</option>
                <option value="judged">Judged (1st/2nd/3rd Result Entry)</option>
              </select>
            </div>
          </div>

          {type === 'team' && (
            <Input label="Max Participants Per Team" type="number" value={maxParticipants} onChange={(e) => setMaxParticipants(e.target.value)} placeholder="e.g. 11" min={1} />
          )}

          <div className="grid grid-cols-3 gap-4">
            <Input label="1st Place Pts" type="number" value={pointsFirst} onChange={(e) => setPointsFirst(e.target.value)} required min={0} />
            <Input label="2nd Place Pts" type="number" value={pointsSecond} onChange={(e) => setPointsSecond(e.target.value)} required min={0} />
            <Input label="3rd Place Pts" type="number" value={pointsThird} onChange={(e) => setPointsThird(e.target.value)} required min={0} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Venue" value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="e.g. Main Auditorium" />
            <div className="w-full flex flex-col space-y-2">
              <label className="font-[family-name:var(--font-pixel)] text-[12px] text-pixel-gold uppercase tracking-[2px]">Scheduled At</label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                min={datePickerMin}
                max={datePickerMax}
                className={pixelSelect}
              />
              {tournament.start_date && tournament.end_date && (
                <p className="font-[family-name:var(--font-vt)] text-[20px] text-pixel-slate">
                  Must be between {tournament.start_date} and {tournament.end_date}
                </p>
              )}
            </div>
          </div>

          <Button fullWidth type="submit" disabled={loading}>
            {loading ? 'CREATING...' : 'CREATE EVENT'}
          </Button>
        </form>
      </div>
    )}

    {/* Events List */}
    {events.length === 0 ? (
      <div className="bg-pixel-card border-[3px] border-pixel-border p-12 text-center" style={{ boxShadow: '3px 3px 0 var(--color-pixel-border)' }}>
        <span className="text-5xl mb-4 block opacity-40">🗓️</span>
        <h3 className="font-[family-name:var(--font-pixel)] text-[12px] text-pixel-slate-light mb-2 leading-relaxed">NO EVENTS YET</h3>
        <p className="font-[family-name:var(--font-vt)] text-[22px] text-pixel-slate">Create the first event for this tournament.</p>
      </div>
    ) : (
      <div className="space-y-4">
        {events.map((e) => (
          <div
            key={e.id}
            className="bg-pixel-card border-[3px] border-pixel-border p-4 sm:p-5 relative hover:-translate-x-0.5 hover:-translate-y-0.5 transition-transform duration-100"
            style={{ boxShadow: '3px 3px 0 var(--color-pixel-border)' }}
          >
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-pixel-purple opacity-60" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <h3 className="font-[family-name:var(--font-pixel)] text-[12px] text-pixel-slate-light leading-relaxed">
                {e.name.toUpperCase()}
              </h3>
              <span className={`font-[family-name:var(--font-pixel)] text-[12px] px-2 py-1 border self-start sm:self-auto tracking-wide ${statusColor(e.status)}`}>
                {e.status.toUpperCase()}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="font-[family-name:var(--font-pixel)] text-[12px] px-2 py-1 bg-pixel-dark border border-pixel-border text-pixel-slate capitalize tracking-wide">
                {e.type.toUpperCase()}
              </span>
              <span className="font-[family-name:var(--font-pixel)] text-[12px] px-2 py-1 bg-pixel-dark border border-pixel-border text-pixel-slate capitalize tracking-wide">
                {e.format.toUpperCase()}
              </span>
              {e.type === 'team' && e.max_participants_per_team && (
                <span className="font-[family-name:var(--font-pixel)] text-[12px] px-2 py-1 bg-pixel-cyan/10 border border-pixel-cyan-dim text-pixel-cyan-dim tracking-wide">
                  MAX {e.max_participants_per_team} MEMBERS
                </span>
              )}
            </div>

            {e.description && (
              <p className="font-[family-name:var(--font-vt)] text-[22px] text-pixel-slate mb-3">{e.description}</p>
            )}

            <div className="flex flex-wrap gap-4 font-[family-name:var(--font-vt)] text-[26px] text-pixel-slate mb-4">
              {e.venue && <span>📍 {e.venue}</span>}
              {e.scheduled_at && <span>🕐 {formatToDDMMYYTime(e.scheduled_at)}</span>}
            </div>

            <div className="flex flex-wrap gap-3 items-center">
              {/* Assign Manager */}
              <div className="flex items-center gap-2">
                <span className="font-[family-name:var(--font-pixel)] text-[12px] text-pixel-slate tracking-wide">ASSIGNED TO:</span>
                <select
                  value={e.assigned_to || ''}
                  onChange={(ev) => handleAssign(e.id, ev.target.value || null)}
                  disabled={assigningEventId === e.id}
                  className="font-[family-name:var(--font-vt)] text-[26px] px-2 py-1.5 bg-pixel-black border-2 border-pixel-border text-pixel-slate-light outline-none focus:border-pixel-cyan-dim min-w-[140px]"
                >
                  <option value="">Unassigned</option>
                  {eventManagers.map((mgr) => (
                    <option key={mgr.id} value={mgr.id}>{mgr.full_name || mgr.email}</option>
                  ))}
                </select>
              </div>

              <Button variant="secondary" onClick={() => navigate(`/admin/events/${e.id}/${e.format === 'bracket' ? 'bracket' : 'results'}`)}>
                MANAGE {e.format === 'bracket' ? 'BRACKET' : 'RESULTS'}
              </Button>

              <button
                onClick={() => handleDelete(e.id, e.name)}
                className="font-[family-name:var(--font-pixel)] text-[12px] px-3 py-2 border-2 border-pixel-red text-pixel-red bg-pixel-red/5 hover:bg-pixel-red/10 transition-colors tracking-wide
                  [box-shadow:2px_2px_0_#a01e36] active:translate-x-[2px] active:translate-y-[2px] active:[box-shadow:none]"
              >
                DELETE
              </button>
            </div>
          </div>
        ))}
      </div>
    )}
  </AdminLayout>
);
}
