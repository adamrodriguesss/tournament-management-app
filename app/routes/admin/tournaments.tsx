import { useState } from 'react';
import { redirect, useNavigate, useRevalidator } from 'react-router';
import { getSession, getRoleProfile } from '../../services/auth';
import { getAllTournaments, createTournament } from '../../services/tournaments';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { formatToDDMMYY } from '../../lib/utils';

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

    // Validate end_date >= start_date
    if (startDate && endDate && endDate < startDate) {
      setError('End date cannot be before the start date.');
      setLoading(false);
      return;
    }

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
      case 'registration_open': return 'bg-pixel-green/10 text-pixel-green-dim border-pixel-green-dim';
      case 'ongoing': return 'bg-pixel-cyan/10 text-pixel-cyan-dim border-pixel-cyan-dim';
      case 'completed': return 'bg-pixel-slate/10 text-pixel-slate border-pixel-border';
      default: return 'bg-amber-500/10 text-amber-400 border-amber-500';
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

  return (
    <AdminLayout user={user} activeItem="Tournaments">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="border-l-4 border-pixel-gold pl-4 py-1">
          <h1 className="font-[family-name:var(--font-pixel)] text-[11px] text-pixel-gold leading-relaxed tracking-wide">
            TOURNAMENTS
          </h1>
          <p className="font-[family-name:var(--font-vt)] text-[24px] text-pixel-slate mt-1">
            Create and manage tournament events.
          </p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? 'CANCEL' : '+ NEW TOURNAMENT'}
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
            CREATE TOURNAMENT
          </h2>
          <form onSubmit={handleCreate} className="space-y-4">
            {error && (
              <div className="border-2 border-pixel-red bg-pixel-red/10 p-3 font-[family-name:var(--font-pixel)] text-[12px] text-pixel-red tracking-wide leading-relaxed">
                ⚠ {error}
              </div>
            )}
            <Input label="Tournament Name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g., Annual College Fest 2026" />

            <div className="w-full flex flex-col space-y-2">
              <label className="font-[family-name:var(--font-pixel)] text-[12px] text-pixel-gold uppercase tracking-[2px]">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the tournament..."
                rows={3}
                className={pixelTextarea}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Start Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              <Input label="End Date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate || undefined} />
            </div>

            <div className="w-full flex flex-col space-y-2">
              <label className="font-[family-name:var(--font-pixel)] text-[12px] text-pixel-gold uppercase tracking-[2px]">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={pixelSelect}
              >
                <option value="draft">Draft</option>
                <option value="registration_open">Registration Open</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <Button fullWidth type="submit" disabled={loading}>
              {loading ? 'CREATING...' : 'CREATE TOURNAMENT'}
            </Button>
          </form>
        </div>
      )}

      {/* Tournaments List */}
      {tournaments.length === 0 ? (
        <div
          className="bg-pixel-card border-[3px] border-pixel-border p-12 text-center"
          style={{ boxShadow: '3px 3px 0 var(--color-pixel-border)' }}
        >
          <span className="text-5xl mb-4 block opacity-40">🏆</span>
          <h3 className="font-[family-name:var(--font-pixel)] text-[12px] text-pixel-slate-light mb-2 leading-relaxed">
            NO TOURNAMENTS YET
          </h3>
          <p className="font-[family-name:var(--font-vt)] text-[22px] text-pixel-slate">
            Create your first tournament to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {tournaments.map((t) => (
            <div
              key={t.id}
              className="bg-pixel-card border-[3px] border-pixel-border p-4 sm:p-5 relative hover:-translate-x-0.5 hover:-translate-y-0.5 transition-transform duration-100"
              style={{ boxShadow: '3px 3px 0 var(--color-pixel-border)' }}
            >
              <div className="absolute top-0 left-0 right-0 h-[2px]"
                style={{ background: 'linear-gradient(90deg, var(--color-pixel-gold), var(--color-pixel-purple))' }}
              />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <h3 className="font-[family-name:var(--font-pixel)] text-[12px] text-pixel-slate-light leading-relaxed">
                  {t.name.toUpperCase()}
                </h3>
                <span className={`font-[family-name:var(--font-pixel)] text-[12px] px-2 py-1 border-2 self-start sm:self-auto tracking-wide ${statusColor(t.status)}`}>
                  {t.status.replace(/_/g, ' ').toUpperCase()}
                </span>
              </div>

              {t.description && (
                <p className="font-[family-name:var(--font-vt)] text-[22px] text-pixel-slate mb-3">{t.description}</p>
              )}

              <div className="flex flex-wrap items-center gap-4 font-[family-name:var(--font-vt)] text-[26px] text-pixel-slate mb-4">
                {t.start_date && <span>📅 {formatToDDMMYY(t.start_date)}</span>}
                {t.end_date && <span>→ {formatToDDMMYY(t.end_date)}</span>}
              </div>

              <div className="flex gap-3 flex-wrap">
                <Button variant="primary" onClick={() => navigate(`/admin/tournaments/${t.id}/events`)}>
                  MANAGE EVENTS
                </Button>
                <Button variant="secondary" onClick={() => navigate(`/admin/tournaments/${t.id}/teams`)}>
                  MANAGE TEAMS
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
