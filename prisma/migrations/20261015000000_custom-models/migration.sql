-- Own-face custom models (reference-set training) and their photos.
CREATE TABLE IF NOT EXISTS "CustomModel" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "photoCount" INTEGER NOT NULL DEFAULT 0,
    "referencePhotoId" TEXT,
    "consentAt" TIMESTAMP(3),
    "error" TEXT,
    "trainedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomModel_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CustomModel_userId_key" ON "CustomModel"("userId");

CREATE TABLE IF NOT EXISTS "CustomModelPhoto" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "sharpness" DOUBLE PRECISION NOT NULL,
    "brightness" DOUBLE PRECISION NOT NULL,
    "hash" TEXT NOT NULL,
    "faces" INTEGER,
    "score" DOUBLE PRECISION NOT NULL,
    "warnings" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomModelPhoto_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CustomModelPhoto_modelId_hash_key" ON "CustomModelPhoto"("modelId", "hash");
CREATE INDEX IF NOT EXISTS "CustomModelPhoto_modelId_idx" ON "CustomModelPhoto"("modelId");

ALTER TABLE "CustomModel"
ADD CONSTRAINT "CustomModel_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CustomModelPhoto"
ADD CONSTRAINT "CustomModelPhoto_modelId_fkey"
FOREIGN KEY ("modelId") REFERENCES "CustomModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
