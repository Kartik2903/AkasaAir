import { Link } from 'react-router-dom';
import { Plus, CalendarCheck, Hourglass, ClipboardCheck, XCircle, Users, MessageCircleQuestion } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { EmptyState, ErrorState } from '@/components/shared/states';
import { STATUS_COLOR, statusLabel } from '@/components/shared/StatusBadge';
import { useAuth } from '@/features/auth/AuthContext';
import { useDashboard, useTrends, useWorkload } from '@/features/leaves/hooks';
import { formatRange, formatRelative } from '@/lib/utils';

const tip = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--ink)' };
const monthLabel = (m) => new Date(`${m}-01T00:00:00`).toLocaleString('en-IN', { month: 'short' });
const ACTION_TEXT = { SUBMITTED: 'Submitted', APPROVED: 'Approved', REJECTED: 'Rejected', INFO_REQUESTED: 'Info requested', EMPLOYEE_RESPONSE: 'Employee responded', CANCELLED: 'Cancelled' };

function ChartCard({ title, label, loading, empty, children }) {
  return (
    <Card className="p-5">
      <h2 className="text-base">{title}</h2>
      <div className="mt-4 h-60" role="img" aria-label={label}>
        {loading ? <Skeleton className="h-full" /> : empty ? <EmptyState title="No data yet" description="This chart fills in as requests are made." /> : <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>}
      </div>
    </Card>
  );
}

function TrendChart({ trends }) {
  return (
    <ChartCard title="Monthly leave trend" label="Bar chart of requests and approved leave days per month" loading={!trends} empty={trends && trends.trend.every((t) => !t.requests)}>
      <BarChart data={trends?.trend.map((t) => ({ ...t, name: monthLabel(t.month) }))}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="name" stroke="var(--muted)" tickLine={false} />
        <YAxis allowDecimals={false} stroke="var(--muted)" tickLine={false} axisLine={false} />
        <Tooltip contentStyle={tip} cursor={{ fill: 'var(--surface-2)' }} />
        <Legend />
        <Bar dataKey="requests" name="Requests" fill="var(--accent)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="approvedDays" name="Approved days" fill="var(--ok)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartCard>
  );
}
function StatusChart({ trends }) {
  const data = trends?.byStatus.map((s) => ({ ...s, label: statusLabel(s.name) }));
  return (
    <ChartCard title="Status distribution" label="Donut chart of requests by status" loading={!trends} empty={trends && !data.length}>
      <PieChart>
        <Pie isAnimationActive={false} data={data} dataKey="value" nameKey="label" innerRadius={50} outerRadius={85} stroke="var(--surface)">
          {data?.map((s) => <Cell key={s.name} fill={STATUS_COLOR[s.name]} />)}
        </Pie>
        <Tooltip contentStyle={tip} /><Legend />
      </PieChart>
    </ChartCard>
  );
}

