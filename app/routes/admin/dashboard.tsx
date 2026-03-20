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
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
        <p className="text-slate-400 mt-1">Welcome back, {user.full_name || "Admin"}.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        {[
          { label: "Total Events", value: stats.totalEvents, icon: "📅" },
          { label: "Active Tournaments", value: stats.activeTournaments, icon: "🏆" },
          { label: "Registered Users", value: stats.registeredUsers, icon: "👥" },
          { label: "Pending Approvals", value: stats.pendingApprovals, icon: "⏳" },
        ].map((stat) => (
          <div key={stat.label} className="bg-slate-800 border border-slate-700 rounded-xl p-5 hover:border-slate-600 transition-colors duration-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{stat.icon}</span>
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-sm text-slate-400 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Placeholder Content */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-2">Recent Activity</h2>
        <p className="text-slate-400 text-sm">No recent activity to display. Start by creating events and tournaments.</p>
      </div>
    </AdminLayout>
  );
}
