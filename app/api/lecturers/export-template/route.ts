import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export async function GET() {
  try {
    // Create sample data
    const data = [
      ['Full Name', 'Email', 'Phone', 'Department'],
      ['Dr. John Nash', 'john.nash@siu.edu', '+252 61 1234567', 'Computer Science'],
      ['Prof. Grace Hopper', 'grace.hopper@siu.edu', '+252 61 2345678', 'Computer Science'],
      ['Dr. Albert Einstein', 'albert.einstein@siu.edu', '+252 61 3456789', 'Civil Engineering'],
      ['Prof. Marie Curie', 'marie.curie@siu.edu', '', 'Civil Engineering']
    ]

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.aoa_to_sheet(data)

    // Set column widths
    worksheet['!cols'] = [
      { wch: 25 }, // Full Name
      { wch: 30 }, // Email
      { wch: 18 }, // Phone
      { wch: 25 }  // Department
    ]

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Lecturers')

    // Generate Excel file buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    // Return as downloadable file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="lecturers_template.xlsx"'
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
