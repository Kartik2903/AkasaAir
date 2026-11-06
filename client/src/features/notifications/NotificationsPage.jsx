import { BellOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState, ErrorState } from '@/components/shared/states';
import { useNotifications, useMarkRead } from './NotificationBell';
import { cn, formatDateTime } from '@/lib/utils';

export default function NotificationsPage() {
  const { data, isLoading, error, refetch } = useNotifications();
  const read = useMarkRead();
  const navigate = useNavigate();
  const open = (n) => { if (!n.isRead) read.one.mutate(n.id); if (n.relatedEntityId) navigate(`/requests/${n.relatedEntityId}`); };

  return (
    <>
      <PageHeader title="Notifications" description="Updates on your requests and the approvals waiting for you."
        actions={<Button variant="outline" disabled={!data?.meta?.unread} onClick={() => read.all.mutate()}>Mark all as read</Button>} />
      <Card>
        {error ? <ErrorState error={error} onRetry={refetch} />
          : isLoading ? <div className="space-y-4 p-5">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-10" />)}</div>
          : !data.data.length ? <EmptyState icon={BellOff} title="No notifications yet" description="You will see approval updates and information requests here." />
          : (
            <ul className="divide-y divide-line">
              {data.data.map((n) => (
                <li key={n.id}>
                  <button onClick={() => open(n)} className="flex w-full cursor-pointer items-start gap-3 px-5 py-4 text-left transition-colors duration-150 hover:bg-surface-2">
                    <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.isRead ? 'bg-transparent' : 'bg-accent')} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className={cn('block text-sm', !n.isRead && 'font-semibold')}>{n.title}{!n.isRead && <span className="sr-only"> (unread)</span>}</span>
                      <span className="block text-sm text-muted">{n.message}</span>
                    </span>
                    <span className="tnum shrink-0 text-xs text-muted">{formatDateTime(n.createdAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
      </Card>
    </>
  );
}
