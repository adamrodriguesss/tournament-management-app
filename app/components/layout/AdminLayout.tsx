import { useState } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';

type AdminLayoutProps = {
  user: { full_name: string; email: string };
  activeItem: string;
  children: React.ReactNode;
};

const navItems = [
  { label: "Dashboard", icon: "📊", path: "/admin/dashboard" },
  { label: "Tournaments", icon: "🏆", path: "/admin/tournaments" },
];

export function AdminLayout({ user, activeItem, children }: AdminLayoutProps) {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const sidebarContent = (
    <>
      <div className="p-6 border-b border-slate-800">
        <h2 className="text-lg font-bold text-indigo-400">Admin Panel</h2>
        <p className="text-xs text-slate-500 mt-1">University Event Management</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.label}
            onClick={() => {
              navigate(item.path);
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 ${
              item.label === activeItem
                ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-50"
            }`}
          >
            <span>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-sm font-bold">
            {(user.full_name || user.email || "A").charAt(0).toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-slate-50 truncate">{user.full_name || "Admin"}</p>
            <p className="text-xs text-slate-500 truncate">{user.email}</p>
          </div>
        </div>
        <Button variant="secondary" fullWidth onClick={handleLogout}>
          Sign Out
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50 flex flex-col md:flex-row">
      {/* Mobile Top Bar */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
            aria-label="Toggle menu"
          >
            {sidebarOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            )}
          </button>
          <h2 className="text-lg font-bold text-indigo-400">Admin Panel</h2>
        </div>
        <span className="text-xs text-slate-500">{user.email}</span>
      </header>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-950 border-r border-slate-800 flex flex-col transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
