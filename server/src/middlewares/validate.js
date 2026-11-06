import { ApiError } from '../utils/ApiError.js';

// validate({ body, query, params }) with zod schemas. Parsed values replace the raw ones.
export const validate = (schemas) => (req, _res, next) => {
  const errors = [];
  for (const key of ['params', 'query', 'body']) {
    if (!schemas[key]) continue;
    const r = schemas[key].safeParse(req[key]);
    if (r.success) {
      if (key === 'query') req.validatedQuery = r.data; // req.query is read-only in Express 5
      else req[key] = r.data;
    } else {
      errors.push(...r.error.issues.map((i) => ({ field: `${key}.${i.path.join('.')}`.replace(/\.$/, ''), message: i.message })));
    }
  }
  next(errors.length ? ApiError.badRequest('Validation failed', errors) : undefined);
};
