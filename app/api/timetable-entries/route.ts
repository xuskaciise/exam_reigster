import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Fetch timetable entries (optionally filtered by timetableId)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const timetableId = searchParams.get('timetableId')

    const where: any = {}
    if (timetableId) where.timetableId = timetableId

    const entries = await prisma.timetableEntry.findMany({
      where,
      include: {
        timetable: {
          include: {
            semester: true,
            department: true,
            class: true
          }
        },
        shiftTemplate: true
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { shiftTemplate: { startTime: 'asc' } }
      ]
    })

    return NextResponse.json(entries)
  } catch (error) {
    console.error('Error fetching timetable entries:', error)
    return NextResponse.json(
      { error: 'Failed to fetch timetable entries' },
      { status: 500 }
    )
  }
}

// POST - Create a new timetable entry with conflict detection
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { timetableId, dayOfWeek, shiftTemplateId, courseName, lecturerName, room, entryType } = body

    if (!timetableId || !dayOfWeek || !shiftTemplateId || !courseName || !lecturerName) {
      return NextResponse.json(
        { error: 'Missing required fields: timetableId, dayOfWeek, shiftTemplateId, courseName, lecturerName' },
        { status: 400 }
      )
    }

    // Get the shift template to check time
    const shiftTemplate = await prisma.shiftTemplate.findUnique({
      where: { id: shiftTemplateId }
    })

    if (!shiftTemplate) {
      return NextResponse.json(
        { error: 'Shift template not found' },
        { status: 404 }
      )
    }

    // Check for conflicts
    const conflicts = {
      lecturer: [] as any[],
      room: [] as any[]
    }

    // Get all entries for the same timetable
    const timetable = await prisma.timetable.findUnique({
      where: { id: timetableId },
      include: {
        entries: {
          include: {
            shiftTemplate: true
          }
        }
      }
    })

    if (timetable) {
      // Check lecturer conflicts (same lecturer, same day, overlapping time)
      const lecturerConflicts = timetable.entries.filter(entry => {
        if (entry.lecturerName === lecturerName && entry.dayOfWeek === dayOfWeek) {
          // Check if times overlap
          const entryStart = entry.shiftTemplate.startTime
          const entryEnd = entry.shiftTemplate.endTime
          const newStart = shiftTemplate.startTime
          const newEnd = shiftTemplate.endTime

          // Simple time comparison (HH:mm format)
          return (newStart < entryEnd && newEnd > entryStart)
        }
        return false
      })

      // Check room conflicts (same room, same day, overlapping time)
      if (room) {
        const roomConflicts = timetable.entries.filter(entry => {
          if (entry.room === room && entry.dayOfWeek === dayOfWeek) {
            const entryStart = entry.shiftTemplate.startTime
            const entryEnd = entry.shiftTemplate.endTime
            const newStart = shiftTemplate.startTime
            const newEnd = shiftTemplate.endTime

            return (newStart < entryEnd && newEnd > entryStart)
          }
          return false
        })

        conflicts.room = roomConflicts.map(e => ({
          id: e.id,
          courseName: e.courseName,
          time: `${e.shiftTemplate.startTime} - ${e.shiftTemplate.endTime}`
        }))
      }

      conflicts.lecturer = lecturerConflicts.map(e => ({
        id: e.id,
        courseName: e.courseName,
        time: `${e.shiftTemplate.startTime} - ${e.shiftTemplate.endTime}`
      }))
    }

    // Create the entry
    const entry = await prisma.timetableEntry.create({
      data: {
        timetableId,
        dayOfWeek,
        shiftTemplateId,
        courseName,
        lecturerName,
        room: room || null,
        entryType: entryType || 'LECTURE'
      },
      include: {
        timetable: {
          include: {
            semester: true,
            department: true,
            class: true
          }
        },
        shiftTemplate: true
      }
    })

    return NextResponse.json({
      entry,
      conflicts: {
        hasConflicts: conflicts.lecturer.length > 0 || conflicts.room.length > 0,
        lecturer: conflicts.lecturer,
        room: conflicts.room
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating timetable entry:', error)
    return NextResponse.json(
      { error: 'Failed to create timetable entry' },
      { status: 500 }
    )
  }
}

// PATCH - Update a timetable entry
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, dayOfWeek, shiftTemplateId, courseName, lecturerName, room, entryType } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      )
    }

    const updateData: any = {}
    if (dayOfWeek !== undefined) updateData.dayOfWeek = dayOfWeek
    if (shiftTemplateId !== undefined) updateData.shiftTemplateId = shiftTemplateId
    if (courseName !== undefined) updateData.courseName = courseName
    if (lecturerName !== undefined) updateData.lecturerName = lecturerName
    if (room !== undefined) updateData.room = room
    if (entryType !== undefined) updateData.entryType = entryType

    const entry = await prisma.timetableEntry.update({
      where: { id },
      data: updateData,
      include: {
        timetable: {
          include: {
            semester: true,
            department: true,
            class: true
          }
        },
        shiftTemplate: true
      }
    })

    return NextResponse.json(entry)
  } catch (error) {
    console.error('Error updating timetable entry:', error)
    return NextResponse.json(
      { error: 'Failed to update timetable entry' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a timetable entry
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

    await prisma.timetableEntry.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting timetable entry:', error)
    return NextResponse.json(
      { error: 'Failed to delete timetable entry' },
      { status: 500 }
    )
  }
}
