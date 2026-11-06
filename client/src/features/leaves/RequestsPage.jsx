import { Link } from 'react-router-dom';
import { Plus, SearchX, Inbox, CalendarOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/PageHeader';
import { SearchInput } from '@/components/shared/SearchInput';
import { DataTable } from '@/components/shared/DataTable';
import { Pagination } from '@/components/shared/Pagination';
import { EmptyState } from '@/components/shared/states';
import { LeaveStatusBadge, STATUS_OPTIONS, statusLabel } from '@/components/shared/StatusBadge';
import { useListParams } from '@/hooks/useListParams';
import { formatDateTime, formatRange } from '@/lib/utils';
import { useLeaves } from './hooks';

const SCOPES = {
  mine: { title: 'My requests', description: 'Everything you have applied for and where it stands.', showEmployee: false, empty: ['No requests yet', 'When you apply for leave it will appear here.'] },
  pending: { title: 'Pending approvals', description: 'Requests waiting for your decision.', showEmployee: true, empty: ['Nothing waiting for you', 'New requests that need your decision will show up here.'] },
  team: { title: 'Team requests', description: 'All requests from the people you oversee.', showEmployee: true, empty: ['No team requests yet', 'Requests from your team will appear here.'] },
};
const DEFAULTS = (scope) => ({ scope, sortBy: 'createdAt', sortOrder: 'desc' });
const STAGE_LABEL = { MANAGER: 'Manager', HOD: 'HOD', NONE: 'Finished' };

export default function RequestsPage({ scope, title }) {
  const cfg = SCOPES[scope];
  const [params, setParams] = useListParams(DEFAULTS(scope));
  const query = { ...params, scope };
  const { data, isLoading, isFetching, error, refetch } = useLeaves(query);
  const filtered = !!(params.search || params.status || params.stage || params.from || params.to);
  const clear = () => setParams({ search: '', status: '', stage: '', from: '', to: '' });
  const onSort = (key) => setParams({ sortBy: key, sortOrder: params.sortBy === key && params.sortOrder === 'asc' ? 'desc' : 'asc' });

  const columns = [
    ...(cfg.showEmployee ? [{ key: 'employee', header: 'Employee', cell: (r) => <span className="font-semibold">{r.employee.name}</span> }] : []),
    { key: 'fromDate', header: 'Dates', sortable: true, cell: (r) => <span className="tnum">{formatRange(r.fromDate, r.toDate)}</span> },
    { key: 'daysCount', header: 'Days', className: 'tnum', cell: (r) => r.daysCount },
    { key: 'status', header: 'Status', cell: (r) => <LeaveStatusBadge status={r.status} /> },
    { key: 'approvalStage', header: 'Stage', cell: (r) => <span className="text-muted">{STAGE_LABEL[r.approvalStage]}</span> },
    { key: 'createdAt', header: 'Submitted', sortable: true, cell: (r) => <span className="tnum text-muted">{formatDateTime(r.createdAt)}</span> },
    { key: 'open', header: <span className="sr-only">Open</span>, className: 'text-right', cell: (r) => <Button variant="outline" size="sm" asChild><Link to={`/requests/${r.id}`} aria-label={`Open request ${formatRange(r.fromDate, r.toDate)}`}>{scope === 'pending' ? 'Review' : 'View'}</Link></Button> },
  ];

  const empty = filtered
    ? <EmptyState icon={SearchX} title="No requests match" description="Try different filters." action={<Button variant="outline" onClick={clear}>Clear filters</Button>} />
    : <EmptyState icon={scope === 'mine' ? CalendarOff : Inbox} title={cfg.empty[0]} description={cfg.empty[1]} action={scope === 'mine' && <Button asChild><Link to="/apply"><Plus size={16} aria-hidden /> Apply for leave</Link></Button>} />;

  return (
    <>
      <PageHeader title={title ?? cfg.title} description={cfg.description}
        actions={scope === 'mine' && <Button asChild><Link to="/apply"><Plus size={16} aria-hidden /> Apply for leave</Link></Button>} />
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-end gap-3 border-b border-line p-4">
          {cfg.showEmployee && <SearchInput key={params.search ?? ''} value={params.search ?? ''} onChange={(search) => setParams({ search })} placeholder="Employee name" label="Search by employee name" />}
          {scope !== 'pending' && (
            <Select aria-label="Filter by status" className="w-full sm:w-44" value={params.status ?? ''} onChange={(e) => setParams({ status: e.target.value })}>
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
            </Select>
          )}
          <Select aria-label="Filter by approval stage" className="w-full sm:w-40" value={params.stage ?? ''} onChange={(e) => setParams({ stage: e.target.value })}>
            <option value="">Any stage</option><option value="MANAGER">Manager stage</option><option value="HOD">HOD stage</option>
          </Select>
          <label className="text-xs text-muted">From<Input type="date" className="mt-1 w-full sm:w-40" value={params.from ?? ''} onChange={(e) => setParams({ from: e.target.value })} /></label>
          <label className="text-xs text-muted">To<Input type="date" className="mt-1 w-full sm:w-40" value={params.to ?? ''} onChange={(e) => setParams({ to: e.target.value })} /></label>
          {filtered && <Button variant="ghost" size="sm" onClick={clear}>Clear</Button>}
          {isFetching && !isLoading && <span className="text-xs text-muted" role="status">Updating…</span>}
        </div>
        <DataTable columns={columns} rows={data?.data} loading={isLoading} error={error} onRetry={refetch} empty={empty}
          sort={{ by: params.sortBy, order: params.sortOrder }} onSort={onSort} />
        <Pagination meta={data?.meta} onPage={(page) => setParams({ page }, { resetPage: false })} />
      </Card>
    </>
  );
}
