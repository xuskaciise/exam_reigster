import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Fetch courses (optionally filtered by departmentId or search query)
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
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } }
      ]
    }

    const courses = await prisma.course.findMany({
      where,
      include: {
        department: true
      },
      orderBy: [
        { code: 'asc' }
      ]
    })

    return NextResponse.json(courses)
  } catch (error) {
    console.error('Error fetching courses:', error)
    return NextResponse.json(
      { error: 'Failed to fetch courses' },
      { status: 500 }
    )
  }
}

// POST - Create a new course
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, title, departmentId } = body

    if (!code || !title) {
      return NextResponse.json(
        { error: 'Missing required fields: code, title' },
        { status: 400 }
      )
    }

    const course = await prisma.course.create({
      data: {
        code,
        title,
        departmentId: departmentId || null
      },
      include: {
        department: true
      }
    })

    return NextResponse.json(course, { status: 201 })
  } catch (error: any) {
    console.error('Error creating course:', error)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Course with this code already exists' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to create course' },
      { status: 500 }
    )
  }
}

// PATCH - Update a course
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, code, title, departmentId } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      )
    }

    const updateData: any = {}
    if (code !== undefined) updateData.code = code
    if (title !== undefined) updateData.title = title
    if (departmentId !== undefined) updateData.departmentId = departmentId

    const course = await prisma.course.update({
      where: { id },
      data: updateData,
      include: {
        department: true
      }
    })

    return NextResponse.json(course)
  } catch (error: any) {
    console.error('Error updating course:', error)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Course with this code already exists' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to update course' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a course or all courses
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    const deleteAll = searchParams.get('deleteAll') === 'true'

    // Delete all courses
    if (deleteAll) {
      const result = await prisma.course.deleteMany({})
      return NextResponse.json({ 
        success: true, 
        deletedCount: result.count 
      })
    }

    // Delete single course
    if (!id) {
      return NextResponse.json(
        { error: 'Missing required parameter: id' },
        { status: 400 }
      )
    }

    await prisma.course.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting course:', error)
    return NextResponse.json(
      { error: 'Failed to delete course' },
      { status: 500 }
    )
  }
}
