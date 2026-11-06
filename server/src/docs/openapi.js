// Hand-maintained OpenAPI 3 spec, served at /api/docs. Update it whenever a route changes.
const err = { description: 'Error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } };
const ok = (d = 'OK') => ({ description: d, content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } });
const id = { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } };
const q = (name, schema = { type: 'string' }) => ({ name, in: 'query', schema });
const json = (props, required = []) => ({ required: true, content: { 'application/json': { schema: { type: 'object', required, properties: props } } } });
const comment = json({ comment: { type: 'string', minLength: 5 } }, ['comment']);
const secured = [{ cookieAuth: [] }];
const std = { 400: err, 401: err, 403: err, 404: err, 409: err };

export const openapi = {
  openapi: '3.0.3',
  info: { title: 'LeaveFlow API', version: '1.0.0', description: 'All routes except /auth/login and /auth/logout need a session cookie. Roles: EMPLOYEE, MANAGER, HOD. Out-of-scope records return 404.' },
  servers: [{ url: '/api' }],
  components: {
    securitySchemes: { cookieAuth: { type: 'apiKey', in: 'cookie', name: 'token' } },
    schemas: {
      Success: { type: 'object', properties: { success: { type: 'boolean', example: true }, message: { type: 'string' }, data: {}, meta: { type: 'object' } } },
      Error: { type: 'object', properties: { success: { type: 'boolean', example: false }, message: { type: 'string' }, errors: { type: 'array', items: { type: 'object', properties: { field: { type: 'string' }, message: { type: 'string' } } } } } },
    },
  },
  paths: {
    '/auth/login': { post: { tags: ['Auth'], summary: 'Login (sets HttpOnly cookie; rate limited)', requestBody: json({ email: { type: 'string' }, password: { type: 'string' } }, ['email', 'password']), responses: { 200: ok(), 401: err, 429: err } } },
    '/auth/logout': { post: { tags: ['Auth'], summary: 'Clear session cookie', responses: { 200: ok() } } },
    '/auth/me': { get: { tags: ['Auth'], security: secured, summary: 'Current user profile', responses: { 200: ok(), 401: err } } },
    '/leaves/preview': { get: { tags: ['Leaves'], security: secured, summary: 'Smart validation preview: days, approvals, document need, overlap', parameters: [q('fromDate'), q('toDate')], responses: { 200: ok() } } },
    '/leaves': {
      get: { tags: ['Leaves'], security: secured, summary: 'List requests. scope=mine|pending|team (pending/team need MANAGER/HOD)', parameters: [q('scope'), q('search'), q('status'), q('stage'), q('from'), q('to'), q('sortBy'), q('sortOrder'), q('page', { type: 'integer' }), q('limit', { type: 'integer' })], responses: { 200: ok('Items + meta{total,page,limit,totalPages}'), 403: err } },
      post: { tags: ['Leaves'], security: secured, summary: 'Submit (multipart: fromDate, toDate, reason, documents[]). Document mandatory when days > policy threshold', requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', properties: { fromDate: { type: 'string', example: '2030-01-10' }, toDate: { type: 'string' }, reason: { type: 'string' }, documents: { type: 'array', items: { type: 'string', format: 'binary' } } } } } } }, responses: { 201: ok(), ...std } },
    },
    '/leaves/{id}': { get: { tags: ['Leaves'], security: secured, summary: 'Detail with timeline, stages, documents and server-computed permissions', parameters: [id], responses: { 200: ok(), 404: err } } },
    '/leaves/{id}/documents': { post: { tags: ['Leaves'], security: secured, summary: 'Add documents (owner, open requests). PDF/JPG/PNG, 5 MB, verified by file signature', parameters: [id], responses: { 201: ok(), ...std } } },
    '/leaves/{id}/documents/{docId}': { get: { tags: ['Leaves'], security: secured, summary: 'Download a document (same visibility rules as the request)', parameters: [id, { name: 'docId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { 200: { description: 'file' }, 404: err } } },
    '/leaves/{id}/respond': { post: { tags: ['Workflow'], security: secured, summary: 'Employee answers an information request; resumes the same stage (multipart: comment, documents[])', parameters: [id], responses: { 200: ok(), ...std } } },
    '/leaves/{id}/cancel': { post: { tags: ['Workflow'], security: secured, summary: 'Owner cancels an open request', parameters: [id], responses: { 200: ok(), ...std } } },
    '/leaves/{id}/approve': { post: { tags: ['Workflow'], security: secured, summary: 'Approver approves (manager stage may advance to HOD; otherwise APPROVED)', parameters: [id], requestBody: json({ comment: { type: 'string' } }), responses: { 200: ok(), ...std } } },
    '/leaves/{id}/reject': { post: { tags: ['Workflow'], security: secured, summary: 'Approver rejects; comment required', parameters: [id], requestBody: comment, responses: { 200: ok(), ...std } } },
    '/leaves/{id}/request-info': { post: { tags: ['Workflow'], security: secured, summary: 'Approver asks for more information; status NEEDS_INFO, stage preserved', parameters: [id], requestBody: comment, responses: { 200: ok(), ...std } } },
    '/leaves/{id}/audit': { get: { tags: ['Audit'], security: secured, summary: 'Chronological audit trail of one request', parameters: [id], responses: { 200: ok(), 404: err } } },
    '/audit': { get: { tags: ['Audit'], security: secured, summary: 'Audit feed across visible requests (MANAGER/HOD)', parameters: [q('page', { type: 'integer' }), q('limit', { type: 'integer' })], responses: { 200: ok(), 403: err } } },
    '/dashboard/employee': { get: { tags: ['Dashboards'], security: secured, summary: 'Employee dashboard', responses: { 200: ok() } } },
    '/dashboard/manager': { get: { tags: ['Dashboards'], security: secured, summary: 'Manager dashboard', responses: { 200: ok(), 403: err } } },
    '/dashboard/hod': { get: { tags: ['Dashboards'], security: secured, summary: 'HOD dashboard', responses: { 200: ok(), 403: err } } },
    '/analytics/leave-trends': { get: { tags: ['Analytics'], security: secured, summary: 'Monthly trend, status distribution, days per employee (scoped to role)', responses: { 200: ok() } } },
    '/analytics/approval-workload': { get: { tags: ['Analytics'], security: secured, summary: 'Approver workload by month', responses: { 200: ok(), 403: err } } },
    '/calendar/team': { get: { tags: ['Calendar'], security: secured, summary: 'Leave entries for the month (no reasons/documents)', parameters: [q('month'), q('employeeId')], responses: { 200: ok() } } },
    '/notifications': { get: { tags: ['Notifications'], security: secured, summary: 'My notifications; meta.unread = unread count', responses: { 200: ok() } } },
    '/notifications/read-all': { patch: { tags: ['Notifications'], security: secured, summary: 'Mark all read', responses: { 200: ok() } } },
    '/notifications/{id}/read': { patch: { tags: ['Notifications'], security: secured, summary: 'Mark one read', parameters: [id], responses: { 200: ok(), 404: err } } },
  },
};
