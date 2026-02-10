-- ============================================
-- Create Shift Templates Tables
-- ============================================

-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('SATURDAY', 'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY');

-- CreateTable
CREATE TABLE IF NOT EXISTS "shift_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "studyMode" "Shift" NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "isBreak" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shift_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "shift_blocks" (
    "id" TEXT NOT NULL,
    "shiftTemplateId" TEXT NOT NULL,
    "dayOfWeek" "DayOfWeek" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shift_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "shift_templates_studyMode_idx" ON "shift_templates"("studyMode");
CREATE INDEX IF NOT EXISTS "shift_templates_isActive_idx" ON "shift_templates"("isActive");
CREATE UNIQUE INDEX IF NOT EXISTS "shift_blocks_shiftTemplateId_dayOfWeek_key" ON "shift_blocks"("shiftTemplateId", "dayOfWeek");
CREATE INDEX IF NOT EXISTS "shift_blocks_dayOfWeek_idx" ON "shift_blocks"("dayOfWeek");

-- AddForeignKey
ALTER TABLE "shift_blocks" DROP CONSTRAINT IF EXISTS "shift_blocks_shiftTemplateId_fkey";
ALTER TABLE "shift_blocks" ADD CONSTRAINT "shift_blocks_shiftTemplateId_fkey" FOREIGN KEY ("shiftTemplateId") REFERENCES "shift_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- Create Academic Years and Semesters Tables
-- ============================================

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "SemesterType" AS ENUM ('ODD', 'EVEN', 'SUMMER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "SemesterStatus" AS ENUM ('UPCOMING', 'IN_PROGRESS', 'COMPLETED', 'INACTIVE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "academic_years" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academic_years_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "semesters" (
    "id" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "semesterType" "SemesterType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "SemesterStatus" NOT NULL DEFAULT 'UPCOMING',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "semesters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "academic_years_name_key" ON "academic_years"("name");
CREATE INDEX IF NOT EXISTS "academic_years_isActive_idx" ON "academic_years"("isActive");
CREATE INDEX IF NOT EXISTS "semesters_academicYearId_idx" ON "semesters"("academicYearId");
CREATE INDEX IF NOT EXISTS "semesters_status_idx" ON "semesters"("status");

-- AddForeignKey
ALTER TABLE "semesters" DROP CONSTRAINT IF EXISTS "semesters_academicYearId_fkey";
ALTER TABLE "semesters" ADD CONSTRAINT "semesters_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;
