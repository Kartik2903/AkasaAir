import { Check, Clock, MessageCircleQuestion, Send, X, Reply, Ban, CircleDot } from 'lucide-react';
import { cn, formatDateTime } from '@/lib/utils';

const ROLE = { EMPLOYEE: 'Employee', MANAGER: 'Manager', HOD: 'HOD' };
const EVENT = {
  SUBMITTED: { label: 'Submitted', icon: Send, tone: 'text-muted' },
  APPROVED: { label: 'Approved', icon: Check, tone: 'text-ok' },
  REJECTED: { label: 'Rejected', icon: X, tone: 'text-bad' },
  INFO_REQUESTED: { label: 'Information requested', icon: MessageCircleQuestion, tone: 'text-warn' },
  EMPLOYEE_RESPONSE: { label: 'Employee responded', icon: Reply, tone: 'text-accent' },
  CANCELLED: { label: 'Cancelled', icon: Ban, tone: 'text-muted' },
  COMMENT: { label: 'Comment', icon: MessageCircleQuestion, tone: 'text-muted' },
};
const STAGE_NAME = { MANAGER: 'Manager', HOD: 'HOD' };

/** Chronological events from the server, followed by the stages still to come. */
export function ApprovalTimeline({ timeline, stages, status }) {
  const finished = ['APPROVED', 'REJECTED', 'CANCELLED'].includes(status);
  const upcoming = finished ? [] : stages.filter((s) => s.state === 'current' || s.state === 'pending' || s.state === 'needs_info');
  return (
    <ol className="relative space-y-5" aria-label="Approval timeline">
      {timeline.map((e) => {
        const meta = EVENT[e.action] ?? EVENT.COMMENT;
        return (
          <li key={e.id} className="flex gap-3">
            <span className={cn('relative z-10 mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-line bg-surface', meta.tone)}><meta.icon size={14} aria-hidden /></span>
            <div className="min-w-0 flex-1">
              <p className="text-sm"><span className="font-semibold">{meta.label}</span>{' '}
                <span className="text-muted">by {e.actorName} ({ROLE[e.actorRole]})</span></p>
              <p className="tnum text-xs text-muted">{formatDateTime(e.createdAt)}</p>
              {e.comment && <p className="mt-1.5 rounded-md bg-surface-2 px-3 py-2 text-sm">{e.comment}</p>}
            </div>
          </li>
        );
      })}
      {upcoming.map((s) => {
        const current = s.state !== 'pending';
        return (
          <li key={s.stage} className="flex gap-3">
            <span className={cn('relative z-10 mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border', current ? 'border-accent bg-accent-soft text-accent' : 'border-dashed border-line bg-surface text-muted')}>
              {current ? <CircleDot size={14} aria-hidden /> : <Clock size={14} aria-hidden />}
            </span>
            <div>
              <p className={cn('text-sm', current ? 'font-semibold' : 'text-muted')}>
                {s.state === 'needs_info' ? `Waiting for the employee to answer ${STAGE_NAME[s.stage]}` : current ? `${STAGE_NAME[s.stage]} approval pending` : `${STAGE_NAME[s.stage]} approval to follow`}
              </p>
              {s.approver && <p className="text-xs text-muted">{s.approver}</p>}
            </div>
          </li>
        );
      })}
      {/* connecting rail */}
      <span aria-hidden className="absolute bottom-3 left-[13px] top-3 w-px bg-line" />
    </ol>
  );
}
