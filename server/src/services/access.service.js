import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';

// Single source of truth for "who may see / act on which request". Used by lists AND single-record checks.
export const visibleWhere = (u) => ({
  EMPLOYEE: { employeeId: u.id },
  MANAGER: { OR: [{ employeeId: u.id }, { employee: { managerId: u.id } }] },
  HOD: { employee: { departmentId: u.departmentId } },
})[u.role];

// Requests currently waiting on this user (manager of the employee at MANAGER stage, department HOD at HOD stage).
export const approverWhere = (u) => ({
  OR: [
    { approvalStage: 'MANAGER', employee: { managerId: u.id } },
    { approvalStage: 'HOD', employee: { department: { hodId: u.id } } },
  ],
});

export const REQUEST_INCLUDE = {
  employee: { select: { id: true, name: true, email: true, role: true, departmentId: true, managerId: true, department: { select: { name: true, hodId: true } } } },
};

// 404 (not 403) when out of scope, so existence of other people's requests is not revealed.
export async function loadVisibleRequest(user, id, include = REQUEST_INCLUDE) {
  const request = await prisma.leaveRequest.findFirst({ where: { id, ...visibleWhere(user) }, include });
  if (!request) throw ApiError.notFound('Leave request not found');
  return request;
}

/** The user who must act at the request's current stage. */
export const approverIdFor = (request) =>
  request.approvalStage === 'MANAGER' ? request.employee.managerId
    : request.approvalStage === 'HOD' ? request.employee.department.hodId : null;

export const isApprover = (user, request) =>
  user.id !== request.employeeId && approverIdFor(request) === user.id;
