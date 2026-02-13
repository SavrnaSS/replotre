-- Set default credits to zero for new users
ALTER TABLE "User" ALTER COLUMN "credits" SET DEFAULT 0;
