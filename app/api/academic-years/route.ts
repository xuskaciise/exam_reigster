import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Fetch all academic years
export async function GET(request: NextRequest) {
  try {
    const academicYears = await prisma.academicYear.findMany({
      include: {
        semesters: {
          orderBy: {
            startDate: 'asc'
          }
        }
      },
      orderBy: {
        startDate: 'desc'
      }
    })

    return NextResponse.json(academicYears)
  } catch (error) {
    console.error('Error fetching academic years:', error)
    return NextResponse.json(
      { error: 'Failed to fetch academic years' },
      { status: 500 }
    )
  }
}

// POST - Create a new academic year
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, startDate, endDate, isActive } = body

    if (!name || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required fields: name, startDate, endDate' },
        { status: 400 }
      )
    }

    // If setting as active, deactivate all other academic years
    if (isActive) {
      await prisma.academicYear.updateMany({
        where: { isActive: true },
        data: { isActive: false }
      })
    }

    const academicYear = await prisma.academicYear.create({
      data: {
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isActive: isActive || false
      },
      include: {
        semesters: true
      }
    })

    return NextResponse.json(academicYear, { status: 201 })
  } catch (error: any) {
    console.error('Error creating academic year:', error)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Academic year with this name already exists' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to create academic year' },
      { status: 500 }
    )
  }
}

// PATCH - Update an academic year
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, startDate, endDate, isActive } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      )
    }

    // If setting as active, deactivate all other academic years
    if (isActive) {
      await prisma.academicYear.updateMany({
        where: {
          isActive: true,
          id: { not: id }
        },
        data: { isActive: false }
      })
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (startDate !== undefined) updateData.startDate = new Date(startDate)
    if (endDate !== undefined) updateData.endDate = new Date(endDate)
    if (isActive !== undefined) updateData.isActive = isActive

    const academicYear = await prisma.academicYear.update({
      where: { id },
      data: updateData,
      include: {
        semesters: {
          orderBy: {
            startDate: 'asc'
          }
        }
      }
    })

    return NextResponse.json(academicYear)
  } catch (error: any) {
    console.error('Error updating academic year:', error)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Academic year with this name already exists' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to update academic year' },
      { status: 500 }
    )
  }
}

// DELETE - Delete an academic year
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

    // Check if academic year has semesters
    const academicYear = await prisma.academicYear.findUnique({
      where: { id },
      include: { semesters: true }
    })

    if (academicYear && academicYear.semesters.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete academic year with existing semesters. Delete semesters first.' },
        { status: 400 }
      )
    }

    await prisma.academicYear.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting academic year:', error)
    return NextResponse.json(
      { error: 'Failed to delete academic year' },
      { status: 500 }
    )
  }
}
