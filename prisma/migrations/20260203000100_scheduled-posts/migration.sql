CREATE TABLE IF NOT EXISTS "ScheduledPost" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "influencerId" TEXT NOT NULL,
    "imageSrc" TEXT NOT NULL,
    "scheduleDate" TIMESTAMP(3) NOT NULL,
    "time" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduledPost_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ScheduledPost_userId_influencerId_scheduleDate_idx"
ON "ScheduledPost"("userId", "influencerId", "scheduleDate");

CREATE UNIQUE INDEX IF NOT EXISTS "ScheduledPost_userId_influencerId_imageSrc_key"
ON "ScheduledPost"("userId", "influencerId", "imageSrc");

CREATE UNIQUE INDEX IF NOT EXISTS "ScheduledPost_userId_influencerId_scheduleDate_time_key"
ON "ScheduledPost"("userId", "influencerId", "scheduleDate", "time");

ALTER TABLE "ScheduledPost"
ADD CONSTRAINT "ScheduledPost_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
