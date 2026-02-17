import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { DayOfWeek } from '@prisma/client'

// GET - Fetch shift timetable report data
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const academicYearId = searchParams.get('academicYearId')
    const semesterId = searchParams.get('semesterId')
    const day = searchParams.get('day') as DayOfWeek | null
    const shiftTemplateId = searchParams.get('shiftTemplateId')
    const classId = searchParams.get('classId') // Optional

    // Validate required parameters
    if (!academicYearId || !semesterId || !day || !shiftTemplateId) {
      return NextResponse.json(
        { error: 'Missing required parameters: academicYearId, semesterId, day, shiftTemplateId' },
        { status: 400 }
      )
    }

    // Build where clause for timetable entries
    const where: any = {
      dayOfWeek: day,
      shiftTemplateId: shiftTemplateId,
      timetable: {
        semesterId: semesterId,
        semester: {
          academicYearId: academicYearId,
        },
      },
    }

    // If classId is provided, filter by class
    if (classId) {
      where.timetable.classId = classId
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

    // Get shift template info
    const shiftTemplate = await prisma.shiftTemplate.findUnique({
      where: { id: shiftTemplateId },
    })

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
      semester,
      day,
      classId: classId || null,
    })
  } catch (error) {
    console.error('Error fetching shift timetable report:', error)
    return NextResponse.json(
      { error: 'Failed to fetch shift timetable report' },
      { status: 500 }
    )
  }
}