function RequestList({ title, items, empty }) {
  return (
    <Card className="p-5">
      <h2 className="text-base">{title}</h2>
      {items.length === 0 ? <p className="mt-3 text-sm text-muted">{empty}</p> : (
        <ul className="mt-3 divide-y divide-line">
          {items.map((r) => (
            <li key={r.id}><Link to={`/requests/${r.id}`} className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-accent">
              <span className="font-semibold">{r.employeeName}</span><span className="tnum text-muted">{formatRange(r.fromDate, r.toDate)}</span>
            </Link></li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function EmployeeDashboard() {
  const { data, isLoading, error, refetch } = useDashboard('employee');
  const trends = useTrends();
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  return (
    <>
      <PageHeader title="Overview" description="Your leave at a glance." actions={<Button asChild><Link to="/apply"><Plus size={16} aria-hidden /> Apply for leave</Link></Button>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total requests" icon={CalendarCheck} loading={isLoading} value={data?.total} />
        <StatCard label="Approved" icon={ClipboardCheck} loading={isLoading} value={data?.approved} />
        <StatCard label="Pending" icon={Hourglass} loading={isLoading} value={data?.pending} hint={data?.needsInfo ? `${data.needsInfo} need your reply` : undefined} />
        <StatCard label="Rejected" icon={XCircle} loading={isLoading} value={data?.rejected} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <RequestList title="Upcoming approved leave" items={(data?.upcoming ?? []).map((u) => ({ ...u, employeeName: `${u.daysCount} ${u.daysCount === 1 ? 'day' : 'days'}` }))} empty="No upcoming approved leave." />
        <Card className="p-5">
          <h2 className="text-base">Recent activity</h2>
          {!data?.recentActivity.length ? <p className="mt-3 text-sm text-muted">Nothing yet.</p> : (
            <ul className="mt-3 divide-y divide-line">
              {data.recentActivity.map((a) => (
                <li key={a.id}><Link to={`/requests/${a.requestId}`} className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-accent">
                  <span><span className="font-semibold">{ACTION_TEXT[a.action] ?? a.action}</span> <span className="text-muted">by {a.actorName}</span></span>
                  <span className="shrink-0 text-xs text-muted">{formatRelative(a.createdAt)}</span>
                </Link></li>
              ))}
            </ul>
          )}
        </Card>
        <TrendChart trends={trends.data} /><StatusChart trends={trends.data} />
      </div>
    </>
  );
}

function ApproverDashboard({ role }) {
  const { data, isLoading, error, refetch } = useDashboard(role);
  const trends = useTrends();
  const workload = useWorkload(true);
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  const isHod = role === 'hod';
  return (
    <>
      <PageHeader title="Overview" description={isHod ? 'Approvals and leave across your department.' : 'Approvals and availability for your team.'}
        actions={<Button asChild><Link to="/approvals">{isHod ? 'HOD approvals' : 'Pending approvals'}</Link></Button>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pending approvals" icon={Hourglass} loading={isLoading} value={data?.pendingApprovals} hint="Waiting for you" />
        <StatCard label="Awaiting employee info" icon={MessageCircleQuestion} loading={isLoading} value={data?.awaitingInfo} />
        <StatCard label="Approved" icon={ClipboardCheck} loading={isLoading} value={data?.approved} />
        <StatCard label="On leave today" icon={Users} loading={isLoading} value={data?.onLeaveNow.length} hint={data?.onLeaveNow.map((p) => p.employeeName).join(', ') || undefined} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <RequestList title="Upcoming absences" items={data?.upcoming ?? []} empty="No upcoming approved leave." />
        <Card className="p-5">
          <h2 className="text-base">Recent decisions</h2>
          {!data?.recentDecisions.length ? <p className="mt-3 text-sm text-muted">No decisions yet.</p> : (
            <ul className="mt-3 divide-y divide-line">
              {data.recentDecisions.map((a) => (
                <li key={a.id}><Link to={`/requests/${a.requestId}`} className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-accent">
                  <span><span className="font-semibold">{ACTION_TEXT[a.action]}</span> <span className="text-muted">{a.employeeName}</span></span>
                  <span className="shrink-0 text-xs text-muted">{formatRelative(a.createdAt)}</span>
                </Link></li>
              ))}
            </ul>
          )}
        </Card>
        <TrendChart trends={trends.data} /><StatusChart trends={trends.data} />
        <ChartCard title="Your approval workload" label="Stacked bar chart of your decisions per month" loading={!workload.data} empty={workload.data && workload.data.byMonth.every((m) => !m.approved && !m.rejected && !m.infoRequested)}>
          <BarChart data={workload.data?.byMonth.map((m) => ({ ...m, name: monthLabel(m.month) }))}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="name" stroke="var(--muted)" tickLine={false} />
            <YAxis allowDecimals={false} stroke="var(--muted)" tickLine={false} axisLine={false} />
            <Tooltip contentStyle={tip} cursor={{ fill: 'var(--surface-2)' }} /><Legend />
            <Bar dataKey="approved" name="Approved" stackId="a" fill="var(--ok)" />
            <Bar dataKey="rejected" name="Rejected" stackId="a" fill="var(--bad)" />
            <Bar dataKey="infoRequested" name="Info requested" stackId="a" fill="var(--warn)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>
        <ChartCard title={isHod ? 'Approved days by employee (department)' : 'Approved days by team member'} label="Bar chart of approved leave days per employee" loading={!trends.data} empty={trends.data && !trends.data.byEmployee.length}>
          <BarChart data={trends.data?.byEmployee} layout="vertical" margin={{ left: 16 }}>
            <CartesianGrid horizontal={false} stroke="var(--border)" />
            <XAxis type="number" allowDecimals={false} stroke="var(--muted)" tickLine={false} />
            <YAxis type="category" dataKey="name" width={90} stroke="var(--muted)" tickLine={false} axisLine={false} />
            <Tooltip contentStyle={tip} cursor={{ fill: 'var(--surface-2)' }} />
            <Bar dataKey="days" name="Days" fill="var(--accent)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ChartCard>
      </div>
    </>
  );
}

export default function DashboardPage() {
  const { role } = useAuth();
  return role === 'EMPLOYEE' ? <EmployeeDashboard /> : <ApproverDashboard role={role.toLowerCase()} />;
}
