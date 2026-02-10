import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Shift } from '@prisma/client'

// GET - Fetch shift templates by study mode
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const studyMode = searchParams.get('studyMode') as Shift | null

    const where: any = {}
    if (studyMode) {
      where.studyMode = studyMode
    }

    const shiftTemplates = await prisma.shiftTemplate.findMany({
      where,
      include: {
        shiftBlocks: {
          orderBy: {
            dayOfWeek: 'asc'
          }
        }
      },
      orderBy: [
        { startTime: 'asc' }
      ]
    })

    return NextResponse.json(shiftTemplates)
  } catch (error) {
    console.error('Error fetching shift templates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch shift templates' },
      { status: 500 }
    )
  }
}

// POST - Create a new shift template
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, studyMode, startTime, endTime, isBreak, dayOfWeeks } = body

    // Validate required fields
    if (!name || !studyMode || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Missing required fields: name, studyMode, startTime, endTime' },
        { status: 400 }
      )
    }

    // Validate and parse time format (expects HH:mm format, HTML time input returns this)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return NextResponse.json(
        { error: `Invalid time format. Expected HH:mm format (e.g., 07:45, 21:30). Received: startTime="${startTime}", endTime="${endTime}"` },
        { status: 400 }
      )
    }

    // Calculate duration in minutes
    const [startHour, startMin] = startTime.split(':').map(Number)
    const [endHour, endMin] = endTime.split(':').map(Number)
    
    // Validate parsed values
    if (isNaN(startHour) || isNaN(startMin) || isNaN(endHour) || isNaN(endMin)) {
      return NextResponse.json(
        { error: 'Invalid time values. Please use HH:mm format' },
        { status: 400 }
      )
    }
    
    const startMinutes = startHour * 60 + startMin
    const endMinutes = endHour * 60 + endMin
    const duration = endMinutes - startMinutes

    if (duration <= 0) {
      return NextResponse.json(
        { error: 'End time must be after start time' },
        { status: 400 }
      )
    }

    // Validate dayOfWeeks if provided
    const validDays = ['SATURDAY', 'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']
    if (dayOfWeeks && Array.isArray(dayOfWeeks) && dayOfWeeks.length > 0) {
      const invalidDays = dayOfWeeks.filter((day: string) => !validDays.includes(day))
      if (invalidDays.length > 0) {
        return NextResponse.json(
          { error: `Invalid day(s): ${invalidDays.join(', ')}. Valid days are: ${validDays.join(', ')}` },
          { status: 400 }
        )
      }
    }

    // Create shift template first
    const shiftTemplate = await prisma.shiftTemplate.create({
      data: {
        name,
        studyMode,
        startTime,
        endTime,
        duration,
        isBreak: isBreak || false
      }
    })

    // Create shift blocks separately if provided
    if (dayOfWeeks && Array.isArray(dayOfWeeks) && dayOfWeeks.length > 0) {
      await prisma.shiftBlock.createMany({
        data: dayOfWeeks.map((day: string) => ({
          shiftTemplateId: shiftTemplate.id,
          dayOfWeek: day as any
        }))
      })
    }

    // Fetch the complete template with blocks
    const completeTemplate = await prisma.shiftTemplate.findUnique({
      where: { id: shiftTemplate.id },
      include: {
        shiftBlocks: true
      }
    })

    return NextResponse.json(completeTemplate, { status: 201 })
  } catch (error: any) {
    console.error('Error creating shift template:', error)
    
    // Return more detailed error message
    let errorMessage = 'Failed to create shift template'
    if (error.message) {
      errorMessage = error.message
    } else if (error.code === 'P2002') {
      errorMessage = 'A shift template with this name already exists'
    } else if (error.code === 'P2003') {
      errorMessage = 'Invalid reference in shift template data'
    }
    
    return NextResponse.json(
      { error: errorMessage, details: error.message || String(error) },
      { status: 500 }
    )
  }
}

// PATCH - Update a shift template
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, studyMode, startTime, endTime, isBreak, dayOfWeeks } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      )
    }

    // Calculate duration if times are provided
    let duration: number | undefined
    if (startTime && endTime) {
      const [startHour, startMin] = startTime.split(':').map(Number)
      const [endHour, endMin] = endTime.split(':').map(Number)
      const startMinutes = startHour * 60 + startMin
      const endMinutes = endHour * 60 + endMin
      duration = endMinutes - startMinutes

      if (duration <= 0) {
        return NextResponse.json(
          { error: 'End time must be after start time' },
          { status: 400 }
        )
      }
    }

    // Update shift template
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (studyMode !== undefined) updateData.studyMode = studyMode
    if (startTime !== undefined) updateData.startTime = startTime
    if (endTime !== undefined) updateData.endTime = endTime
    if (duration !== undefined) updateData.duration = duration
    if (isBreak !== undefined) updateData.isBreak = isBreak

    // Update shift blocks if provided
    if (dayOfWeeks !== undefined) {
      // Delete existing shift blocks
      await prisma.shiftBlock.deleteMany({
        where: { shiftTemplateId: id }
      })

      // Create new shift blocks
      if (dayOfWeeks.length > 0) {
        await prisma.shiftBlock.createMany({
          data: dayOfWeeks.map((day: string) => ({
            shiftTemplateId: id,
            dayOfWeek: day
          }))
        })
      }
    }

    const shiftTemplate = await prisma.shiftTemplate.update({
      where: { id },
      data: updateData,
      include: {
        shiftBlocks: true
      }
    })

    return NextResponse.json(shiftTemplate)
  } catch (error) {
    console.error('Error updating shift template:', error)
    return NextResponse.json(
      { error: 'Failed to update shift template' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a shift template
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

    // Check if shift template is used in any timetable entries
    // (We'll add this check later when we implement timetables)

    // Delete shift template (cascade will delete shift blocks)
    await prisma.shiftTemplate.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting shift template:', error)
    return NextResponse.json(
      { error: 'Failed to delete shift template' },
      { status: 500 }
    )
  }
}
