import { useMemo, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/shared/PageHeader';
import { ErrorState } from '@/components/shared/states';
import { insightsApi } from '@/services/api';
import { cn, formatDay, formatRange, toIsoDay } from '@/lib/utils';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const monthStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export default function CalendarPage({ title = 'Team calendar' }) {
  const [cursor, setCursor] = useState(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1); });
  const [employeeId, setEmployeeId] = useState('');
  const [selected, setSelected] = useState(toIsoDay(new Date()));
  const month = monthStr(cursor);
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ['calendar', month, employeeId], queryFn: () => insightsApi.calendar({ month, employeeId: employeeId || undefined }).then((r) => r.data), placeholderData: keepPreviousData,
  });

  const cells = useMemo(() => {
    const lead = (cursor.getDay() + 6) % 7; // Monday first
    const total = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    return [...Array(lead).fill(null), ...Array.from({ length: total }, (_, i) => toIsoDay(new Date(cursor.getFullYear(), cursor.getMonth(), i + 1)))];
  }, [cursor]);

  const on = (day) => (data?.entries ?? []).filter((e) => e.fromDate <= day && e.toDate >= day);
  const todayIso = toIsoDay(new Date());
  const selectedEntries = on(selected);
  const shift = (n) => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + n, 1));

  return (
    <>
      <PageHeader title={title} description="Approved leave is solid; leave still awaiting a decision is outlined. Reasons and documents are never shown here."
        actions={data?.team?.length > 1 && (
          <Select aria-label="Filter by person" className="w-48" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
            <option value="">Everyone</option>{data.team.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
        )} />
      {error ? <ErrorState error={error} onRetry={refetch} /> : (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <Card className="p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base">{cursor.toLocaleString('en-IN', { month: 'long', year: 'numeric' })}</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" aria-label="Previous month" onClick={() => shift(-1)}><ChevronLeft size={16} /></Button>
                <Button variant="outline" size="sm" onClick={() => { const n = new Date(); setCursor(new Date(n.getFullYear(), n.getMonth(), 1)); setSelected(todayIso); }}>Today</Button>
                <Button variant="outline" size="icon" aria-label="Next month" onClick={() => shift(1)}><ChevronRight size={16} /></Button>
              </div>
            </div>
            {isLoading ? <Skeleton className="h-80" /> : (
              <div role="grid" aria-label="Leave calendar" className="grid grid-cols-7 gap-px overflow-hidden rounded-md border border-line bg-line">
                {WEEKDAYS.map((w) => <div key={w} role="columnheader" className="bg-surface-2 py-2 text-center text-xs font-semibold text-muted">{w}</div>)}
                {cells.map((day, i) => {
                  if (!day) return <div key={`b${i}`} className="min-h-14 bg-surface-2 sm:min-h-20" />;
                  const entries = on(day);
                  return (
                    <button key={day} role="gridcell" aria-selected={day === selected} aria-label={`${formatDay(day)}, ${entries.length} on leave`} onClick={() => setSelected(day)}
                      className={cn('flex min-h-14 cursor-pointer flex-col items-start justify-start bg-surface p-1 text-left transition-colors duration-150 hover:bg-surface-2 sm:min-h-20 sm:p-1.5', day === selected && 'outline-2 -outline-offset-2 outline-accent')}>
                      <span className={cn('tnum text-xs', day === todayIso ? 'font-bold text-accent' : 'text-muted')}>{Number(day.slice(8))}</span>
                      <span className="mt-1 hidden flex-col gap-0.5 sm:flex">
                        {entries.slice(0, 2).map((e) => (
                          <span key={e.id} className={cn('truncate rounded px-1 text-[11px] font-semibold', e.status === 'APPROVED' ? 'bg-accent-soft text-accent' : 'border border-dashed border-accent text-muted')}>{e.employeeName}</span>
                        ))}
                        {entries.length > 2 && <span className="text-[11px] text-muted">+{entries.length - 2} more</span>}
                      </span>
                      {entries.length > 0 && <span className="mt-1 block text-[11px] font-semibold text-accent sm:hidden">{entries.length}</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </Card>
          <Card className="h-fit p-5">
            <h2 className="text-base">{formatDay(selected)}</h2>
            {selectedEntries.length === 0 ? <p className="mt-3 text-sm text-muted">Everyone is available.</p> : (
              <ul className="mt-3 divide-y divide-line">
                {selectedEntries.map((e) => (
                  <li key={e.id} className="py-2.5 text-sm">
                    <p className="font-semibold">{e.employeeName}{e.own ? ' (you)' : ''}</p>
                    <p className="tnum text-xs text-muted">{formatRange(e.fromDate, e.toDate)} · {e.status === 'APPROVED' ? 'Approved' : 'Awaiting decision'}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
