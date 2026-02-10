import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Fetch lecturers (optionally filtered by departmentId or search query)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const departmentId = searchParams.get('departmentId')
    const search = searchParams.get('search')

    const where: any = {}
    if (departmentId) {
      where.departmentId = departmentId
    }
    if (search) {
      where.fullName = { contains: search, mode: 'insensitive' }
    }

    const lecturers = await prisma.lecturer.findMany({
      where,
      include: {
        department: true
      },
      orderBy: [
        { fullName: 'asc' }
      ]
    })

    return NextResponse.json(lecturers)
  } catch (error) {
    console.error('Error fetching lecturers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch lecturers' },
      { status: 500 }
    )
  }
}

// POST - Create a new lecturer
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fullName, email, phone, departmentId } = body

    if (!fullName) {
      return NextResponse.json(
        { error: 'Missing required field: fullName' },
        { status: 400 }
      )
    }

    const lecturer = await prisma.lecturer.create({
      data: {
        fullName,
        email: email || null,
        phone: phone || null,
        departmentId: departmentId || null
      },
      include: {
        department: true
      }
    })

    return NextResponse.json(lecturer, { status: 201 })
  } catch (error: any) {
    console.error('Error creating lecturer:', error)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Lecturer with this email already exists' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to create lecturer' },
      { status: 500 }
    )
  }
}

// PATCH - Update a lecturer
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, fullName, email, phone, departmentId } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      )
    }

    const updateData: any = {}
    if (fullName !== undefined) updateData.fullName = fullName
    if (email !== undefined) updateData.email = email
    if (phone !== undefined) updateData.phone = phone
    if (departmentId !== undefined) updateData.departmentId = departmentId

    const lecturer = await prisma.lecturer.update({
      where: { id },
      data: updateData,
      include: {
        department: true
      }
    })

    return NextResponse.json(lecturer)
  } catch (error: any) {
    console.error('Error updating lecturer:', error)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Lecturer with this email already exists' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to update lecturer' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a lecturer
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

    await prisma.lecturer.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting lecturer:', error)
    return NextResponse.json(
      { error: 'Failed to delete lecturer' },
      { status: 500 }
    )
  }
}
