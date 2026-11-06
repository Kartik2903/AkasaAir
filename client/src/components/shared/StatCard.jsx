import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function StatCard({ label, value, hint, icon: Icon, loading }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between text-sm text-muted">
        <span>{label}</span>
        {Icon && <Icon size={18} aria-hidden />}
      </div>
      {loading ? <Skeleton className="mt-3 h-8 w-24" /> : <p className="tnum mt-2 text-3xl font-semibold">{value}</p>}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </Card>
  );
}
