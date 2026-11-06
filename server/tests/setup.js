// Tests run against a dedicated database, never the dev one.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5433/leaveflow_test?schema=public';
process.env.UPLOAD_DIR = 'uploads-test';
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-test-secret';
