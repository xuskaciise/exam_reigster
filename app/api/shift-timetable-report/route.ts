import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { DayOfWeek } from '@prisma/client'

// GET - Fetch shift timetable report data
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const reportType = searchParams.get('reportType') || 'day-shift'
    const academicYearId = searchParams.get('academicYearId')
    const semesterId = searchParams.get('semesterId')
    const day = searchParams.get('day') as DayOfWeek | null
    const shiftTemplateId = searchParams.get('shiftTemplateId') // Optional for day-shift, required for all-days-all-classes
    const departmentId = searchParams.get('departmentId') // Optional
    const classId = searchParams.get('classId') // Optional
    const studyMode = searchParams.get('studyMode') as 'FULL_TIME' | 'PART_TIME' | null // Optional

    // Validate required parameters based on report type
    if (!academicYearId || !semesterId) {
      return NextResponse.json(
        { error: 'Missing required parameters: academicYearId, semesterId' },
        { status: 400 }
      )
    }

    if (reportType === 'all-days-all-classes') {
      if (!departmentId) {
        return NextResponse.json(
          { error: 'Missing required parameter: departmentId for All Days All Classes report' },
          { status: 400 }
        )
      }
    }
    // For day-shift report, day is optional - if null, show all days

    // Build where clause for timetable entries
    const where: any = {
      timetable: {
        semesterId: semesterId,
        semester: {
          academicYearId: academicYearId,
        },
      },
    }

    // For day-shift report, filter by day (only if day is provided)
    if (reportType === 'day-shift' && day) {
      where.dayOfWeek = day
    }
    // If day is null for day-shift, don't filter by day (show all days)

    // If shiftTemplateId is provided, filter by shift
    if (shiftTemplateId) {
      where.shiftTemplateId = shiftTemplateId
    }

    // If departmentId is provided, filter by department
    if (departmentId) {
      where.timetable.departmentId = departmentId
    }

    // If classId is provided, filter by class (only for day-shift)
    if (classId && reportType === 'day-shift') {
      where.timetable.classId = classId
    }

    // If studyMode is provided, filter by study mode
    if (studyMode) {
      where.timetable.studyMode = studyMode
    }

    // Fetch timetable entries with all necessary relations
    const entries = await prisma.timetableEntry.findMany({
      where,
      include: {
        timetable: {
          include: {
            semester: {
              include: {
                academicYear: true,
              },
            },
            department: true,
            class: true,
          },
        },
        shiftTemplate: true,
      },
      orderBy: [
        {
          dayOfWeek: 'asc',
        },
        {
          timetable: {
            class: {
              classTitle: 'asc',
            },
          },
        },
        {
          shiftTemplate: {
            startTime: 'asc',
          },
        },
      ],
    })

    // Get unique classes for summary
    const uniqueClasses = new Set(entries.map((e) => e.timetable.classId).filter(Boolean))
    const totalClasses = uniqueClasses.size

    // Calculate total hours
    let totalMinutes = 0
    entries.forEach((entry) => {
      const start = entry.shiftTemplate.startTime.split(':').map(Number)
      const end = entry.shiftTemplate.endTime.split(':').map(Number)
      const startMinutes = start[0] * 60 + start[1]
      const endMinutes = end[0] * 60 + end[1]
      totalMinutes += endMinutes - startMinutes
    })
    const totalHours = Math.floor(totalMinutes / 60)
    const remainingMinutes = totalMinutes % 60

    // Get shift template info (only if shiftTemplateId is provided)
    const shiftTemplate = shiftTemplateId
      ? await prisma.shiftTemplate.findUnique({
          where: { id: shiftTemplateId },
        })
      : null

    // Get department info (only if departmentId is provided)
    const department = departmentId
      ? await prisma.department.findUnique({
          where: { id: departmentId },
        })
      : null

    // Get semester info
    const semester = await prisma.semester.findUnique({
      where: { id: semesterId },
      include: {
        academicYear: true,
      },
    })

    return NextResponse.json({
      entries,
      summary: {
        totalClasses,
        totalLectures: entries.length,
        totalHours,
        totalMinutes: remainingMinutes,
      },
      shiftTemplate,
      department,
      semester,
      day: day || null,
      reportType,
      shiftTemplateId: shiftTemplateId || null,
      departmentId: departmentId || null,
      classId: classId || null,
      studyMode: studyMode || null,
    })
  } catch (error) {
    console.error('Error fetching shift timetable report:', error)
    return NextResponse.json(
      { error: 'Failed to fetch shift timetable report' },
      { status: 500 }
    )
  }
}
