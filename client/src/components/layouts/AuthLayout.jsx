import { Outlet } from 'react-router-dom';
import { CalendarRange } from 'lucide-react';

export function AuthLayout() {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="hidden flex-col justify-between gap-6 overflow-hidden bg-accent-soft p-12 lg:flex">
        <div>
          <div className="flex items-center gap-2 text-lg font-semibold text-ink"><CalendarRange size={22} className="text-accent" aria-hidden /> LeaveFlow</div>
          <p className="mt-6 max-w-md text-3xl font-semibold leading-tight text-ink">Apply, approve and plan time off without the paperwork.</p>
        </div>
        <img src="/login-hero.png" alt="A leave calendar marked approved, with a Submitted, Manager Approved, HOD Approved timeline" width="1536" height="1024" className="mx-auto w-full max-w-2xl rounded-lg" />
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
