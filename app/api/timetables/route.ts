import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Shift } from '@prisma/client'

// GET - Fetch timetables with filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const semesterId = searchParams.get('semesterId')
    const departmentId = searchParams.get('departmentId')
    const classId = searchParams.get('classId')
    const studyMode = searchParams.get('studyMode') as Shift | null

    const where: any = {}
    if (semesterId) where.semesterId = semesterId
    if (departmentId) where.departmentId = departmentId
    if (classId) where.classId = classId
    if (studyMode) where.studyMode = studyMode

    const timetables = await prisma.timetable.findMany({
      where,
      include: {
        semester: {
          include: {
            academicYear: true
          }
        },
        department: true,
        class: true,
        entries: {
          include: {
            shiftTemplate: true
          },
          orderBy: [
            { dayOfWeek: 'asc' },
            { shiftTemplate: { startTime: 'asc' } }
          ]
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(timetables)
  } catch (error) {
    console.error('Error fetching timetables:', error)
    return NextResponse.json(
      { error: 'Failed to fetch timetables' },
      { status: 500 }
    )
  }
}

// POST - Create a new timetable
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { semesterId, departmentId, classId, studyMode } = body

    if (!semesterId || !departmentId || !studyMode) {
      return NextResponse.json(
        { error: 'Missing required fields: semesterId, departmentId, studyMode' },
        { status: 400 }
      )
    }

    // Check if timetable already exists
    const existing = await prisma.timetable.findUnique({
      where: {
        semesterId_departmentId_classId_studyMode: {
          semesterId,
          departmentId,
          classId: classId || null,
          studyMode
        }
      }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Timetable already exists for this combination' },
        { status: 400 }
      )
    }

    const timetable = await prisma.timetable.create({
      data: {
        semesterId,
        departmentId,
        classId: classId || null,
        studyMode
      },
      include: {
        semester: {
          include: {
            academicYear: true
          }
        },
        department: true,
        class: true,
        entries: {
          include: {
            shiftTemplate: true
          }
        }
      }
    })

    return NextResponse.json(timetable, { status: 201 })
  } catch (error: any) {
    console.error('Error creating timetable:', error)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Timetable already exists for this combination' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to create timetable' },
      { status: 500 }
    )
  }
}

// PATCH - Update a timetable
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, semesterId, departmentId, classId, studyMode } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      )
    }

    const updateData: any = {}
    if (semesterId !== undefined) updateData.semesterId = semesterId
    if (departmentId !== undefined) updateData.departmentId = departmentId
    if (classId !== undefined) updateData.classId = classId
    if (studyMode !== undefined) updateData.studyMode = studyMode

    const timetable = await prisma.timetable.update({
      where: { id },
      data: updateData,
      include: {
        semester: {
          include: {
            academicYear: true
          }
        },
        department: true,
        class: true,
        entries: {
          include: {
            shiftTemplate: true
          }
        }
      }
    })

    return NextResponse.json(timetable)
  } catch (error) {
    console.error('Error updating timetable:', error)
    return NextResponse.json(
      { error: 'Failed to update timetable' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a timetable
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required parameter: id' },
        { status: 400 }
      )
    }

    await prisma.timetable.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting timetable:', error)
    return NextResponse.json(
      { error: 'Failed to delete timetable' },
      { status: 500 }
    )
  }
}
