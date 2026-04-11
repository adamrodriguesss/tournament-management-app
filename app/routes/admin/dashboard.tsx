import { redirect } from "react-router";
import { getSession, getRoleProfile } from "../../services/auth";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { supabase } from "../../lib/supabase";

export async function clientLoader() {
  const session = await getSession();
  if (!session) {
    return redirect("/login");
  }

  const { data: user, error } = await getRoleProfile(session.user.id);

  if (error || !user || user.role !== "admin") {
    return redirect("/");
  }

  // Fetch real stats
  const [eventsRes, tourneysRes, usersRes, pendingRes] = await Promise.all([
    supabase.from("events").select("id", { count: "exact", head: true }),
    supabase.from("tournaments").select("id", { count: "exact", head: true }).in("status", ["registration_open", "ongoing"]),
    supabase.from("users").select("id", { count: "exact", head: true }),
    supabase.from("teams").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  return {
    user: { ...user, id: session.user.id },
    stats: {
      totalEvents: eventsRes.count ?? 0,
      activeTournaments: tourneysRes.count ?? 0,
      registeredUsers: usersRes.count ?? 0,
      pendingApprovals: pendingRes.count ?? 0,
    }
  };
}

export default function AdminDashboard({ loaderData }: { loaderData: any }) {
  const { user, stats } = loaderData;

  return (
  <AdminLayout user={user} activeItem="Dashboard">
    <div className="mb-8 border-l-4 border-pixel-gold pl-4 py-1">
      <h1 className="font-[family-name:var(--font-pixel)] text-[26px] text-pixel-gold leading-relaxed tracking-wide">
        DASHBOARD
      </h1>
      <p className="font-[family-name:var(--font-vt)] text-[24px] text-pixel-slate mt-1">
        Welcome back, {user.full_name || 'Admin'}.
      </p>
    </div>

    {/* Stats Grid */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {[
        { label: 'Total Events',       value: stats.totalEvents,       icon: '📅', accent: 'border-pixel-cyan-dim'    },
        { label: 'Active Tournaments', value: stats.activeTournaments, icon: '🏆', accent: 'border-pixel-gold'        },
        { label: 'Registered Users',   value: stats.registeredUsers,   icon: '👥', accent: 'border-pixel-purple'      },
        { label: 'Pending Approvals',  value: stats.pendingApprovals,  icon: '⏳', accent: 'border-amber-400'         },
      ].map((stat) => (
        <div
          key={stat.label}
          className={`bg-pixel-card border-[3px] ${stat.accent} p-5 relative`}
          style={{ boxShadow: '3px 3px 0 var(--color-pixel-border)' }}
        >
          <span className="text-2xl mb-3 block">{stat.icon}</span>
          <p className="font-[family-name:var(--font-pixel)] text-[26px] text-pixel-slate-light leading-none mb-2">
            {stat.value}
          </p>
          <p className="font-[family-name:var(--font-pixel)] text-[12px] text-pixel-slate tracking-[2px] uppercase leading-relaxed">
            {stat.label}
          </p>
        </div>
      ))}
    </div>

    {/* Recent Activity */}
    <div
      className="bg-pixel-card border-[3px] border-pixel-border p-6"
      style={{ boxShadow: '3px 3px 0 var(--color-pixel-border)' }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="h-[2px] w-4 bg-pixel-gold opacity-60" />
        <h2 className="font-[family-name:var(--font-pixel)] text-[12px] text-pixel-gold tracking-[2px]">
          RECENT ACTIVITY
        </h2>
      </div>
      <p className="font-[family-name:var(--font-vt)] text-[22px] text-pixel-slate">
        No recent activity to display. Start by creating events and tournaments.
      </p>
    </div>
  </AdminLayout>
  );
}
