import { useMemo, useState } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { LayoutDashboard, CalendarPlus, ListChecks, CalendarDays, ClipboardCheck, Users, ScrollText, Menu, Moon, Sun, LogOut, Search, X, CalendarRange } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumbs } from './Breadcrumbs';
import { CommandPalette } from '@/components/shared/CommandPalette';
import { NotificationBell } from '@/features/notifications/NotificationBell';
import { useAuth } from '@/features/auth/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

// One shell, role-specific navigation. Hiding a link is a convenience; the API enforces access.
const NAV = {
  EMPLOYEE: [
    { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/apply', label: 'Apply for leave', icon: CalendarPlus },
    { to: '/requests', label: 'My requests', icon: ListChecks },
    { to: '/calendar', label: 'Team calendar', icon: CalendarDays },
  ],
  MANAGER: [
    { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/approvals', label: 'Pending approvals', icon: ClipboardCheck },
    { to: '/team-requests', label: 'Team requests', icon: Users },
    { to: '/calendar', label: 'Team calendar', icon: CalendarDays },
    { to: '/apply', label: 'Apply for leave', icon: CalendarPlus },
    { to: '/requests', label: 'My requests', icon: ListChecks },
    { to: '/audit', label: 'Audit history', icon: ScrollText },
  ],
  HOD: [
    { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/approvals', label: 'HOD approvals', icon: ClipboardCheck },
    { to: '/team-requests', label: 'Department requests', icon: Users },
    { to: '/calendar', label: 'Department calendar', icon: CalendarRange },
    { to: '/audit', label: 'Audit history', icon: ScrollText },
  ],
};
export const ROLE_LABEL = { EMPLOYEE: 'Employee', MANAGER: 'Manager', HOD: 'Head of department' };

export function AppLayout() {
  const [open, setOpen] = useState(false);
  const [dark, toggleTheme] = useTheme();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { user, logout } = useAuth();
  const nav = useMemo(() => NAV[user.role], [user.role]);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className={cn('fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-line bg-surface p-4 transition-transform duration-200 lg:static lg:translate-x-0', open ? 'translate-x-0' : '-translate-x-full max-lg:invisible')}>
        <div className="mb-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-lg font-semibold"><CalendarRange size={20} className="text-accent" aria-hidden /> LeaveFlow</Link>
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Close menu" onClick={() => setOpen(false)}><X size={18} /></Button>
        </div>
        <nav aria-label="Main" className="space-y-1">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)}
              className={({ isActive }) => cn('flex h-10 items-center gap-3 rounded-md px-3 text-sm font-semibold fade duration-150', isActive ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-surface-2 hover:text-ink')}>
              <Icon size={18} aria-hidden /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto border-t border-line pt-4">
          <p className="truncate text-sm font-semibold">{user.name}</p>
          <p className="truncate text-xs text-muted">{ROLE_LABEL[user.role]}</p>
          <Button variant="ghost" size="sm" className="-ml-2 mt-2" onClick={logout}><LogOut size={16} aria-hidden /> Sign out</Button>
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-ink/40 lg:hidden" onClick={() => setOpen(false)} aria-hidden />}

      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-bg/90 px-4 backdrop-blur sm:px-8">
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu" onClick={() => setOpen(true)}><Menu size={18} /></Button>
          <Breadcrumbs />
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <Button variant="outline" size="sm" onClick={() => setPaletteOpen(true)} aria-label="Open command palette">
              <Search size={15} aria-hidden /> <span className="hidden sm:inline">Search</span> <kbd className="hidden rounded border border-line px-1.5 text-xs text-muted sm:inline">Ctrl K</kbd>
            </Button>
            <NotificationBell />
            <Button variant="ghost" size="icon" aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'} onClick={toggleTheme}>{dark ? <Sun size={18} /> : <Moon size={18} />}</Button>
          </div>
        </header>
        <main className="mx-auto w-full min-w-0 max-w-6xl px-4 py-8 sm:px-8"><Outlet /></main>
      </div>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} onToggleTheme={toggleTheme} nav={nav} />
    </div>
  );
}
