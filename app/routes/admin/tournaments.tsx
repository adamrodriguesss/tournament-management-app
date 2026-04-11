import { useState } from 'react';
import { redirect, useNavigate, useRevalidator } from 'react-router';
import { getSession, getRoleProfile } from '../../services/auth';
import { getAllTournaments, createTournament } from '../../services/tournaments';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { AdminLayout } from '../../components/layout/AdminLayout';

export async function clientLoader() {
  const session = await getSession();
  if (!session) return redirect("/login");

  const { data: user } = await getRoleProfile(session.user.id);

  if (!user || user.role !== "admin") return redirect("/");

  const { data: tournaments } = await getAllTournaments();

  return { user: { ...user, id: session.user.id }, tournaments };
}

type Tournament = {
  id: string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  created_at: string;
};

type LoaderData = {
  user: { role: string; full_name: string; email: string; id: string };
  tournaments: Tournament[];
};

export default function AdminTournaments({ loaderData }: { loaderData: LoaderData }) {
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const { user, tournaments } = loaderData;

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('registration_open');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: insertError } = await createTournament({
      name,
      description: description || null,
      start_date: startDate || null,
      end_date: endDate || null,
      status,
      created_by: user.id,
    });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    setName('');
    setDescription('');
    setStartDate('');
    setEndDate('');
    setShowCreate(false);
    setLoading(false);
    revalidator.revalidate();
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'registration_open': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'ongoing': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'completed': return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
      default: return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    }
  };

  //tournamnets.tsx
  return (
    <AdminLayout user={user} activeItem="Tournaments">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Tournaments</h1>
          <p className="text-slate-400 mt-1">Create and manage tournament events.</p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? 'Cancel' : '+ New Tournament'}
        </Button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 md:p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Create Tournament</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-md text-red-500">{error}</div>
            )}
            <Input label="Tournament Name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g., Annual College Fest 2026" />
            <div className="w-full flex flex-col space-y-1.5">
              <label className="text-[22px] font-medium text-slate-400 uppercase tracking-wide">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the tournament..."
                rows={3}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 text-slate-50 rounded-lg transition-colors duration-200 outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 focus:border-indigo-500 resize-none"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Start Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              <Input label="End Date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="w-full flex flex-col space-y-1.5">
              <label className="text-[22px] font-medium text-slate-400 uppercase tracking-wide">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 text-slate-50 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900"
              >
                <option value="draft">Draft</option>
                <option value="registration_open">Registration Open</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <Button fullWidth type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Tournament'}
            </Button>
          </form>
        </div>
      )}

      {/* Tournaments List */}
      {tournaments.length === 0 ? (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
          <span className="text-4xl mb-4 block">🏆</span>
          <h3 className="text-lg font-semibold mb-1">No Tournaments Yet</h3>
          <p className="text-slate-400 text-md">Create your first tournament to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tournaments.map((t) => (
            <div key={t.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4 md:p-5 hover:border-slate-600 transition-colors duration-200">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3">
                <h3 className="text-lg font-semibold">{t.name}</h3>
                <span className={`text-base font-medium px-2.5 py-1 rounded-full border ${statusColor(t.status)} self-start md:self-auto`}>
                  {t.status.replace('_', ' ')}
                </span>
              </div>
              {t.description && <p className="text-slate-400 text-md mb-3">{t.description}</p>}
              <div className="flex flex-wrap items-center gap-3 md:gap-6 text-md text-slate-400 mb-4">
                {t.start_date && <span>📅 Start: {t.start_date}</span>}
                {t.end_date && <span>📅 End: {t.end_date}</span>}
              </div>
              <div className="flex gap-3">
                <Button variant="primary" onClick={() => navigate(`/admin/tournaments/${t.id}/events`)}>
                  Manage Events
                </Button>
                <Button variant="secondary" onClick={() => navigate(`/admin/tournaments/${t.id}/teams`)}>
                  Manage Teams
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
