import { useState } from 'react';
import { redirect, useNavigate, useRevalidator } from 'react-router';
import { getSession, getRoleProfile } from '../../services/auth';
import { getTournamentById } from '../../services/tournaments';
import { getEventsByTournament, createEvent } from '../../services/events';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { AdminLayout } from '../../components/layout/AdminLayout';
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

  return {
    user: { ...user, id: session.user.id },
    tournament,
    events
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
};

type LoaderData = {
  user: { role: string; full_name: string; email: string; id: string };
  tournament: { id: string; name: string; status: string };
  events: EventRow[];
};

export default function AdminEvents({ loaderData }: { loaderData: LoaderData }) {
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const { user, tournament, events } = loaderData;

  const [showCreate, setShowCreate] = useState(false);
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

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

  const statusColor = (s: string) => {
    switch (s) {
      case 'upcoming': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'ongoing': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'cancelled': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <AdminLayout user={user} activeItem="Event Management">
      <div className="mb-2">
        <button onClick={() => navigate('/admin/tournaments')} className="text-slate-400 hover:text-slate-50 text-sm transition-colors inline-block">← Back to Tournaments</button>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{tournament.name}</h1>
          <p className="text-slate-400 mt-1">Event Management</p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? 'Cancel' : '+ New Event'}
        </Button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 sm:p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Create Event</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-sm text-red-500">{error}</div>
            )}
            <Input label="Event Name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g., Chess Tournament" />
            <div className="w-full flex flex-col space-y-1.5">
              <label className="text-[14px] font-medium text-slate-400 uppercase tracking-wide">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the event..."
                rows={3}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 text-slate-50 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 resize-none"
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="w-full flex flex-col space-y-1.5">
                <label className="text-[14px] font-medium text-slate-400 uppercase tracking-wide">Event Type</label>
                <select value={type} onChange={(e) => setType(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 text-slate-50 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                  <option value="team">Team Based (e.g. Football)</option>
                  <option value="individual">Individual (e.g. Solo Dance)</option>
                </select>
              </div>
              <div className="w-full flex flex-col space-y-1.5">
                <label className="text-[14px] font-medium text-slate-400 uppercase tracking-wide">Event Format</label>
                <select value={format} onChange={(e) => setFormat(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 text-slate-50 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                  <option value="bracket">Tournament Bracket (Matches)</option>
                  <option value="judged">Judged (1st/2nd/3rd Result Entry)</option>
                </select>
              </div>
            </div>

            {type === 'team' && (
              <Input 
                label="Max Participants Per Team" 
                type="number" 
                value={maxParticipants} 
                onChange={(e) => setMaxParticipants(e.target.value)} 
                placeholder="Limit team members participating (e.g. 11)" 
                min={1}
              />
            )}

            <div className="grid grid-cols-3 gap-4">
              <Input label="1st Place Pts" type="number" value={pointsFirst} onChange={(e) => setPointsFirst(e.target.value)} required min={0} />
              <Input label="2nd Place Pts" type="number" value={pointsSecond} onChange={(e) => setPointsSecond(e.target.value)} required min={0} />
              <Input label="3rd Place Pts" type="number" value={pointsThird} onChange={(e) => setPointsThird(e.target.value)} required min={0} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Venue" value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="e.g. Main Auditorium" />
              <div className="w-full flex flex-col space-y-1.5">
                <label className="text-[14px] font-medium text-slate-400 uppercase tracking-wide">Scheduled At</label>
                <input 
                  type="datetime-local" 
                  value={scheduledAt} 
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 text-slate-50 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                />
              </div>
            </div>

            <Button fullWidth type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Event'}
            </Button>
          </form>
        </div>
      )}

      {/* Events List */}
      {events.length === 0 ? (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
          <span className="text-4xl mb-4 block">🗓️</span>
          <h3 className="text-lg font-semibold mb-1">No Events Yet</h3>
          <p className="text-slate-400 text-sm">Create the first event for this tournament.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((e) => (
            <div key={e.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4 sm:p-5 hover:border-slate-600 transition-colors duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <h3 className="text-lg font-semibold">{e.name}</h3>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusColor(e.status)} self-start sm:self-auto`}>
                  {e.status}
                </span>
              </div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-700 text-slate-300 capitalize">{e.type}</span>
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-700 text-slate-300 capitalize">{e.format}</span>
                {e.type === 'team' && e.max_participants_per_team && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    Max: {e.max_participants_per_team} members
                  </span>
                )}
              </div>
              {e.description && <p className="text-slate-400 text-sm mb-3">{e.description}</p>}
              <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-sm text-slate-400 mb-4">
                {e.venue && <span>📍 {e.venue}</span>}
                {e.scheduled_at && <span>🕐 {new Date(e.scheduled_at).toLocaleString()}</span>}
              </div>
              <div className="flex gap-3">
                {/* Future links to bracket management or results entry */}
                <Button variant="secondary" onClick={() => navigate(`/admin/events/${e.id}/${e.format === 'bracket' ? 'bracket' : 'results'}`)}>
                  Manage {e.format === 'bracket' ? 'Bracket' : 'Results'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
