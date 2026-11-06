// Express 5 forwards rejected promises already; this keeps handlers explicit and Express-4 safe.
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
