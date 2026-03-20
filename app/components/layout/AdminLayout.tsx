import { useState } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';

type NavItem = { label: string; icon: string; path: string };

type AppLayoutProps = {
  user: { full_name: string; email: string; role?: string };
  activeItem: string;
  children: React.ReactNode;
  contextTitle?: string; // e.g. tournament name for sub-pages
};

const navByRole: Record<string, NavItem[]> = {
  admin: [
    { label: 'Dashboard', icon: '📊', path: '/admin/dashboard' },
    { label: 'Tournaments', icon: '🏆', path: '/admin/tournaments' },
    { label: 'View Tournaments', icon: '👁️', path: '/tournaments' },
  ],
  event_manager: [
    { label: 'Dashboard', icon: '📋', path: '/event-manager' },
    { label: 'View Tournaments', icon: '👁️', path: '/tournaments' },
  ],
  participant: [
    { label: 'Dashboard', icon: '🏠', path: '/dashboard' },
    { label: 'View Tournaments', icon: '👁️', path: '/tournaments' },
  ],
};

const roleLabel: Record<string, string> = {
  admin: 'Admin Panel',
  event_manager: 'Event Manager',
  participant: 'FestFlow',
};

// Admin-specific child-page groupings for sidebar highlight
const adminChildItems = ['Event Management', 'Team Approvals'];

export function AppLayout({ user, activeItem, children, contextTitle }: AppLayoutProps) {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true); // desktop: open by default
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const role = user.role || 'participant';
  const navItems = navByRole[role] || navByRole.participant;
  const panelLabel = roleLabel[role] || 'FestFlow';

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/tournaments');
  };

  const isActive = (item: NavItem) => {
    if (item.label === activeItem) return true;
    if (role === 'admin' && item.label === 'Tournaments' && adminChildItems.includes(activeItem)) return true;
    return false;
  };

  const SidebarContent = ({ onNav }: { onNav: () => void }) => (
    <>
      {/* Brand Header */}
      <div className="flex items-center justify-between p-5 border-b border-slate-800">
        <div className="overflow-hidden">
          <h2 className="text-base font-bold text-indigo-400 truncate">{panelLabel}</h2>
          {contextTitle ? (
            <p className="text-xs text-slate-50 font-medium mt-0.5 truncate" title={contextTitle}>{contextTitle}</p>
          ) : (
            <p className="text-xs text-slate-500 mt-0.5">University Event Management</p>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map((item) => (
          <button
            key={item.label}
            onClick={() => { navigate(item.path); onNav(); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 ${
              isActive(item)
                ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-50'
            }`}
          >
            <span>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      {/* User Footer */}
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-sm font-bold shrink-0">
            {(user.full_name || user.email || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-slate-50 truncate">{user.full_name || 'User'}</p>
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
      {/* ── Mobile Top Bar ── */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileSidebarOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            )}
          </button>
          <h2 className="text-base font-bold text-indigo-400">{panelLabel}</h2>
        </div>
        <span className="text-xs text-slate-500 truncate max-w-[160px]">{user.email}</span>
      </header>

      {/* ── Mobile Overlay ── */}
      {mobileSidebarOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* ── Mobile Sidebar ── */}
      <aside
        className={`md:hidden fixed inset-y-0 left-0 z-50 w-64 bg-slate-950 border-r border-slate-800 flex flex-col transform transition-transform duration-200 ease-in-out ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent onNav={() => setMobileSidebarOpen(false)} />
      </aside>

      {/* ── Desktop Sidebar ── */}
      <aside
        className={`hidden md:flex flex-col bg-slate-950 border-r border-slate-800 shrink-0 transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'w-64' : 'w-0 overflow-hidden border-r-0'
        }`}
      >
        <SidebarContent onNav={() => {}} />
      </aside>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Desktop sub-header with collapse toggle */}
        <div className="hidden md:flex items-center gap-2 px-4 py-2 border-b border-slate-800 bg-slate-900 shrink-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-50 transition-colors"
            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/>
              </svg>
            )}
          </button>
          <span className="text-sm text-slate-500">{activeItem}</span>
        </div>

        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}

// ── Backwards-compatible alias so AdminLayout imports still work ──
export function AdminLayout(props: Omit<AppLayoutProps, 'user'> & { user: { full_name: string; email: string }; tournamentName?: string }) {
  const { tournamentName, ...rest } = props;
  return <AppLayout {...rest} user={{ ...props.user, role: 'admin' }} contextTitle={tournamentName || rest.contextTitle} />;
}
