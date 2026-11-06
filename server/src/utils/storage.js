import fs from 'node:fs/promises';
import path from 'node:path';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { env } from '../config/env.js';

// Two adapters with one interface: save(key, buffer), read(key) -> Buffer, remove(key).
// Cloudflare R2 is used when its credentials are set; otherwise local disk (dev and tests).

function localAdapter() {
  const dir = path.resolve(env.UPLOAD_DIR);
  const full = (key) => path.join(dir, path.basename(key)); // basename: a key can never escape the folder
  return {
    save: async (key, buffer) => { await fs.mkdir(dir, { recursive: true }); await fs.writeFile(full(key), buffer, { flag: 'wx' }); },
    read: (key) => fs.readFile(full(key)),
    remove: (key) => fs.rm(full(key), { force: true }),
  };
}

function r2Adapter() {
  const url = new URL(env.STORAGE_BUCKET_API);
  const Bucket = url.pathname.replace(/^\/|\/$/g, '');
  const client = new S3Client({
    region: 'auto',
    endpoint: url.origin,
    credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
  });
  return {
    save: async (Key, Body) => { await client.send(new PutObjectCommand({ Bucket, Key, Body })); },
    read: async (Key) => Buffer.from(await (await client.send(new GetObjectCommand({ Bucket, Key }))).Body.transformToByteArray()),
    remove: async (Key) => { await client.send(new DeleteObjectCommand({ Bucket, Key })); },
  };
}

const useR2 = env.STORAGE_BUCKET_API && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY;
export const storage = useR2 ? r2Adapter() : localAdapter();
export const storageDriver = useR2 ? 'r2' : 'local';
