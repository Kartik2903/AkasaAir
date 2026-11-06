import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, within, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test-utils';
import { formatRange, formatDay } from '@/lib/utils';
import { ApprovalTimeline } from './ApprovalTimeline';
import { DecisionDialog } from './DecisionDialog';
import { LeaveStatusBadge } from '@/components/shared/StatusBadge';
import RequestsPage from './RequestsPage';

vi.mock('@/services/api', () => ({
  leaveApi: { list: vi.fn(), decide: vi.fn().mockResolvedValue({ data: {} }) },
  insightsApi: {}, authApi: {},
}));
import { leaveApi } from '@/services/api';

const row = { id: 'r1', employee: { name: 'Esha Rao' }, fromDate: '2030-11-10', toDate: '2030-11-13', daysCount: 4, status: 'PENDING_HOD', approvalStage: 'HOD', createdAt: '2030-11-01T10:00:00Z' };
const meta = { total: 1, page: 1, limit: 10, totalPages: 1 };

describe('date-only formatting', () => {
  it('never shifts the day, whatever the timezone', () => {
    expect(formatDay('2030-11-10')).toMatch(/10 Nov 2030/);
    expect(formatRange('2030-11-10', '2030-11-10')).toBe(formatDay('2030-11-10'));
    expect(formatRange('2030-11-10', '2030-11-13')).toMatch(/10 Nov 2030 to 13 Nov 2030/);
  });
});

describe('LeaveStatusBadge', () => {
  it('uses text labels, not colour alone', () => {
    render(<LeaveStatusBadge status="NEEDS_INFO" />);
    expect(screen.getByText('Info requested')).toBeInTheDocument();
  });
});

describe('ApprovalTimeline', () => {
  const timeline = [
    { id: '1', action: 'SUBMITTED', actorName: 'Esha', actorRole: 'EMPLOYEE', stage: 'MANAGER', comment: 'Surgery', createdAt: '2030-11-01T10:00:00Z' },
    { id: '2', action: 'APPROVED', actorName: 'Meera', actorRole: 'MANAGER', stage: 'MANAGER', comment: null, createdAt: '2030-11-01T11:00:00Z' },
    { id: '3', action: 'INFO_REQUESTED', actorName: 'Harish', actorRole: 'HOD', stage: 'HOD', comment: 'Attach the letter', createdAt: '2030-11-01T12:00:00Z' },
  ];
  it('lists events in order and shows who the request is waiting on', () => {
    const stages = [{ stage: 'MANAGER', state: 'done', approver: 'Meera' }, { stage: 'HOD', state: 'needs_info', approver: 'Harish' }];
    render(<ApprovalTimeline timeline={timeline} stages={stages} status="NEEDS_INFO" />);
    const items = within(screen.getByRole('list', { name: /approval timeline/i })).getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Submitted');
    expect(items[2]).toHaveTextContent('Information requested');
    expect(items[2]).toHaveTextContent('Attach the letter');
    expect(items[3]).toHaveTextContent('Waiting for the employee to answer HOD');
  });
  it('shows no upcoming stage once the request is finished', () => {
    render(<ApprovalTimeline timeline={timeline.slice(0, 2)} stages={[{ stage: 'MANAGER', state: 'done' }]} status="APPROVED" />);
    expect(screen.queryByText(/pending/i)).not.toBeInTheDocument();
  });
});

describe('DecisionDialog', () => {
  beforeEach(() => vi.clearAllMocks());
  it('requires a comment to reject and sends it to the API', async () => {
    renderWithProviders(<DecisionDialog leaveId="r1" action="reject" onClose={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: 'Reject request' }));
    expect(await screen.findByText(/at least 5 characters/i)).toBeInTheDocument();
    expect(leaveApi.decide).not.toHaveBeenCalled();
    await userEvent.type(screen.getByLabelText(/explain the decision/i), 'Team is short-staffed');
    await userEvent.click(screen.getByRole('button', { name: 'Reject request' }));
    expect(leaveApi.decide).toHaveBeenCalledWith('r1', 'reject', 'Team is short-staffed');
  });
  it('approval needs no comment', async () => {
    renderWithProviders(<DecisionDialog leaveId="r1" action="approve" onClose={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));
    expect(leaveApi.decide).toHaveBeenCalledWith('r1', 'approve', undefined);
  });
});

describe('RequestsPage', () => {
  beforeEach(() => vi.clearAllMocks());
  it('renders rows with status, stage and a review link for the approver queue', async () => {
    leaveApi.list.mockResolvedValue({ data: [row], meta });
    renderWithProviders(<RequestsPage scope="pending" />);
    expect(await screen.findByText('Esha Rao')).toBeInTheDocument();
    expect(within(screen.getByRole('table')).getByText('Awaiting HOD')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open request/i })).toHaveAttribute('href', '/requests/r1');
    expect(leaveApi.list).toHaveBeenCalledWith(expect.objectContaining({ scope: 'pending' }));
  });
  it('shows an empty state, and an error state that can retry', async () => {
    leaveApi.list.mockResolvedValueOnce({ data: [], meta: { ...meta, total: 0 } });
    const { unmount } = renderWithProviders(<RequestsPage scope="mine" />);
    expect(await screen.findByText('No requests yet')).toBeInTheDocument();
    unmount();
    leaveApi.list.mockRejectedValueOnce(new Error('Network error')).mockResolvedValue({ data: [row], meta });
    renderWithProviders(<RequestsPage scope="team" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Network error');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Esha Rao')).toBeInTheDocument();
  });
});
