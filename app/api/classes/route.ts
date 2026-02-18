import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const classSchema = z.object({
  classTitle: z.string().min(1, 'Class title is required'),
  departmentId: z.string().optional(),
  departmentName: z.string().optional(),
}).refine((data) => data.departmentId || data.departmentName, {
  message: 'Either departmentId or departmentName is required',
  path: ['departmentId'], // This will show the error on departmentId field
})

// GET /api/classes - Get all classes or by department
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const departmentId = searchParams.get('departmentId')

    const where: any = {}
    if (departmentId) {
      where.departmentId = departmentId
    }

    const classes = await prisma.class.findMany({
      where,
      include: {
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const transformed = classes.map((cls) => ({
      id: cls.id,
      classTitle: cls.classTitle,
      departmentId: cls.departmentId,
      department: cls.department.name,
      room: cls.room || null,
      createdAt: cls.createdAt.toISOString(),
    }))

    return NextResponse.json(transformed)
  } catch (error) {
    console.error('Error fetching classes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch classes' },
      { status: 500 }
    )
  }
}

// POST /api/classes - Create new class
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('[Classes API] Received request body:', body)
    
    const validated = classSchema.parse(body)
    console.log('[Classes API] Validated data:', validated)

    // Find department by ID or name
    let department
    try {
      if (validated.departmentId) {
        console.log('[Classes API] Looking up department by ID:', validated.departmentId)
        department = await prisma.department.findUnique({
          where: { id: validated.departmentId },
        })
      } else if (validated.departmentName) {
        console.log('[Classes API] Looking up department by name:', validated.departmentName)
        // Check if prisma.department exists
        if (!prisma.department) {
          console.error('[Classes API] prisma.department is undefined!')
          return NextResponse.json(
            { error: 'Database model not available. Please restart the server.' },
            { status: 500 }
          )
        }
        department = await prisma.department.findFirst({
          where: { name: validated.departmentName },
        })
      }
    } catch (dbError: any) {
      console.error('[Classes API] Database error:', dbError)
      return NextResponse.json(
        { error: 'Database error', details: dbError.message },
        { status: 500 }
      )
    }

    console.log('[Classes API] Found department:', department)

    if (!department) {
      console.error('[Classes API] Department not found')
      return NextResponse.json(
        { error: 'Department not found', received: { departmentId: validated.departmentId, departmentName: validated.departmentName } },
        { status: 404 }
      )
    }

    const newClass = await prisma.class.create({
      data: {
        classTitle: validated.classTitle,
        departmentId: department.id,
        room: body.room && body.room.trim() !== '' ? body.room.trim() : null,
      },
      include: {
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json(
      {
        id: newClass.id,
        classTitle: newClass.classTitle,
        departmentId: newClass.departmentId,
        department: newClass.department.name,
        room: newClass.room || null,
        createdAt: newClass.createdAt.toISOString(),
      },
      { status: 201 }
    )
  } catch (error: any) {
    if (error.name === 'ZodError') {
      console.error('Validation error:', error.errors)
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating class:', error)
    console.error('Error stack:', error.stack)
    return NextResponse.json(
      { error: 'Failed to create class', details: error.message },
      { status: 500 }
    )
  }
}

// PATCH /api/classes - Update class
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Class ID is required' },
        { status: 400 }
      )
    }

    // Handle department update - can be ID or name
    let departmentId: string | undefined
    if (updateData.departmentName) {
      const dept = await prisma.department.findFirst({
        where: { name: updateData.departmentName },
      })
      if (!dept) {
        return NextResponse.json(
          { error: 'Department not found' },
          { status: 404 }
        )
      }
      departmentId = dept.id
    } else if (updateData.departmentId) {
      const dept = await prisma.department.findUnique({
        where: { id: updateData.departmentId },
      })
      if (!dept) {
        return NextResponse.json(
          { error: 'Department not found' },
          { status: 404 }
        )
      }
      departmentId = updateData.departmentId
    }

    const updatePayload: any = {}
    if (updateData.classTitle) {
      updatePayload.classTitle = updateData.classTitle
    }
    if (departmentId) {
      updatePayload.departmentId = departmentId
    }
    // Always include room field - set to null if empty string
    if (updateData.room !== undefined) {
      updatePayload.room = updateData.room && updateData.room.trim() !== '' ? updateData.room.trim() : null
    }

    const updatedClass = await prisma.class.update({
      where: { id },
      data: updatePayload,
      include: {
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json({
      id: updatedClass.id,
      classTitle: updatedClass.classTitle,
      departmentId: updatedClass.departmentId,
      department: updatedClass.department.name,
      room: updatedClass.room || null,
      createdAt: updatedClass.createdAt.toISOString(),
    })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      )
    }
    console.error('Error updating class:', error)
    console.error('Error details:', error.message, error.meta)
    return NextResponse.json(
      { error: 'Failed to update class', details: error.message },
      { status: 500 }
    )
  }
}

// DELETE /api/classes - Delete class
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Class ID is required' },
        { status: 400 }
      )
    }

    await prisma.class.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      )
    }
    console.error('Error deleting class:', error)
    return NextResponse.json(
      { error: 'Failed to delete class' },
      { status: 500 }
    )
  }
}
