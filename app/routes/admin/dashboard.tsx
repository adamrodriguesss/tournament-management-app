import { redirect, useNavigate } from "react-router";
import { supabase } from "../../lib/supabase";
import { AdminLayout } from "../../components/layout/AdminLayout";

export async function clientLoader() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return redirect("/login");
  }

  const { data: user, error } = await supabase
    .from("users")
    .select("role, full_name, email")
    .eq("id", session.user.id)
    .single();

  if (error || !user || user.role !== "admin") {
    return redirect("/");
  }

  return { user: { ...user, id: session.user.id } };
}

export default function AdminDashboard({ loaderData }: { loaderData: { user: { role: string; full_name: string; email: string; id: string } } }) {
  return (
    <AdminLayout user={loaderData.user} activeItem="Dashboard">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
        <p className="text-slate-400 mt-1">Welcome back, {loaderData.user.full_name || "Admin"}.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        {[
          { label: "Total Events", value: "—", icon: "📅" },
          { label: "Active Tournaments", value: "—", icon: "🏆" },
          { label: "Registered Users", value: "—", icon: "👥" },
          { label: "Pending Approvals", value: "—", icon: "⏳" },
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
