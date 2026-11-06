import { Badge } from '@/components/ui/badge';

const MAP = {
  PENDING_MANAGER: ['Awaiting manager', 'info'],
  PENDING_HOD: ['Awaiting HOD', 'info'],
  NEEDS_INFO: ['Info requested', 'warn'],
  APPROVED: ['Approved', 'ok'],
  REJECTED: ['Rejected', 'bad'],
  CANCELLED: ['Cancelled', 'neutral'],
};
export const statusLabel = (s) => MAP[s]?.[0] ?? s;
// Status is always conveyed by its label text, colour only reinforces it.
export const LeaveStatusBadge = ({ status }) => <Badge tone={MAP[status]?.[1] ?? 'neutral'}>{statusLabel(status)}</Badge>;
export const STATUS_OPTIONS = Object.keys(MAP);
export const STATUS_COLOR = { PENDING_MANAGER: 'var(--info)', PENDING_HOD: 'var(--accent)', NEEDS_INFO: 'var(--warn)', APPROVED: 'var(--ok)', REJECTED: 'var(--bad)', CANCELLED: 'var(--muted)' };
