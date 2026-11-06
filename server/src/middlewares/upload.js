import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
const parser = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_FILE_BYTES, files: 5 } }).array('documents', 5);

// Parses multipart into req.files (buffers). Type validation happens in document.service (magic bytes).
export const uploadDocuments = (req, res, next) =>
  parser(req, res, (err) => {
    if (!err) return next();
    next(ApiError.badRequest(err.code === 'LIMIT_FILE_SIZE' ? 'Each file must be 5 MB or smaller' : err.code === 'LIMIT_UNEXPECTED_FILE' || err.code === 'LIMIT_FILE_COUNT' ? 'At most 5 files (field "documents")' : 'Invalid upload'));
  });
