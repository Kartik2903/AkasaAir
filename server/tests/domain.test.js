import { describe, it, expect } from 'vitest';
import { countDays, parseDate } from '../src/domain/leaveDuration.js';
import { planLeave, transition } from '../src/domain/leaveWorkflow.js';

const policy = { longLeaveThreshold: 3, documentRequired: true };
const days = (a, b) => countDays(parseDate(a), parseDate(b));

describe('leave duration (inclusive calendar days)', () => {
  it('counts 1, 3 and 4 days', () => {
    expect(days('2030-11-10', '2030-11-10')).toBe(1);
    expect(days('2030-11-10', '2030-11-12')).toBe(3);
    expect(days('2030-11-10', '2030-11-13')).toBe(4);
  });
  it('is safe across month, year and DST boundaries', () => {
    expect(days('2030-12-30', '2031-01-02')).toBe(4);
    expect(days('2030-03-30', '2030-04-02')).toBe(4);
  });
  it('rejects impossible dates', () => {
    expect(parseDate('2030-02-30')).toBeNull();
    expect(parseDate('10/11/2030')).toBeNull();
  });
});

describe('planLeave', () => {
  it('3 days: manager only, no document', () => {
    expect(planLeave({ days: 3, policy })).toMatchObject({ requiresHodApproval: false, requiresDocument: false, stages: ['MANAGER'] });
  });
  it('4 days: document + manager and HOD', () => {
    expect(planLeave({ days: 4, policy })).toMatchObject({ requiresHodApproval: true, requiresDocument: true, stages: ['MANAGER', 'HOD'] });
  });
  it('single stage when the approver already is the HOD', () => {
    expect(planLeave({ days: 5, policy, approverIsHod: true }).requiresHodApproval).toBe(false);
  });
});

describe('transition()', () => {
  const r = (status, approvalStage, requiresHodApproval = true) => ({ status, approvalStage, requiresHodApproval });
  it('manager approve: long -> PENDING_HOD, short -> APPROVED', () => {
    expect(transition(r('PENDING_MANAGER', 'MANAGER'), 'approve')).toEqual({ status: 'PENDING_HOD', approvalStage: 'HOD' });
    expect(transition(r('PENDING_MANAGER', 'MANAGER', false), 'approve')).toEqual({ status: 'APPROVED', approvalStage: 'NONE' });
  });
  it('HOD approve / reject finish the request', () => {
    expect(transition(r('PENDING_HOD', 'HOD'), 'approve').status).toBe('APPROVED');
    expect(transition(r('PENDING_HOD', 'HOD'), 'reject').status).toBe('REJECTED');
  });
  it('request-info preserves the stage and respond resumes it', () => {
    const info = transition(r('PENDING_HOD', 'HOD'), 'request-info');
    expect(info).toEqual({ status: 'NEEDS_INFO', approvalStage: 'HOD' });
    expect(transition(r('NEEDS_INFO', 'HOD'), 'respond')).toEqual({ status: 'PENDING_HOD', approvalStage: 'HOD' });
    expect(transition(r('NEEDS_INFO', 'MANAGER'), 'respond')).toEqual({ status: 'PENDING_MANAGER', approvalStage: 'MANAGER' });
  });
  it('rejects every transition out of a final state or invalid combination', () => {
    for (const s of ['APPROVED', 'REJECTED', 'CANCELLED'])
      for (const a of ['approve', 'reject', 'request-info', 'respond', 'cancel']) expect(() => transition(r(s, 'NONE'), a)).toThrow();
    expect(() => transition(r('NEEDS_INFO', 'HOD'), 'approve')).toThrow(/NEEDS_INFO/);
    expect(() => transition(r('PENDING_HOD', 'HOD'), 'respond')).toThrow();
  });
});
