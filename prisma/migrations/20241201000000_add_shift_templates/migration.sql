-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('SATURDAY', 'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY');

-- CreateTable
CREATE TABLE "shift_templates" (
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
CREATE TABLE "shift_blocks" (
    "id" TEXT NOT NULL,
    "shiftTemplateId" TEXT NOT NULL,
    "dayOfWeek" "DayOfWeek" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shift_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shift_templates_studyMode_idx" ON "shift_templates"("studyMode");

-- CreateIndex
CREATE INDEX "shift_templates_isActive_idx" ON "shift_templates"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "shift_blocks_shiftTemplateId_dayOfWeek_key" ON "shift_blocks"("shiftTemplateId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "shift_blocks_dayOfWeek_idx" ON "shift_blocks"("dayOfWeek");

-- AddForeignKey
ALTER TABLE "shift_blocks" ADD CONSTRAINT "shift_blocks_shiftTemplateId_fkey" FOREIGN KEY ("shiftTemplateId") REFERENCES "shift_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
