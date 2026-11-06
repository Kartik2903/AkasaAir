export const ok = (res, data, message = 'Success', meta, status = 200) =>
  res.status(status).json({ success: true, message, data, ...(meta && { meta }) });

export const created = (res, data, message = 'Created successfully') => ok(res, data, message, undefined, 201);
