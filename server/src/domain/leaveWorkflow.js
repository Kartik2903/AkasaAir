import { ApiError } from '../utils/ApiError.js';

export const FINAL_STATUSES = ['APPROVED', 'REJECTED', 'CANCELLED'];
export const OPEN_STATUSES = ['PENDING_MANAGER', 'PENDING_HOD', 'NEEDS_INFO'];
export const ACTIVE_STATUSES = [...OPEN_STATUSES, 'APPROVED']; // statuses that block overlapping requests

/** What a request of `days` needs, driven only by policy. approverIsHod: the reporting manager is the HOD (single stage). */
export function planLeave({ days, policy, approverIsHod = false }) {
  const long = days > policy.longLeaveThreshold;
  const requiresHodApproval = long && !approverIsHod;
  return {
    days,
    requiresDocument: long && policy.documentRequired,
    requiresHodApproval,
    stages: requiresHodApproval ? ['MANAGER', 'HOD'] : ['MANAGER'],
  };
}

/** Pure state machine. Returns the next { status, approvalStage } or throws 409. */
export function transition(request, action) {
  const { status, approvalStage: stage, requiresHodApproval } = request;
  const pending = status === 'PENDING_MANAGER' || status === 'PENDING_HOD';
  const invalid = () => { throw ApiError.conflict(`Cannot ${action} a request that is ${status}`); };

  switch (action) {
    case 'approve':
      if (!pending) invalid();
      return stage === 'MANAGER' && requiresHodApproval
        ? { status: 'PENDING_HOD', approvalStage: 'HOD' }
        : { status: 'APPROVED', approvalStage: 'NONE' };
    case 'reject':
      if (!pending) invalid();
      return { status: 'REJECTED', approvalStage: 'NONE' };
    case 'request-info':
      if (!pending) invalid();
      return { status: 'NEEDS_INFO', approvalStage: stage }; // stage preserved
    case 'respond':
      if (status !== 'NEEDS_INFO') invalid();
      return { status: stage === 'HOD' ? 'PENDING_HOD' : 'PENDING_MANAGER', approvalStage: stage }; // resume same stage
    case 'cancel':
      if (!pending && status !== 'NEEDS_INFO') invalid();
      return { status: 'CANCELLED', approvalStage: 'NONE' };
    default:
      throw ApiError.badRequest(`Unknown action: ${action}`);
  }
}
