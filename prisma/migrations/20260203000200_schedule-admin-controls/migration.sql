ALTER TABLE "ScheduledPost"
ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'scheduled',
ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "cancelledBy" TEXT,
ADD COLUMN IF NOT EXISTS "adminNote" TEXT;

CREATE TABLE IF NOT EXISTS "ScheduleOverride" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "influencerId" TEXT,
    "disabled" BOOLEAN NOT NULL DEFAULT false,
    "paused" BOOLEAN NOT NULL DEFAULT false,
    "overrideDaily" INTEGER,
    "overrideMonthly" INTEGER,
    "overrideTime" TEXT,
    "overrideTimeZone" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleOverride_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ScheduleOverride_userId_influencerId_idx"
ON "ScheduleOverride"("userId", "influencerId");
