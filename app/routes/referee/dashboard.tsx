import { redirect, useNavigate } from 'react-router';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';

export async function clientLoader() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role, full_name, email")
    .eq("id", session.user.id)
    .single();

  if (!profile || profile.role !== 'referee') {
    return redirect("/");
  }

  // Fetch events assigned to referees (all bracket/judged events for now)
  const { data: events } = await supabase
    .from("events")
    .select("*, tournaments(name)")
    .in("status", ["upcoming", "ongoing"])
    .order("scheduled_at", { ascending: true });

  return { profile, events: events || [] };
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

export default function RefereeDashboard({ loaderData }: { loaderData: LoaderData }) {
  const navigate = useNavigate();
  const { profile, events } = loaderData;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50 flex flex-col">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-4 sm:px-8 py-4 border-b border-slate-800 bg-slate-950">
        <div className="flex items-center gap-2 sm:gap-3">
          <h1 className="text-xl font-bold">FestFlow</h1>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            Referee
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <span className="text-sm text-slate-400 hidden sm:inline">{profile.email}</span>
          <Button variant="secondary" onClick={handleLogout}>Sign Out</Button>
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-4xl mx-auto w-full">
        <div className="mb-8">
          <h2 className="text-2xl font-bold">Referee Dashboard</h2>
          <p className="text-slate-400 mt-1">Welcome back, {profile.full_name || 'Referee'}. Here are events awaiting scores.</p>
        </div>

        {/* Events List */}
        {events.length === 0 ? (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
            <span className="text-4xl mb-4 block">📋</span>
            <h3 className="text-lg font-semibold mb-1">No Events Assigned</h3>
            <p className="text-slate-400 text-sm">There are no active events requiring score entry at this time.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <div
                key={event.id}
                className="bg-slate-800 border border-slate-700 rounded-xl p-5 hover:border-slate-600 transition-colors duration-200"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <h3 className="text-lg font-semibold">{event.name}</h3>
                    {event.tournaments && (
                      <p className="text-xs text-slate-500">{event.tournaments.name}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      event.format === 'bracket'
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                    }`}>
                      {event.format}
                    </span>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      event.status === 'ongoing'
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                    }`}>
                      {event.status}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-sm text-slate-400">
                  {event.venue && <span>📍 {event.venue}</span>}
                  {event.scheduled_at && (
                    <span>🕐 {new Date(event.scheduled_at).toLocaleString()}</span>
                  )}
                  <span className="capitalize">📌 {event.type} event</span>
                </div>
                <div className="mt-4">
                  <Button
                    variant="primary"
                    onClick={() => navigate(`/referee/events/${event.id}/scores`)}
                  >
                    Enter Scores
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
