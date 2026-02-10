import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export async function GET() {
  try {
    // Create sample data
    const data = [
      ['Course Code', 'Course Title', 'Department'],
      ['CS101', 'Introduction to Computer Science', 'Computer Science'],
      ['MATH201', 'Discrete Mathematics', 'Computer Science'],
      ['CE101', 'Introduction to Civil Engineering', 'Civil Engineering'],
      ['PHYS101', 'Physics I', 'Civil Engineering']
    ]

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.aoa_to_sheet(data)

    // Set column widths
    worksheet['!cols'] = [
      { wch: 15 }, // Course Code
      { wch: 40 }, // Course Title
      { wch: 25 }  // Department
    ]

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Courses')

    // Generate Excel file buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    // Return as downloadable file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="courses_template.xlsx"'
      }
    })
  } catch (error) {
    console.error('Error generating template:', error)
    return NextResponse.json(
      { error: 'Failed to generate template' },
      { status: 500 }
    )
  }
}
