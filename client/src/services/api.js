import { api } from '@/lib/api';

const form = (fields, files = []) => {
  const fd = new FormData();
  Object.entries(fields).forEach(([k, v]) => v != null && fd.append(k, v));
  files.forEach((f) => fd.append('documents', f));
  return fd;
};

export const authApi = {
  me: () => api.get('/auth/me'),
  login: (body) => api.post('/auth/login', body),
  logout: () => api.post('/auth/logout'),
};

export const leaveApi = {
  preview: (params) => api.get('/leaves/preview', { params }),
  list: (params) => api.get('/leaves', { params }),
  get: (id) => api.get(`/leaves/${id}`),
  create: ({ files, ...fields }) => api.post('/leaves', form(fields, files)),
  decide: (id, action, comment) => api.post(`/leaves/${id}/${action}`, { comment }),
  respond: (id, { comment, files }) => api.post(`/leaves/${id}/respond`, form({ comment }, files)),
  cancel: (id) => api.post(`/leaves/${id}/cancel`),
  audit: (id) => api.get(`/leaves/${id}/audit`),
  download: (id, docId) => api.get(`/leaves/${id}/documents/${docId}`, { responseType: 'blob' }),
};

export const insightsApi = {
  dashboard: (role) => api.get(`/dashboard/${role}`),
  trends: () => api.get('/analytics/leave-trends'),
  workload: () => api.get('/analytics/approval-workload'),
  calendar: (params) => api.get('/calendar/team', { params }),
  auditFeed: (params) => api.get('/audit', { params }),
  notifications: () => api.get('/notifications'),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
};
