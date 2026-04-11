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
    <div className="flex items-center justify-between p-5 border-b-[3px] border-pixel-border">
      <div className="overflow-hidden">
        <h2 className="font-[family-name:var(--font-pixel)] text-[12px] text-pixel-gold truncate leading-relaxed tracking-wide">
          {panelLabel}
        </h2>
        {contextTitle ? (
          <p className="font-[family-name:var(--font-vt)] text-[26px] text-pixel-slate-light mt-1 truncate" title={contextTitle}>
            {contextTitle}
          </p>
        ) : (
          <p className="font-[family-name:var(--font-vt)] text-[24px] text-pixel-slate mt-1">
            University Event Mgmt
          </p>
        )}
      </div>
    </div>

    {/* Nav */}
    <nav className="flex-1 p-3 space-y-1">
      {navItems.map((item) => (
        <button
          key={item.label}
          onClick={() => { navigate(item.path); onNav(); }}
          className={`
            w-full flex items-center gap-3 px-3 py-2.5
            font-[family-name:var(--font-pixel)] text-[10px] tracking-wide uppercase
            border-2 transition-all duration-100
            ${isActive(item)
              ? 'bg-pixel-gold/10 text-pixel-gold border-pixel-gold-dark [box-shadow:2px_2px_0_var(--color-pixel-gold-dark)]'
              : 'text-pixel-slate border-transparent hover:border-pixel-border hover:text-pixel-slate-light hover:bg-pixel-card'
            }
          `}
        >
          <span className="text-base">{item.icon}</span>
          {item.label}
        </button>
      ))}
    </nav>

    {/* User Footer */}
    <div className="p-4 border-t-[3px] border-pixel-border">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 border-2 border-pixel-cyan-dim bg-pixel-cyan/10 flex items-center justify-center shrink-0
          font-[family-name:var(--font-pixel)] text-[10px] text-pixel-cyan">
          {(user.full_name || user.email || 'U').charAt(0).toUpperCase()}
        </div>
        <div className="overflow-hidden">
          <p className="font-[family-name:var(--font-pixel)] text-[10px] text-pixel-slate-light truncate leading-relaxed">
            {user.full_name || 'User'}
          </p>
          <p className="font-[family-name:var(--font-vt)] text-[24px] text-pixel-slate truncate">
            {user.email}
          </p>
        </div>
      </div>
      <Button variant="secondary" fullWidth onClick={handleLogout}>
        SIGN OUT
      </Button>
    </div>
  </>
);

return (
  <div className="min-h-screen bg-pixel-black text-pixel-slate-light flex flex-col md:flex-row">

    {/* ── Mobile Top Bar ── */}
    <header className="md:hidden flex items-center justify-between px-4 py-3 border-b-[3px] border-pixel-border bg-pixel-dark shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          className="w-9 h-9 flex items-center justify-center border-2 border-pixel-border bg-pixel-panel text-pixel-slate hover:border-pixel-gold hover:text-pixel-gold transition-colors"
          aria-label="Toggle menu"
        >
          {mobileSidebarOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          )}
        </button>
        <h2 className="font-[family-name:var(--font-pixel)] text-[10px] text-pixel-gold tracking-wide">
          {panelLabel}
        </h2>
      </div>
      <span className="font-[family-name:var(--font-vt)] text-[24px] text-pixel-slate truncate max-w-[160px]">
        {user.email}
      </span>
    </header>

    {/* ── Mobile Overlay ── */}
    {mobileSidebarOpen && (
      <div
        className="md:hidden fixed inset-0 z-40 bg-black/70"
        onClick={() => setMobileSidebarOpen(false)}
      />
    )}

    {/* ── Mobile Sidebar ── */}
    <aside
      className={`md:hidden fixed inset-y-0 left-0 z-50 w-64 bg-pixel-dark border-r-[3px] border-pixel-border flex flex-col transform transition-transform duration-200 ease-in-out ${
        mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <SidebarContent onNav={() => setMobileSidebarOpen(false)} />
    </aside>

    {/* ── Desktop Sidebar ── */}
    <aside
      className={`hidden md:flex flex-col bg-pixel-dark border-r-[3px] border-pixel-border shrink-0 transition-all duration-300 ease-in-out ${
        sidebarOpen ? 'w-64' : 'w-0 overflow-hidden border-r-0'
      }`}
    >
      <SidebarContent onNav={() => {}} />
    </aside>

    {/* ── Main Content ── */}
    <div className="flex-1 flex flex-col min-w-0">
      {/* Desktop sub-header */}
      <div className="hidden md:flex items-center gap-3 px-4 py-2 border-b-[3px] border-pixel-border bg-pixel-dark shrink-0">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="w-8 h-8 flex items-center justify-center border-2 border-pixel-border text-pixel-slate hover:border-pixel-gold hover:text-pixel-gold transition-colors"
          title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/>
          </svg>
        </button>
        <span className="font-[family-name:var(--font-pixel)] text-[10px] text-pixel-slate tracking-[2px] uppercase">
          {activeItem}
        </span>
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
