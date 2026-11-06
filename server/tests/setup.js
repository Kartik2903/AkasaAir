// Tests run against a dedicated database, never the dev one.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5433/leaveflow_test?schema=public';
process.env.UPLOAD_DIR = 'uploads-test';
delete process.env.STORAGE_BUCKET_API; delete process.env.R2_ACCESS_KEY_ID; delete process.env.R2_SECRET_ACCESS_KEY; // tests always use local disk
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-test-secret';
