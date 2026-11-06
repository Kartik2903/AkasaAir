import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { leaveApi, insightsApi } from '@/services/api';

export const useLeaves = (params) => useQuery({ queryKey: ['leaves', params], queryFn: () => leaveApi.list(params), placeholderData: keepPreviousData });
export const useLeave = (id) => useQuery({ queryKey: ['leave', id], queryFn: () => leaveApi.get(id).then((r) => r.data) });
export const useLeaveAudit = (id) => useQuery({ queryKey: ['leave-audit', id], queryFn: () => leaveApi.audit(id).then((r) => r.data) });
export const usePreview = (from, to) =>
  useQuery({ queryKey: ['preview', from, to], queryFn: () => leaveApi.preview({ fromDate: from, toDate: to }).then((r) => r.data), enabled: !!(from && to), placeholderData: keepPreviousData });

export const useDashboard = (role) => useQuery({ queryKey: ['dashboard', role], queryFn: () => insightsApi.dashboard(role).then((r) => r.data) });
export const useTrends = () => useQuery({ queryKey: ['analytics', 'trends'], queryFn: () => insightsApi.trends().then((r) => r.data) });
export const useWorkload = (enabled) => useQuery({ queryKey: ['analytics', 'workload'], queryFn: () => insightsApi.workload().then((r) => r.data), enabled });

// Everything a workflow change can affect is refreshed together.
const REFRESH = ['leaves', 'leave', 'leave-audit', 'dashboard', 'analytics', 'notifications', 'calendar', 'audit'];
export function useLeaveMutation(fn, success) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => { toast.success(success); REFRESH.forEach((k) => qc.invalidateQueries({ queryKey: [k] })); },
    onError: (e) => toast.error(e.message),
  });
}
export const useCreateLeave = () => useLeaveMutation((v) => leaveApi.create(v), 'Leave request submitted');
export const useDecision = (id) => useLeaveMutation(({ action, comment }) => leaveApi.decide(id, action, comment), 'Decision recorded');
export const useRespond = (id) => useLeaveMutation((v) => leaveApi.respond(id, v), 'Response sent');
export const useCancel = (id) => useLeaveMutation(() => leaveApi.cancel(id), 'Request cancelled');
