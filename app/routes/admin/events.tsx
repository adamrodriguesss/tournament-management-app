import { useState } from 'react';
import { redirect, useNavigate, useRevalidator } from 'react-router';
import { getSession, getRoleProfile } from '../../services/auth';
import { getTournamentById } from '../../services/tournaments';
import { getEventsByTournament, createEvent, getEventManagers, assignEventManager, deleteEvent } from '../../services/events';
import { getTeamStandingsDetailed } from '../../services/public';
import { Button } from '../../components/ui/Button';
import { StandingsCard } from '../../components/ui/StandingsCard';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { DatePicker } from '../../components/ui/DatePicker';
import { TimePicker } from '../../components/ui/TimePicker';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Spinner } from '../../components/ui/Spinner';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
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
  const { data: standings } = await getTeamStandingsDetailed(tournamentId);

  return {
    user: { ...user, id: session.user.id },
    tournament,
    events,
    eventManagers,
    standings,
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
  standings: any[];
};

export default function AdminEvents({ loaderData }: { loaderData: LoaderData }) {
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const { user, tournament, events, eventManagers, standings } = loaderData;

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
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('12:00');
  const [maxParticipants, setMaxParticipants] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    eventId: string | null;
    eventName: string;
  }>({ isOpen: false, eventId: null, eventName: '' });

  // Compute min/max for the date picker from tournament dates
  const datePickerMin = tournament.start_date || undefined;
  const datePickerMax = tournament.end_date || undefined;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const combinedScheduledAt = scheduledDate && scheduledTime ? `${scheduledDate}T${scheduledTime}` : scheduledDate || null;

    // Validate scheduled_at falls within tournament date range
    if (combinedScheduledAt) {
      const eventDate = new Date(combinedScheduledAt);
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
      scheduled_at: combinedScheduledAt,
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
    setScheduledDate('');
    setScheduledTime('12:00');
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

  const handleDeleteClick = (eventId: string, eventName: string) => {
    setConfirmModal({ isOpen: true, eventId, eventName });
  };

  const confirmDelete = async () => {
    if (confirmModal.eventId) {
      await deleteEvent(confirmModal.eventId);
      revalidator.revalidate();
    }
    setConfirmModal({ isOpen: false, eventId: null, eventName: '' });
  };

  const cancelDelete = () => {
    setConfirmModal({ isOpen: false, eventId: null, eventName: '' });
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
      <Button variant={showCreate ? 'danger' : 'primary'} onClick={() => setShowCreate(!showCreate)}>
        {showCreate ? 'CANCEL' : '+ NEW EVENT'}
      </Button>
    </div>

    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2">
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
            <Select
              label="Event Type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              options={[
                { value: "team", label: "Team Based (e.g. Football)" },
                { value: "individual", label: "Individual (e.g. Solo Dance)" }
              ]}
            />
            <Select
              label="Event Format"
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              options={[
                { value: "bracket", label: "Tournament Bracket (Matches)" },
                { value: "judged", label: "Judged (1st/2nd/3rd Result Entry)" }
              ]}
            />
          </div>

          {type === 'team' && (
            <Input label="Max Participants Per Team" type="number" value={maxParticipants} onChange={(e) => setMaxParticipants(e.target.value)} placeholder="e.g. 11" min={1} />
          )}

          <div className="grid grid-cols-3 gap-4">
            <Input label="1st Place Pts" type="number" value={pointsFirst} onChange={(e) => setPointsFirst(e.target.value)} required min={0} />
            <Input label="2nd Place Pts" type="number" value={pointsSecond} onChange={(e) => setPointsSecond(e.target.value)} required min={0} />
            <Input label="3rd Place Pts" type="number" value={pointsThird} onChange={(e) => setPointsThird(e.target.value)} required min={0} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="Venue" value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="e.g. Main Auditorium" />
            <DatePicker
              label="Event Date"
              value={scheduledDate}
              onChange={(val) => setScheduledDate(val)}
              min={datePickerMin}
              max={datePickerMax}
              required
            />
            <TimePicker
              label="Event Time"
              value={scheduledTime}
              onChange={(val) => setScheduledTime(val)}
              required
            />
          </div>
          {tournament.start_date && tournament.end_date && (
            <p className="font-[family-name:var(--font-vt)] text-[20px] text-pixel-slate -mt-2">
              Event date must be between {tournament.start_date} and {tournament.end_date}
            </p>
          )}

          <Button fullWidth type="submit" disabled={loading}>
            {loading ? <div className="flex items-center justify-center gap-2"><Spinner size="sm"/> <span>CREATING...</span></div> : 'CREATE EVENT'}
          </Button>
        </form>
      </div>
    )}

    {/* Events List */}
    {events.length === 0 ? (
      <EmptyState
        icon="🗓️"
        title="NO EVENTS YET"
        description="Create the first event for this tournament."
      />
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
              <Badge status={e.status} />
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
                <div className="min-w-[180px]">
                  <Select
                    value={e.assigned_to || ''}
                    onChange={(ev) => handleAssign(e.id, ev.target.value || null)}
                    disabled={assigningEventId === e.id}
                    options={[
                      { value: "", label: "Unassigned" },
                      ...eventManagers.map((mgr) => ({
                        value: mgr.id,
                        label: mgr.full_name || mgr.email
                      }))
                    ]}
                  />
                </div>
              </div>

              <Button variant="secondary" onClick={() => navigate(`/admin/events/${e.id}/${e.format === 'bracket' ? 'bracket' : 'results'}`)}>
                MANAGE {e.format === 'bracket' ? 'BRACKET' : 'RESULTS'}
              </Button>

              <button
                onClick={() => handleDeleteClick(e.id, e.name)}
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
      </div>

      {/* Standings */}
      <div>
        <StandingsCard standings={standings} />
      </div>
    </div>

    <ConfirmModal 
      isOpen={confirmModal.isOpen}
      title="DELETE EVENT?"
      message={`Are you sure you want to delete "${confirmModal.eventName}"? This will permanently remove all registrations, matches, and results for this event.`}
      onConfirm={confirmDelete}
      onCancel={cancelDelete}
      confirmLabel="DELETE"
      cancelLabel="CANCEL"
    />
  </AdminLayout>
);
}
