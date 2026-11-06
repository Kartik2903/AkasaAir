import { AlertTriangle, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function EmptyState({ title, description, action, icon: Icon = Inbox }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-surface-2 text-muted"><Icon size={22} aria-hidden /></span>
      <h3 className="mt-4 text-base">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div role="alert" className="flex flex-col items-center px-6 py-14 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-bad-soft text-bad"><AlertTriangle size={22} aria-hidden /></span>
      <h3 className="mt-4 text-base">Something went wrong</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">{error?.message ?? 'Please try again.'}</p>
      {onRetry && <Button variant="outline" className="mt-5" onClick={onRetry}>Try again</Button>}
    </div>
  );
}
