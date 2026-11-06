import { Link } from 'react-router-dom';
import { ScrollText } from 'lucide-react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { Pagination } from '@/components/shared/Pagination';
import { EmptyState } from '@/components/shared/states';
import { useListParams } from '@/hooks/useListParams';
import { insightsApi } from '@/services/api';
import { formatDateTime } from '@/lib/utils';

const DEFAULTS = { limit: 15 };
const pretty = (a) => a.replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase());

export default function AuditPage() {
  const [params, setParams] = useListParams(DEFAULTS);
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['audit', params], queryFn: () => insightsApi.auditFeed(params), placeholderData: keepPreviousData });
  const columns = [
    { key: 'createdAt', header: 'When', cell: (a) => <span className="tnum text-muted">{formatDateTime(a.createdAt)}</span> },
    { key: 'actor', header: 'Who', cell: (a) => a.actor?.name ?? 'System' },
    { key: 'action', header: 'Event', cell: (a) => pretty(a.action) },
    { key: 'employeeName', header: 'Request', cell: (a) => <Link className="whitespace-nowrap font-semibold text-accent underline underline-offset-2" to={`/requests/${a.entityId}`}>{a.employeeName}</Link> },
    { key: 'detail', header: 'Details', cell: (a) => <span className="text-muted">{a.metadata?.comment ?? a.metadata?.originalName ?? (a.newValue?.status ? pretty(a.newValue.status) : '')}</span> },
  ];
  return (
    <>
      <PageHeader title="Audit history" description="A permanent record of every action on the requests you oversee." />
      <Card className="overflow-hidden">
        <DataTable columns={columns} rows={data?.data} loading={isLoading} error={error} onRetry={refetch}
          empty={<EmptyState icon={ScrollText} title="No history yet" description="Actions on requests appear here as they happen." />} />
        <Pagination meta={data?.meta} onPage={(page) => setParams({ page }, { resetPage: false })} />
      </Card>
    </>
  );
}
