import crypto from 'node:crypto';
import { storage } from '../utils/storage.js';
import { ApiError } from '../utils/ApiError.js';

const SIGNATURES = [
  { mime: 'application/pdf', ext: 'pdf', test: (b) => b.subarray(0, 5).toString('latin1') === '%PDF-' },
  { mime: 'image/jpeg', ext: 'jpg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: 'image/png', ext: 'png', test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
];

// Trust the bytes, not the filename or the client-declared mime type.
export const detectType = (buffer) => SIGNATURES.find((s) => s.test(buffer));

export const documentService = {
  /** Validates and writes files to storage. Returns rows to insert plus a rollback() that deletes the files. */
  async stage(files = [], uploadedById) {
    const staged = files.map((f) => {
      const type = detectType(f.buffer);
      if (!type) throw ApiError.badRequest(`"${f.originalname}" is not a valid PDF, JPG or PNG file`);
      return { f, type, storageKey: `${crypto.randomUUID()}.${type.ext}` };
    });
    const written = [];
    try {
      for (const s of staged) { await storage.save(s.storageKey, s.f.buffer); written.push(s.storageKey); }
    } catch (e) { await Promise.all(written.map(storage.remove)); throw e; }
    return {
      rows: staged.map(({ f, type, storageKey }) => ({
        originalName: f.originalname.replace(/[^\w.\- ()]/g, '_').slice(0, 120),
        mimeType: type.mime, fileSize: f.size, storageKey, uploadedById,
      })),
      rollback: () => Promise.all(written.map(storage.remove)),
    };
  },
  read: (storageKey) => storage.read(storageKey),
};
