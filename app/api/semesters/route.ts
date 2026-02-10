import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Fetch semesters (optionally filtered by academicYearId)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const academicYearId = searchParams.get('academicYearId')

    const where: any = {}
    if (academicYearId) {
      where.academicYearId = academicYearId
    }

    const semesters = await prisma.semester.findMany({
      where,
      include: {
        academicYear: true
      },
      orderBy: {
        startDate: 'asc'
      }
    })

    return NextResponse.json(semesters)
  } catch (error) {
    console.error('Error fetching semesters:', error)
    return NextResponse.json(
      { error: 'Failed to fetch semesters' },
      { status: 500 }
    )
  }
}

// POST - Create a new semester
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { academicYearId, name, semesterType, startDate, endDate, status, description } = body

    if (!academicYearId || !name || !semesterType || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required fields: academicYearId, name, semesterType, startDate, endDate' },
        { status: 400 }
      )
    }

    // Verify academic year exists
    const academicYear = await prisma.academicYear.findUnique({
      where: { id: academicYearId }
    })

    if (!academicYear) {
      return NextResponse.json(
        { error: 'Academic year not found' },
        { status: 404 }
      )
    }

    const semester = await prisma.semester.create({
      data: {
        academicYearId,
        name,
        semesterType,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: status || 'UPCOMING',
        description: description || null
      },
      include: {
        academicYear: true
      }
    })

    return NextResponse.json(semester, { status: 201 })
  } catch (error) {
    console.error('Error creating semester:', error)
    return NextResponse.json(
      { error: 'Failed to create semester' },
      { status: 500 }
    )
  }
}

// PATCH - Update a semester
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, semesterType, startDate, endDate, status, description } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      )
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (semesterType !== undefined) updateData.semesterType = semesterType
    if (startDate !== undefined) updateData.startDate = new Date(startDate)
    if (endDate !== undefined) updateData.endDate = new Date(endDate)
    if (status !== undefined) updateData.status = status
    if (description !== undefined) updateData.description = description

    const semester = await prisma.semester.update({
      where: { id },
      data: updateData,
      include: {
        academicYear: true
      }
    })

    return NextResponse.json(semester)
  } catch (error) {
    console.error('Error updating semester:', error)
    return NextResponse.json(
      { error: 'Failed to update semester' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a semester
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

    // Check if semester has timetables (we'll add this check later)
    // For now, just delete

    await prisma.semester.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting semester:', error)
    return NextResponse.json(
      { error: 'Failed to delete semester' },
      { status: 500 }
    )
  }
}
