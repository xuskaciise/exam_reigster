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
    
    // Create multiple lookup maps for flexible matching
    const departmentMapExact = new Map(departments.map(d => [d.name.toLowerCase().trim(), d.id]))
    const departmentMapNormalized = new Map(departments.map(d => [
      d.name.toLowerCase().trim().replace(/\s+/g, ' '), 
      d.id
    ]))
    
    // Helper function to normalize department name for matching
    const normalizeDeptName = (name: string): string => {
      return name.toLowerCase().trim().replace(/\s+/g, ' ')
    }
    
    // Helper function to find department ID
    const findDepartmentId = (deptName: string): string | null => {
      if (!deptName) return null
      
      const normalized = normalizeDeptName(deptName)
      
      // Try exact match first
      let deptId = departmentMapExact.get(normalized)
      if (deptId) return deptId
      
      // Try normalized match
      deptId = departmentMapNormalized.get(normalized)
      if (deptId) return deptId
      
      // Try partial match (contains)
      const found = departments.find(d => 
        normalizeDeptName(d.name).includes(normalized) || 
        normalized.includes(normalizeDeptName(d.name))
      )
      if (found) return found.id
      
      return null
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      try {
        // Expected format: Course Code, Course Title, Department (optional)
        const code = String(row[0] || '').trim()
        const title = String(row[1] || '').trim()
        const departmentName = row[2] ? String(row[2]).trim() : ''

        if (!code || !title) {
          errors++
          errorMessages.push(`Row ${i + 2}: Missing course code or title`)
          continue
        }

        // Find department ID if provided
        let departmentId: string | null = null
        if (departmentName) {
          departmentId = findDepartmentId(departmentName)
          if (!departmentId) {
            // Department not found, but continue without it
            errorMessages.push(`Row ${i + 2}: Department "${departmentName}" not found. Available departments: ${departments.map(d => d.name).join(', ')}`)
          }
        }

        // Check if course already exists
        const existing = await prisma.course.findFirst({
          where: { code: { equals: code, mode: 'insensitive' } }
        })

        if (existing) {
          errors++
          errorMessages.push(`Row ${i + 2}: Course with code "${code}" already exists`)
          continue
        }

        // Create course
        await prisma.course.create({
          data: {
            code,
            title,
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
