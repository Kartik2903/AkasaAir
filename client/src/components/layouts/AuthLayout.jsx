import { Outlet } from 'react-router-dom';
import { CalendarRange } from 'lucide-react';
import { Spotlight } from '@/components/shared/Spotlight';

export function AuthLayout() {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-ink p-12 text-bg lg:flex lg:flex-col lg:justify-between">
        <Spotlight className="-left-40 -top-40" />
        <div className="relative z-10 flex items-center gap-2 text-lg font-semibold"><CalendarRange size={22} aria-hidden /> LeaveFlow</div>
        <p className="relative z-10 max-w-md text-3xl font-semibold leading-tight">Apply, approve and plan time off without the paperwork.</p>
      </section>
      <section className="grid place-items-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 text-lg font-semibold lg:hidden"><CalendarRange size={20} className="text-accent" aria-hidden /> LeaveFlow</div>
          <Outlet />
        </div>
      </section>
    </main>
  );
}
