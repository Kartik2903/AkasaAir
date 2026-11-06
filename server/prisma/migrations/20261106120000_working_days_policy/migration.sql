-- Weekends no longer count as leave days.
ALTER TABLE "LeavePolicy" ALTER COLUMN "dayCountingMethod" SET DEFAULT 'WORKING_DAYS';
UPDATE "LeavePolicy" SET "dayCountingMethod" = 'WORKING_DAYS' WHERE "dayCountingMethod" = 'CALENDAR';
