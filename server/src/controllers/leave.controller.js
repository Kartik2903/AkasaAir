import { leaveService } from '../services/leave.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok, created } from '../utils/response.js';

const decision = (action, message) => asyncHandler(async (req, res) =>
  ok(res, await leaveService.decide(req.user, req.params.id, action, req.body.comment), message));

export const leaveController = {
  preview: asyncHandler(async (req, res) => ok(res, await leaveService.preview(req.user, req.validatedQuery), 'Preview')),
  create: asyncHandler(async (req, res) => created(res, await leaveService.create(req.user, req.body, req.files), 'Leave request submitted')),
  list: asyncHandler(async (req, res) => {
    const { items, meta } = await leaveService.list(req.user, req.validatedQuery);
    ok(res, items, 'Leave requests retrieved successfully', meta);
  }),
  get: asyncHandler(async (req, res) => ok(res, await leaveService.get(req.user, req.params.id), 'Leave request retrieved successfully')),
  approve: decision('approve', 'Request approved'),
  reject: decision('reject', 'Request rejected'),
  requestInfo: decision('request-info', 'Information requested'),
  respond: asyncHandler(async (req, res) => ok(res, await leaveService.respond(req.user, req.params.id, req.body, req.files), 'Response submitted')),
  cancel: asyncHandler(async (req, res) => ok(res, await leaveService.cancel(req.user, req.params.id), 'Request cancelled')),
  addDocuments: asyncHandler(async (req, res) => created(res, await leaveService.addDocuments(req.user, req.params.id, req.files), 'Documents uploaded')),
  audit: asyncHandler(async (req, res) => ok(res, await leaveService.audit(req.user, req.params.id), 'Audit history retrieved successfully')),
  download: asyncHandler(async (req, res) => {
    const { doc, buffer } = await leaveService.getDocument(req.user, req.params.id, req.params.docId);
    res.set({
      'Content-Type': doc.mimeType,
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(doc.originalName)}`,
      'Cache-Control': 'private, no-store',
    }).send(buffer);
  }),
};
