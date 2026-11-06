import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { insightsApi } from '@/services/api';
import { cn, formatRelative } from '@/lib/utils';

export const useNotifications = () =>
  useQuery({ queryKey: ['notifications'], queryFn: () => insightsApi.notifications(), refetchInterval: 30_000 });

export function useMarkRead() {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ['notifications'] });
  return { one: useMutation({ mutationFn: insightsApi.markRead, onSuccess: refresh }), all: useMutation({ mutationFn: insightsApi.markAllRead, onSuccess: refresh }) };
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const { data } = useNotifications();
  const read = useMarkRead();
  const unread = data?.meta?.unread ?? 0;

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown); document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const openItem = (n) => { if (!n.isRead) read.one.mutate(n.id); setOpen(false); if (n.relatedEntityId) navigate(`/requests/${n.relatedEntityId}`); };

  return (
    <div ref={ref} className="relative">
      <Button variant="ghost" size="icon" aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Bell size={18} />
        {unread > 0 && <span aria-hidden className="tnum absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-ink">{unread > 9 ? '9+' : unread}</span>}
      </Button>
      {open && (
        <div className="absolute right-0 top-11 z-40 w-[22rem] max-w-[calc(100vw-2rem)] rounded-md border border-line bg-surface shadow-card">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
            <Button variant="ghost" size="sm" disabled={!unread} onClick={() => read.all.mutate()}>Mark all read</Button>
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {!data?.data?.length && <li className="px-4 py-8 text-center text-sm text-muted">You are all caught up.</li>}
            {data?.data?.slice(0, 6).map((n) => (
              <li key={n.id}>
                <button onClick={() => openItem(n)} className={cn('block w-full cursor-pointer px-4 py-3 text-left fade duration-150 hover:bg-surface-2', !n.isRead && 'bg-accent-soft/50')}>
                  <p className="flex items-center justify-between gap-2 text-sm"><span className={cn(!n.isRead && 'font-semibold')}>{n.title}</span>{!n.isRead && <span className="text-xs font-semibold text-accent">New</span>}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted">{n.message}</p>
                  <p className="mt-1 text-xs text-muted">{formatRelative(n.createdAt)}</p>
                </button>
              </li>
            ))}
          </ul>
          <Link to="/notifications" onClick={() => setOpen(false)} className="block border-t border-line px-4 py-2.5 text-center text-sm font-semibold text-accent hover:bg-surface-2">View all</Link>
        </div>
      )}
    </div>
  );
}
