import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, X, MessageCircleQuestion, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/shared/PageHeader';
import { ErrorState } from '@/components/shared/states';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { LeaveStatusBadge } from '@/components/shared/StatusBadge';
import { ApprovalTimeline } from './ApprovalTimeline';
import { DocumentList } from './DocumentList';
import { DecisionDialog } from './DecisionDialog';
import { FilePicker } from './FilePicker';
import { useLeave, useLeaveAudit, useRespond, useCancel } from './hooks';
import { formatDateTime, formatRange } from '@/lib/utils';

const Fact = ({ label, children }) => (<div><dt className="text-xs text-muted">{label}</dt><dd className="mt-0.5 text-sm font-semibold">{children}</dd></div>);

function RespondCard({ id }) {
  const [comment, setComment] = useState('');
  const [files, setFiles] = useState([]);
  const [touched, setTouched] = useState(false);
  const respond = useRespond(id);
  const short = comment.trim().length < 3;
  return (
    <Card className="border-warn p-5">
      <h2 className="text-base">Information requested</h2>
      <p className="mt-1 text-sm text-muted">Answer below and attach anything that was asked for. The request continues at the same approval stage.</p>
      <form className="mt-4 space-y-4" noValidate onSubmit={(e) => { e.preventDefault(); setTouched(true); if (!short) respond.mutate({ comment: comment.trim(), files }); }}>
        <div>
          <label htmlFor="resp" className="mb-1.5 block text-sm font-semibold">Your response</label>
          <textarea id="resp" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} aria-invalid={touched && short} className="w-full rounded-md border border-field bg-surface px-3 py-2 text-sm aria-[invalid=true]:border-bad" />
          {touched && short && <p role="alert" className="mt-1 text-xs text-bad">Please add a short response.</p>}
        </div>
        <FilePicker files={files} onChange={setFiles} />
        <div className="flex justify-end"><Button type="submit" disabled={respond.isPending}>{respond.isPending ? 'Sending…' : 'Send response'}</Button></div>
      </form>
    </Card>
  );
}

function AuditCard({ id }) {
  const { data, isLoading } = useLeaveAudit(id);
  return (
    <Card className="p-5">
      <h2 className="text-base">Audit history</h2>
      <p className="mt-1 text-sm text-muted">Every change, recorded by the system. It cannot be edited.</p>
      {isLoading ? <Skeleton className="mt-4 h-16" /> : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="border-b border-line text-muted"><tr><th className="py-2 pr-3 font-semibold">When</th><th className="py-2 pr-3 font-semibold">Who</th><th className="py-2 font-semibold">Event</th></tr></thead>
            <tbody>
              {data.map((a) => (
                <tr key={a.id} className="border-b border-line last:border-0">
                  <td className="tnum py-2 pr-3 text-muted">{formatDateTime(a.createdAt)}</td>
                  <td className="py-2 pr-3">{a.actor?.name ?? 'System'}</td>
                  <td className="py-2">{a.action.replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase())}{a.metadata?.originalName ? `: ${a.metadata.originalName}` : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export default function RequestDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: r, isLoading, error, refetch } = useLeave(id);
  const [action, setAction] = useState(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const cancel = useCancel(id);

  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-40" /><Skeleton className="h-64" /></div>;
  const p = r.permissions;

  return (
    <>
      <Button variant="ghost" size="sm" className="-ml-2 mb-3" onClick={() => navigate(-1)}><ArrowLeft size={16} aria-hidden /> Back</Button>
      <PageHeader title={`${r.employee.name}: ${formatRange(r.fromDate, r.toDate)}`} description={`${r.daysCount} ${r.daysCount === 1 ? 'day' : 'days'} · submitted ${formatDateTime(r.createdAt)}`}
        actions={<>
          <LeaveStatusBadge status={r.status} />
          {p.canCancel && <Button variant="outline" onClick={() => setConfirmCancel(true)}><Ban size={16} aria-hidden /> Cancel request</Button>}
        </>} />

      {p.canDecide && (
        <Card className="mb-6 flex flex-wrap items-center justify-between gap-3 border-accent p-4">
          <p className="text-sm font-semibold">This request is waiting for your decision.</p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setAction('approve')}><Check size={16} aria-hidden /> Approve</Button>
            <Button variant="outline" onClick={() => setAction('request-info')}><MessageCircleQuestion size={16} aria-hidden /> Request info</Button>
            <Button variant="danger" onClick={() => setAction('reject')}><X size={16} aria-hidden /> Reject</Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          {p.canRespond && <RespondCard id={id} />}
          <Card className="p-5">
            <h2 className="text-base">Approval timeline</h2>
            <div className="mt-4"><ApprovalTimeline timeline={r.timeline} stages={r.stages} status={r.status} /></div>
          </Card>
          <AuditCard id={id} />
        </div>
        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="text-base">Details</h2>
            <dl className="mt-4 grid grid-cols-2 gap-4">
              <Fact label="Employee">{r.employee.name}</Fact>
              <Fact label="Department">{r.employee.department.name}</Fact>
              <Fact label="From"><span className="tnum">{formatRange(r.fromDate, r.fromDate)}</span></Fact>
              <Fact label="To"><span className="tnum">{formatRange(r.toDate, r.toDate)}</span></Fact>
              <Fact label="Approval path">{r.requiresHodApproval ? 'Manager, then HOD' : 'Manager'}</Fact>
              <Fact label="Current stage">{{ MANAGER: 'Manager', HOD: 'HOD', NONE: 'Finished' }[r.approvalStage]}</Fact>
            </dl>
            <p className="mt-4 text-xs text-muted">Reason</p>
            <p className="mt-0.5 text-sm">{r.reason}</p>
          </Card>
          <Card className="p-5">
            <h2 className="mb-3 text-base">Documents</h2>
            <DocumentList leaveId={id} documents={r.documents} />
          </Card>
        </div>
      </div>

      <DecisionDialog leaveId={id} action={action} onClose={() => setAction(null)} />
      <ConfirmDialog open={confirmCancel} onClose={() => setConfirmCancel(false)} loading={cancel.isPending} title="Cancel this request?"
        description="Your approvers will be notified. You can submit a new request afterwards." confirmLabel="Cancel request"
        onConfirm={() => cancel.mutate(undefined, { onSuccess: () => setConfirmCancel(false) })} />
    </>
  );
}
