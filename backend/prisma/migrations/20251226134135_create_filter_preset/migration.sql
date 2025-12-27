-- CreateTable
CREATE TABLE "FilterPreset" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "satelliteFilter" TEXT NOT NULL,
    "passEventFilter" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FilterPreset_pkey" PRIMARY KEY ("id")
);
