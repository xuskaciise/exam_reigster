import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Read the file buffer
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

    // Skip header row
    const rows = data.slice(1).filter(row => row.length > 0 && row[0])

    let created = 0
    let errors = 0
    const errorMessages: string[] = []

    // Get all departments for lookup
    const departments = await prisma.department.findMany()
    const departmentMap = new Map(departments.map(d => [d.name.toLowerCase(), d.id]))

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      try {
        // Expected format: Full Name, Email (optional), Phone (optional), Department (optional)
        const fullName = String(row[0] || '').trim()
        const email = row[1] ? String(row[1]).trim() : ''
        const phone = row[2] ? String(row[2]).trim() : ''
        const departmentName = row[3] ? String(row[3]).trim() : ''

        if (!fullName) {
          errors++
          errorMessages.push(`Row ${i + 2}: Missing full name`)
          continue
        }

        // Find department ID if provided
        let departmentId: string | null = null
        if (departmentName) {
          const deptId = departmentMap.get(departmentName.toLowerCase())
          if (deptId) {
            departmentId = deptId
          } else {
            // Department not found, but continue without it
            errorMessages.push(`Row ${i + 2}: Department "${departmentName}" not found, lecturer created without department`)
          }
        }

        // Check if lecturer already exists (by email if provided, or by name)
        if (email) {
          const existing = await prisma.lecturer.findFirst({
            where: { email: { equals: email, mode: 'insensitive' } }
          })

          if (existing) {
            errors++
            errorMessages.push(`Row ${i + 2}: Lecturer with email "${email}" already exists`)
            continue
          }
        }

        // Create lecturer
        await prisma.lecturer.create({
          data: {
            fullName,
            email: email || null,
            phone: phone || null,
            departmentId
          }
        })

        created++
      } catch (error: any) {
        errors++
        errorMessages.push(`Row ${i + 2}: ${error.message || 'Unknown error'}`)
      }
    }

    return NextResponse.json({
      success: true,
      created,
      errors,
      errorMessages: errorMessages.slice(0, 10) // Return first 10 errors
    })
  } catch (error: any) {
    console.error('Error processing Excel file:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process Excel file' },
      { status: 500 }
    )
  }
}
