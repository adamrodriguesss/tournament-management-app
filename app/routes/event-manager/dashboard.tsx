import { redirect, useNavigate } from 'react-router';
import { getSession, getRoleProfile } from '../../services/auth';
import { getEventsAssignedTo } from '../../services/events';
import { Button } from '../../components/ui/Button';
import { AppLayout } from '../../components/layout/AdminLayout';

export async function clientLoader() {
  const session = await getSession();
  if (!session) {
    return redirect("/tournaments");
  }

  const { data: profile } = await getRoleProfile(session.user.id);

  if (!profile || profile.role !== 'event_manager') {
    return redirect("/");
  }

  const { data: events } = await getEventsAssignedTo(session.user.id);

  return { profile: { ...profile, id: session.user.id }, events };
}

type EventRow = {
  id: string;
  name: string;
  format: string;
  type: string;
  status: string;
  venue: string | null;
  scheduled_at: string | null;
  tournaments: { name: string } | null;
};

type LoaderData = {
  profile: { role: string; full_name: string; email: string };
  events: EventRow[];
};

export default function EventManagerDashboard({ loaderData }: { loaderData: LoaderData }) {
  const navigate = useNavigate();
  const { profile, events } = loaderData;

  return (
  <AppLayout user={{ ...profile, role: 'event_manager' }} activeItem="Dashboard">
    <div className="max-w-4xl mx-auto">

      <div className="mb-8 border-l-4 border-pixel-gold pl-4 py-1">
        <h2 className="font-[family-name:var(--font-pixel)] text-[11px] text-pixel-gold leading-relaxed tracking-wide">
          EVENT MANAGER DASHBOARD
        </h2>
        <p className="font-[family-name:var(--font-vt)] text-[24px] text-pixel-slate mt-1">
          Welcome back, {profile.full_name || 'Event Manager'}. Here are events awaiting scores.
        </p>
      </div>

      {events.length === 0 ? (
        <div
          className="bg-pixel-card border-[3px] border-pixel-border p-12 text-center"
          style={{ boxShadow: '3px 3px 0 var(--color-pixel-border)' }}
        >
          <span className="text-5xl mb-4 block opacity-40">📋</span>
          <h3 className="font-[family-name:var(--font-pixel)] text-[12px] text-pixel-slate-light mb-2 leading-relaxed">
            NO EVENTS ASSIGNED
          </h3>
          <p className="font-[family-name:var(--font-vt)] text-[22px] text-pixel-slate">
            There are no active events requiring score entry at this time.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <div
              key={event.id}
              className="bg-pixel-card border-[3px] border-pixel-border p-5 relative hover:-translate-x-0.5 hover:-translate-y-0.5 transition-transform duration-100"
              style={{ boxShadow: '3px 3px 0 var(--color-pixel-border)' }}
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-pixel-cyan-dim opacity-60" />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div>
                  <h3 className="font-[family-name:var(--font-pixel)] text-[12px] text-pixel-slate-light leading-relaxed">
                    {event.name.toUpperCase()}
                  </h3>
                  {event.tournaments && (
                    <p className="font-[family-name:var(--font-vt)] text-[24px] text-pixel-slate mt-0.5">
                      {event.tournaments.name}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Format badge */}
                  <span className={`
                    font-[family-name:var(--font-pixel)] text-[12px] px-2 py-1 border tracking-wide
                    ${event.format === 'bracket'
                      ? 'bg-pixel-cyan/10 text-pixel-cyan-dim border-pixel-cyan-dim'
                      : 'bg-pixel-purple/10 text-pixel-purple border-pixel-purple'}
                  `}>
                    {event.format.toUpperCase()}
                  </span>

                  {/* Status badge */}
                  <span className={`
                    font-[family-name:var(--font-pixel)] text-[12px] px-2 py-1 border tracking-wide
                    ${event.status === 'completed'
                      ? 'bg-pixel-slate/10 text-pixel-slate border-pixel-border'
                      : event.status === 'ongoing'
                      ? 'bg-pixel-green/10 text-pixel-green-dim border-pixel-green-dim'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500'}
                  `}>
                    {event.status.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 font-[family-name:var(--font-vt)] text-[26px] text-pixel-slate mb-4">
                {event.venue && <span>📍 {event.venue}</span>}
                {event.scheduled_at && <span>🕐 {new Date(event.scheduled_at).toLocaleString()}</span>}
                <span className="capitalize">📌 {event.type} event</span>
              </div>

              <Button
                variant={event.status === 'completed' ? 'secondary' : 'primary'}
                onClick={() => navigate(`/admin/events/${event.id}/${event.format === 'bracket' ? 'bracket' : 'results'}`)}
              >
                {event.status === 'completed' ? 'EDIT SCORES' : 'ENTER SCORES'}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  </AppLayout>
);
}
