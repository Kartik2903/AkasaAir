import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.js';

// Local-disk storage adapter. To deploy on an ephemeral host, reimplement these three functions with S3.
const dir = path.resolve(env.UPLOAD_DIR);
const full = (key) => path.join(dir, path.basename(key)); // basename: a key can never escape the folder

export const storage = {
  save: async (key, buffer) => { await fs.mkdir(dir, { recursive: true }); await fs.writeFile(full(key), buffer, { flag: 'wx' }); },
  read: (key) => fs.readFile(full(key)),
  remove: (key) => fs.rm(full(key), { force: true }),
};
