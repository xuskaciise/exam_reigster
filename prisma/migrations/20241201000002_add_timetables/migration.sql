-- CreateEnum
CREATE TYPE "TimetableEntryType" AS ENUM ('LECTURE', 'LABORATORY', 'TUTORIAL');

-- CreateTable
CREATE TABLE "timetables" (
    "id" TEXT NOT NULL,
    "semesterId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "classId" TEXT,
    "studyMode" "Shift" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "timetables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timetable_entries" (
    "id" TEXT NOT NULL,
    "timetableId" TEXT NOT NULL,
    "dayOfWeek" "DayOfWeek" NOT NULL,
    "shiftTemplateId" TEXT NOT NULL,
    "courseName" TEXT NOT NULL,
    "lecturerName" TEXT NOT NULL,
    "room" TEXT,
    "entryType" "TimetableEntryType" NOT NULL DEFAULT 'LECTURE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "timetable_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "timetables_semesterId_departmentId_classId_studyMode_key" ON "timetables"("semesterId", "departmentId", "classId", "studyMode");

-- CreateIndex
CREATE INDEX "timetables_semesterId_idx" ON "timetables"("semesterId");

-- CreateIndex
CREATE INDEX "timetables_departmentId_idx" ON "timetables"("departmentId");

-- CreateIndex
CREATE INDEX "timetables_classId_idx" ON "timetables"("classId");

-- CreateIndex
CREATE INDEX "timetables_studyMode_idx" ON "timetables"("studyMode");

-- CreateIndex
CREATE INDEX "timetable_entries_timetableId_idx" ON "timetable_entries"("timetableId");

-- CreateIndex
CREATE INDEX "timetable_entries_dayOfWeek_idx" ON "timetable_entries"("dayOfWeek");

-- CreateIndex
CREATE INDEX "timetable_entries_shiftTemplateId_idx" ON "timetable_entries"("shiftTemplateId");

-- AddForeignKey
ALTER TABLE "timetables" ADD CONSTRAINT "timetables_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "semesters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetables" ADD CONSTRAINT "timetables_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetables" ADD CONSTRAINT "timetables_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_entries" ADD CONSTRAINT "timetable_entries_timetableId_fkey" FOREIGN KEY ("timetableId") REFERENCES "timetables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_entries" ADD CONSTRAINT "timetable_entries_shiftTemplateId_fkey" FOREIGN KEY ("shiftTemplateId") REFERENCES "shift_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
