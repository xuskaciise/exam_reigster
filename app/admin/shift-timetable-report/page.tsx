'use client'

import { useState, useEffect, useRef } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'
import { FileText, Download, Printer, Search, ChevronDown, Image as ImageIcon, CalendarDays, Users, BookOpen, Clock, Grid, User, Users2 } from 'lucide-react'
import { DayOfWeek } from '@prisma/client'

// Day order: Saturday → Friday
const DAY_ORDER: DayOfWeek[] = ['SATURDAY', 'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']

// Full-Time days: Saturday to Wednesday
const FULL_TIME_DAYS: DayOfWeek[] = ['SATURDAY', 'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY']

// Part-Time days: Thursday and Friday
const PART_TIME_DAYS: DayOfWeek[] = ['THURSDAY', 'FRIDAY']

const DAY_LABELS: Record<DayOfWeek, string> = {
  SATURDAY: 'Saturday',
  SUNDAY: 'Sunday',
  MONDAY: 'Monday',
  TUESDAY: 'Tuesday',
  WEDNESDAY: 'Wednesday',
  THURSDAY: 'Thursday',
  FRIDAY: 'Friday',
}

// Convert 24-hour format to 12-hour format (e.g., "13:00" -> "1:00 PM")
function formatTime12Hour(time24: string): string {
  const [hours, minutes] = time24.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`
}

// Extract course name only (remove course code if present)
function getCourseNameOnly(courseName: string): string {
  if (courseName.includes(' - ')) {
    const parts = courseName.split(' - ')
    return parts.slice(1).join(' - ').trim()
  }
  return courseName.trim()
}

interface ReportData {
  entries: any[]
  summary: {
    totalClasses: number
    totalLectures: number
    totalHours: number
    totalMinutes: number
  }
  shiftTemplate: {
    id: string
    name: string
    startTime: string
    endTime: string
  } | null
  department: {
    id: string
    name: string
  } | null
  semester: {
    id: string
    name: string
    academicYear: {
      id: string
      name: string
    }
  } | null
  day: DayOfWeek | null
  reportType: string
  shiftTemplateId: string | null
  departmentId: string | null
  classId: string | null
  studyMode: 'FULL_TIME' | 'PART_TIME' | null
}

export default function ShiftTimetableReportPage() {
  const [reportType, setReportType] = useState<'day-shift' | 'all-days-all-classes'>('day-shift')
  
  const [academicYears, setAcademicYears] = useState<any[]>([])
  const [semesters, setSemesters] = useState<any[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [shiftTemplates, setShiftTemplates] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  
  const [filters, setFilters] = useState({
    academicYearId: '',
    semesterId: '',
    day: '' as DayOfWeek | '',
    shiftTemplateId: '', // Optional
    departmentId: '', // Optional
    classId: '', // Optional
    studyMode: '' as 'FULL_TIME' | 'PART_TIME' | '', // Optional - Filter by study mode
  })

  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Searchable dropdown states
  const [isAcademicYearOpen, setIsAcademicYearOpen] = useState(false)
  const [academicYearSearch, setAcademicYearSearch] = useState('')
  const academicYearRef = useRef<HTMLDivElement>(null)

  const [isSemesterOpen, setIsSemesterOpen] = useState(false)
  const [semesterSearch, setSemesterSearch] = useState('')
  const semesterRef = useRef<HTMLDivElement>(null)

  const [isDayOpen, setIsDayOpen] = useState(false)
  const dayRef = useRef<HTMLDivElement>(null)

  const [isShiftOpen, setIsShiftOpen] = useState(false)
  const [shiftSearch, setShiftSearch] = useState('')
  const shiftRef = useRef<HTMLDivElement>(null)

  const [isClassOpen, setIsClassOpen] = useState(false)
  const [classSearch, setClassSearch] = useState('')
  const classRef = useRef<HTMLDivElement>(null)

  const [isDepartmentOpen, setIsDepartmentOpen] = useState(false)
  const [departmentSearch, setDepartmentSearch] = useState('')
  const departmentRef = useRef<HTMLDivElement>(null)

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (academicYearRef.current && !academicYearRef.current.contains(event.target as Node)) {
        setIsAcademicYearOpen(false)
      }
      if (semesterRef.current && !semesterRef.current.contains(event.target as Node)) {
        setIsSemesterOpen(false)
      }
      if (dayRef.current && !dayRef.current.contains(event.target as Node)) {
        setIsDayOpen(false)
      }
      if (shiftRef.current && !shiftRef.current.contains(event.target as Node)) {
        setIsShiftOpen(false)
      }
      if (classRef.current && !classRef.current.contains(event.target as Node)) {
        setIsClassOpen(false)
      }
      if (departmentRef.current && !departmentRef.current.contains(event.target as Node)) {
        setIsDepartmentOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  useEffect(() => {
    fetchInitialData()
    fetchAllShiftTemplates()
    fetchDepartments()
  }, [])

  useEffect(() => {
    if (filters.academicYearId) {
      fetchSemesters()
      setSemesterSearch('')
      setIsSemesterOpen(false)
    }
  }, [filters.academicYearId])

  useEffect(() => {
    fetchClasses()
  }, [])

  const fetchInitialData = async () => {
    try {
      const response = await fetch('/api/academic-years')
      if (response.ok) {
        const data = await response.json()
        setAcademicYears(data.sort((a: any, b: any) => a.name.localeCompare(b.name)))
      }
    } catch (error) {
      console.error('Error fetching initial data:', error)
    }
  }

  const fetchSemesters = async () => {
    try {
      const response = await fetch(`/api/semesters?academicYearId=${filters.academicYearId}`)
      if (response.ok) {
        const data = await response.json()
        setSemesters(data)
      }
    } catch (error) {
      console.error('Error fetching semesters:', error)
    }
  }

  const fetchAllShiftTemplates = async () => {
    try {
      const response = await fetch('/api/shift-templates')
      if (response.ok) {
        const data = await response.json()
        setShiftTemplates(data.filter((st: any) => st.isActive))
      }
    } catch (error) {
      console.error('Error fetching shift templates:', error)
    }
  }

  const fetchClasses = async () => {
    try {
      const response = await fetch('/api/classes')
      if (response.ok) {
        const data = await response.json()
        setClasses(data.sort((a: any, b: any) => a.classTitle.localeCompare(b.classTitle)))
      }
    } catch (error) {
      console.error('Error fetching classes:', error)
    }
  }

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/departments')
      if (response.ok) {
        const data = await response.json()
        setDepartments(data.sort((a: any, b: any) => a.name.localeCompare(b.name)))
      }
    } catch (error) {
      console.error('Error fetching departments:', error)
    }
  }

  const generateReport = async () => {
    if (reportType === 'all-days-all-classes') {
      // Validate required filters for All Days All Classes: Academic Year, Semester, and Department
      if (!filters.academicYearId || !filters.semesterId || !filters.departmentId) {
        alert('Please select Academic Year, Semester/Session, and Department')
        return
      }
    } else {
      // Validate required filters for Day & Shift report (Day is optional - if null, show all days)
      if (!filters.academicYearId || !filters.semesterId) {
        alert('Please select Academic Year and Semester/Session')
        return
      }
    }

    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        academicYearId: filters.academicYearId,
        semesterId: filters.semesterId,
        reportType: reportType,
      })

      if (reportType === 'all-days-all-classes') {
        // All Days All Classes filters
        params.append('departmentId', filters.departmentId) // Required
        if (filters.shiftTemplateId) {
          params.append('shiftTemplateId', filters.shiftTemplateId) // Optional
        }
      } else {
        // Day & Shift filters (both optional - if null, show all)
        if (filters.day) {
          params.append('day', filters.day)
        }
        if (filters.shiftTemplateId) {
          params.append('shiftTemplateId', filters.shiftTemplateId)
        }
        if (filters.departmentId) {
          params.append('departmentId', filters.departmentId)
        }
        if (filters.classId) {
          params.append('classId', filters.classId)
        }
      }
      
      // Add study mode filter (optional)
      if (filters.studyMode) {
        params.append('studyMode', filters.studyMode)
      }

      const response = await fetch(`/api/shift-timetable-report?${params}`)
      if (response.ok) {
        const data = await response.json()
        setReportData(data)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to generate report')
      }
    } catch (error) {
      console.error('Error generating report:', error)
      alert('Failed to generate report')
    } finally {
      setIsLoading(false)
    }
  }

  const exportToExcel = () => {
    if (!reportData) return

    // Create workbook data
    const headers = ['Class', 'Course Name', 'Lecturer', 'Department', 'Room', 'Time']
    const rows = reportData.entries.map((entry: any) => [
      entry.timetable.class?.classTitle || 'N/A',
      getCourseNameOnly(entry.courseName),
      entry.lecturerName,
      entry.timetable.department?.name || 'N/A',
      entry.timetable.class?.room || entry.room || 'N/A',
      `${formatTime12Hour(entry.shiftTemplate.startTime)} - ${formatTime12Hour(entry.shiftTemplate.endTime)}`,
    ])

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n')

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `Shift_Timetable_Report_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportToImage = async () => {
    if (!reportData) return

    if (typeof window === 'undefined') {
      alert('This feature is only available in the browser')
      return
    }

    let exportElement = document.getElementById('report-export')
    let useVisibleReport = false

    if (!exportElement) {
      exportElement = document.getElementById('shift-report-content')
      useVisibleReport = true
      
      if (!exportElement) {
        alert('Report content not found')
        return
      }
    }

    try {
      const originalStyles: any = {}
      if (!useVisibleReport) {
        originalStyles.opacity = exportElement.style.opacity
        originalStyles.zIndex = exportElement.style.zIndex
        originalStyles.pointerEvents = exportElement.style.pointerEvents
        originalStyles.position = exportElement.style.position
        originalStyles.top = exportElement.style.top
        originalStyles.left = exportElement.style.left
        originalStyles.visibility = exportElement.style.visibility
        originalStyles.width = exportElement.style.width
        
        exportElement.style.position = 'fixed'
        exportElement.style.top = '0'
        exportElement.style.left = '0'
        exportElement.style.opacity = '1'
        exportElement.style.zIndex = '999999'
        exportElement.style.pointerEvents = 'none'
        exportElement.style.visibility = 'visible'
        exportElement.style.width = '1200px'
      } else {
        originalStyles.width = exportElement.style.width
        originalStyles.maxWidth = exportElement.style.maxWidth
        exportElement.style.width = '1200px'
        exportElement.style.maxWidth = '1200px'
      }
      
      exportElement.offsetHeight
      await new Promise(resolve => setTimeout(resolve, 500))

      const { toPng } = await import('html-to-image')

      const dataUrl = await toPng(exportElement, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        quality: 1.0,
        cacheBust: true,
      })

      if (!useVisibleReport) {
        Object.assign(exportElement.style, originalStyles)
      } else {
        exportElement.style.width = originalStyles.width || ''
        exportElement.style.maxWidth = originalStyles.maxWidth || ''
      }

      const link = document.createElement('a')
      link.setAttribute('href', dataUrl)
      link.setAttribute('download', `Shift_Timetable_Report_${new Date().toISOString().split('T')[0]}.png`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Error exporting to image:', error)
      alert('Failed to export image: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const exportToPDF = async () => {
    if (!reportData) return

    if (typeof window === 'undefined') {
      alert('This feature is only available in the browser')
      return
    }

    // Find the report content element
    let exportElement = document.getElementById('shift-report-content')
    
    if (!exportElement) {
      alert('Report content not found. Please generate the report first.')
      return
    }

    try {
      // Store original styles
      const originalStyles = {
        width: exportElement.style.width,
        maxWidth: exportElement.style.maxWidth,
        backgroundColor: exportElement.style.backgroundColor,
        overflow: exportElement.style.overflow,
        overflowX: exportElement.style.overflowX,
        overflowY: exportElement.style.overflowY,
        padding: exportElement.style.padding,
        margin: exportElement.style.margin,
      }

      // Set styles for export - ensure no scrollbars and all content visible
      exportElement.style.width = '1200px'
      exportElement.style.maxWidth = '1200px'
      exportElement.style.backgroundColor = '#ffffff'
      exportElement.style.overflow = 'visible'
      exportElement.style.overflowX = 'visible'
      exportElement.style.overflowY = 'visible'
      exportElement.style.padding = '0'
      exportElement.style.margin = '0'
      
      // Also fix child elements
      const allChildren = exportElement.querySelectorAll('*')
      allChildren.forEach((child: any) => {
        if (child.style) {
          const originalOverflow = child.style.overflow
          const originalOverflowX = child.style.overflowX
          const originalOverflowY = child.style.overflowY
          child.setAttribute('data-original-overflow', originalOverflow || '')
          child.setAttribute('data-original-overflow-x', originalOverflowX || '')
          child.setAttribute('data-original-overflow-y', originalOverflowY || '')
          child.style.overflow = 'visible'
          child.style.overflowX = 'visible'
          child.style.overflowY = 'visible'
        }
      })
      
      // Force reflow and wait for rendering
      exportElement.offsetHeight
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Import libraries
      const { toPng } = await import('html-to-image')
      const { default: jsPDF } = await import('jspdf')

      // Convert to image
      const dataUrl = await toPng(exportElement, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        quality: 1.0,
        cacheBust: true,
      })

      // Restore original styles
      exportElement.style.width = originalStyles.width || ''
      exportElement.style.maxWidth = originalStyles.maxWidth || ''
      exportElement.style.backgroundColor = originalStyles.backgroundColor || ''
      exportElement.style.overflow = originalStyles.overflow || ''
      exportElement.style.overflowX = originalStyles.overflowX || ''
      exportElement.style.overflowY = originalStyles.overflowY || ''
      exportElement.style.padding = originalStyles.padding || ''
      exportElement.style.margin = originalStyles.margin || ''
      
      // Restore child elements
      const childElements = exportElement.querySelectorAll('*')
      childElements.forEach((child: any) => {
        if (child.style && child.hasAttribute('data-original-overflow')) {
          child.style.overflow = child.getAttribute('data-original-overflow') || ''
          child.style.overflowX = child.getAttribute('data-original-overflow-x') || ''
          child.style.overflowY = child.getAttribute('data-original-overflow-y') || ''
          child.removeAttribute('data-original-overflow')
          child.removeAttribute('data-original-overflow-x')
          child.removeAttribute('data-original-overflow-y')
        }
      })

      // Verify image
      if (!dataUrl || dataUrl.length < 100) {
        alert('Failed to generate image. The report might be empty.')
        return
      }

      // Create PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })

      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const margin = 5
      const contentWidth = pdfWidth - (margin * 2)

      // Load image and add to PDF
      const img = new Image()
      
      await new Promise((resolve, reject) => {
        img.onload = () => {
          try {
            // Calculate dimensions
            const imgWidth = contentWidth
            const imgHeight = (img.height * contentWidth) / img.width

            // Add first page
            pdf.addImage(dataUrl, 'PNG', margin, margin, imgWidth, imgHeight)

            // Handle multi-page
            let totalHeight = imgHeight
            let yPosition = margin

            while (totalHeight > pdfHeight - (margin * 2)) {
              const pageHeight = pdfHeight - (margin * 2)
              const remainingHeight = totalHeight - pageHeight
              
              if (remainingHeight > 0) {
                pdf.addPage()
                yPosition = margin - (totalHeight - remainingHeight)
                pdf.addImage(dataUrl, 'PNG', margin, yPosition, imgWidth, imgHeight)
                totalHeight = remainingHeight
              } else {
                break
              }
            }

            // Save PDF
            pdf.save(`Shift_Timetable_Report_${new Date().toISOString().split('T')[0]}.pdf`)
            resolve(null)
          } catch (error) {
            console.error('Error adding image to PDF:', error)
            reject(error)
          }
        }
        
        img.onerror = () => {
          reject(new Error('Failed to load image'))
        }
        
        img.src = dataUrl
      })
    } catch (error) {
      console.error('Error exporting PDF:', error)
      alert('Failed to export PDF: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 print:hidden">
          <CalendarDays className="w-8 h-8 text-green-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Shift Timetable Report</h1>
            <p className="text-gray-600">Generate comprehensive timetable reports</p>
          </div>
        </div>

        {/* Report Type Selector */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 print:hidden">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Report Configuration</h2>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">Report Type</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => {
                  setReportType('day-shift')
                  setReportData(null)
                  setFilters(prev => ({ ...prev, day: '', shiftTemplateId: '', classId: '' }))
                }}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  reportType === 'day-shift'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <CalendarDays className={`w-6 h-6 ${reportType === 'day-shift' ? 'text-green-600' : 'text-gray-400'}`} />
                  <div>
                    <div className={`font-semibold ${reportType === 'day-shift' ? 'text-gray-900' : 'text-gray-700'}`}>
                      By Day & Shift
                    </div>
                    <div className="text-sm text-gray-500 mt-1">View timetable by specific day and shift</div>
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setReportType('all-days-all-classes')
                  setReportData(null)
                  setFilters(prev => ({ ...prev, day: '', classId: '' }))
                }}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  reportType === 'all-days-all-classes'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Users2 className={`w-6 h-6 ${reportType === 'all-days-all-classes' ? 'text-green-600' : 'text-gray-400'}`} />
                  <div>
                    <div className={`font-semibold ${reportType === 'all-days-all-classes' ? 'text-gray-900' : 'text-gray-700'}`}>
                      All Days All Classes
                    </div>
                    <div className="text-sm text-gray-500 mt-1">View all days and all classes with department filter</div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 print:hidden">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {/* Academic Year */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ACADEMIC YEAR *</label>
              <div className="relative" ref={academicYearRef}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={academicYears.find(y => y.id === filters.academicYearId)?.name || academicYearSearch}
                    onChange={(e) => {
                      setAcademicYearSearch(e.target.value)
                      setIsAcademicYearOpen(true)
                    }}
                    onFocus={() => setIsAcademicYearOpen(true)}
                    placeholder="Search Academic Year"
                    className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
                {isAcademicYearOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
                    <div className="p-2 border-b border-gray-200">
                      <div className="flex items-center gap-2">
                        <Search className="w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={academicYearSearch}
                          onChange={(e) => setAcademicYearSearch(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          placeholder="Search Academic Year"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-600 text-sm"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="overflow-y-auto max-h-48">
                      {academicYears
                        .filter(y => !academicYearSearch || y.name.toLowerCase().includes(academicYearSearch.toLowerCase()))
                        .map(year => (
                          <button
                            key={year.id}
                            type="button"
                            onClick={() => {
                              setFilters({ ...filters, academicYearId: year.id })
                              setIsAcademicYearOpen(false)
                              setAcademicYearSearch('')
                            }}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors"
                          >
                            {year.name}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Semester / Session */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">SEMESTER / SESSION *</label>
              <div className="relative" ref={semesterRef}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={semesters.find(s => s.id === filters.semesterId)?.name || semesterSearch}
                    onChange={(e) => {
                      setSemesterSearch(e.target.value)
                      setIsSemesterOpen(true)
                    }}
                    onFocus={() => setIsSemesterOpen(true)}
                    placeholder="Search Semester / Session"
                    disabled={!filters.academicYearId}
                    className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
                {isSemesterOpen && filters.academicYearId && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
                    <div className="p-2 border-b border-gray-200">
                      <div className="flex items-center gap-2">
                        <Search className="w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={semesterSearch}
                          onChange={(e) => setSemesterSearch(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          placeholder="Search Semester / Session"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-600 text-sm"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="overflow-y-auto max-h-48">
                      {semesters
                        .filter(s => !semesterSearch || s.name.toLowerCase().includes(semesterSearch.toLowerCase()))
                        .map(semester => (
                          <button
                            key={semester.id}
                            type="button"
                            onClick={() => {
                              setFilters({ ...filters, semesterId: semester.id })
                              setIsSemesterOpen(false)
                              setSemesterSearch('')
                            }}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors"
                          >
                            {semester.name}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Day - Only show for day-shift report type */}
            {reportType === 'day-shift' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">DAY (Optional - Leave empty for all days)</label>
                <div className="relative" ref={dayRef}>
                  <div className="relative">
                    <input
                      type="text"
                      value={filters.day ? DAY_LABELS[filters.day] : ''}
                      readOnly
                      onFocus={() => setIsDayOpen(true)}
                      placeholder="Select Day (Leave empty for all days)"
                      className="w-full px-4 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 cursor-pointer"
                    />
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    {filters.day && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setFilters({ ...filters, day: '' as DayOfWeek | '' })
                          setIsDayOpen(false)
                        }}
                        className="absolute right-8 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        ×
                      </button>
                    )}
                  </div>
                  {isDayOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg overflow-hidden">
                      <button
                        type="button"
                        onClick={() => {
                          setFilters({ ...filters, day: '' as DayOfWeek | '' })
                          setIsDayOpen(false)
                        }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors text-gray-500 italic"
                      >
                        (All Days)
                      </button>
                      {DAY_ORDER.map(day => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            setFilters({ ...filters, day })
                            setIsDayOpen(false)
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors"
                        >
                          {DAY_LABELS[day]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Shift */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SHIFT (Optional)
              </label>
              <div className="relative" ref={shiftRef}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={shiftTemplates.find(st => st.id === filters.shiftTemplateId)?.name || shiftSearch}
                    onChange={(e) => {
                      setShiftSearch(e.target.value)
                      setIsShiftOpen(true)
                    }}
                    onFocus={() => setIsShiftOpen(true)}
                    placeholder={reportType === 'all-days-all-classes' ? 'Search Shift (Leave empty for all shifts)' : 'Search Shift (Leave empty for all shifts)'}
                    className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  {filters.shiftTemplateId && (
                    <button
                      type="button"
                      onClick={() => {
                        setFilters({ ...filters, shiftTemplateId: '' })
                        setShiftSearch('')
                      }}
                      className="absolute right-8 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      ×
                    </button>
                  )}
                </div>
                {isShiftOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
                    <div className="p-2 border-b border-gray-200">
                      <div className="flex items-center gap-2">
                        <Search className="w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={shiftSearch}
                          onChange={(e) => setShiftSearch(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          placeholder="Search Shift"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-600 text-sm"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="overflow-y-auto max-h-48">
                      <button
                        type="button"
                        onClick={() => {
                          setFilters({ ...filters, shiftTemplateId: '' })
                          setIsShiftOpen(false)
                          setShiftSearch('')
                        }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors font-medium text-gray-700"
                      >
                        (All Shifts)
                      </button>
                      {shiftTemplates
                        .filter(st => !shiftSearch || st.name.toLowerCase().includes(shiftSearch.toLowerCase()))
                        .map(shiftTemplate => (
                          <button
                            key={shiftTemplate.id}
                            type="button"
                            onClick={() => {
                              setFilters({ ...filters, shiftTemplateId: shiftTemplate.id })
                              setIsShiftOpen(false)
                              setShiftSearch('')
                            }}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors"
                          >
                            {shiftTemplate.name}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Study Mode Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                STUDY MODE (Optional)
              </label>
              <select
                value={filters.studyMode}
                onChange={(e) => setFilters({ ...filters, studyMode: e.target.value as 'FULL_TIME' | 'PART_TIME' | '' })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
              >
                <option value="">All Study Modes</option>
                <option value="FULL_TIME">Full-Time (Sat-Wed)</option>
                <option value="PART_TIME">Part-Time (Thu-Fri)</option>
              </select>
            </div>

            {/* Department */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                DEPARTMENT {reportType === 'all-days-all-classes' ? '*' : '(Optional)'}
              </label>
              <div className="relative" ref={departmentRef}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={departments.find(d => d.id === filters.departmentId)?.name || departmentSearch}
                    onChange={(e) => {
                      setDepartmentSearch(e.target.value)
                      setIsDepartmentOpen(true)
                    }}
                    onFocus={() => setIsDepartmentOpen(true)}
                    placeholder="Search Department (Leave empty for all departments)"
                    className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  {filters.departmentId && (
                    <button
                      type="button"
                      onClick={() => {
                        setFilters({ ...filters, departmentId: '' })
                        setDepartmentSearch('')
                      }}
                      className="absolute right-8 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      ×
                    </button>
                  )}
                </div>
                {isDepartmentOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
                    <div className="p-2 border-b border-gray-200">
                      <div className="flex items-center gap-2">
                        <Search className="w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={departmentSearch}
                          onChange={(e) => setDepartmentSearch(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          placeholder="Search Department"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-600 text-sm"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="overflow-y-auto max-h-48">
                      <button
                        type="button"
                        onClick={() => {
                          setFilters({ ...filters, departmentId: '' })
                          setIsDepartmentOpen(false)
                          setDepartmentSearch('')
                        }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors font-medium text-gray-700"
                      >
                        (All Departments)
                      </button>
                      {departments
                        .filter(d => !departmentSearch || d.name.toLowerCase().includes(departmentSearch.toLowerCase()))
                        .map(department => (
                          <button
                            key={department.id}
                            type="button"
                            onClick={() => {
                              setFilters({ ...filters, departmentId: department.id })
                              setIsDepartmentOpen(false)
                              setDepartmentSearch('')
                            }}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors"
                          >
                            {department.name}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Class - Only show for day-shift report type */}
            {reportType === 'day-shift' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">CLASS (Optional)</label>
              <div className="relative" ref={classRef}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={classes.find(c => c.id === filters.classId)?.classTitle || classSearch}
                    onChange={(e) => {
                      setClassSearch(e.target.value)
                      setIsClassOpen(true)
                    }}
                    onFocus={() => setIsClassOpen(true)}
                    placeholder="Search Class (Leave empty for all classes)"
                    className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  {filters.classId && (
                    <button
                      type="button"
                      onClick={() => {
                        setFilters({ ...filters, classId: '' })
                        setClassSearch('')
                      }}
                      className="absolute right-8 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      ×
                    </button>
                  )}
                </div>
                {isClassOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
                    <div className="p-2 border-b border-gray-200">
                      <div className="flex items-center gap-2">
                        <Search className="w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={classSearch}
                          onChange={(e) => setClassSearch(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          placeholder="Search Class"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-600 text-sm"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="overflow-y-auto max-h-48">
                      <button
                        type="button"
                        onClick={() => {
                          setFilters({ ...filters, classId: '' })
                          setIsClassOpen(false)
                          setClassSearch('')
                        }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors font-medium text-gray-700"
                      >
                        (All Classes)
                      </button>
                      {classes
                        .filter(c => !classSearch || c.classTitle.toLowerCase().includes(classSearch.toLowerCase()))
                        .map(cls => (
                          <button
                            key={cls.id}
                            type="button"
                            onClick={() => {
                              setFilters({ ...filters, classId: cls.id })
                              setIsClassOpen(false)
                              setClassSearch('')
                            }}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors"
                          >
                            {cls.classTitle}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
              </div>
            )}
          </div>

          {/* Generate Button */}
          <div className="flex justify-end">
            <button
              onClick={generateReport}
              disabled={isLoading}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
        </div>

        {/* Export Buttons */}
        {reportData && (
          <div className="flex justify-end gap-3 print:hidden">
            <button
              onClick={exportToExcel}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4" />
              Excel
            </button>
            <button
              onClick={exportToImage}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              <ImageIcon className="w-4 h-4" />
              Export Image
            </button>
            <button
              onClick={exportToPDF}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Export PDF
            </button>
            <button
              onClick={() => window.print()}
              className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
          </div>
        )}

        {/* Report Preview */}
        {reportData && (
          <>
            {/* Display Container */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 print:shadow-none print:border-0 print:p-0 print:m-0 print:w-full print:max-w-none print:block print-only-report" id="shift-report-content">
              <ShiftReportView data={reportData} />
            </div>
            
            {/* Export Container */}
            <div 
              id="report-export" 
              className="report-export-container"
              style={{
                position: 'fixed',
                top: '0',
                left: '0',
                width: '1200px',
                minHeight: '100px',
                background: 'white',
                boxShadow: 'none',
                borderRadius: '0',
                padding: '0',
                margin: '0',
                overflow: 'visible',
                opacity: '0',
                zIndex: '-1',
                pointerEvents: 'none',
                visibility: 'visible',
                display: 'block',
              }}
            >
              <ShiftReportView data={reportData} />
            </div>
          </>
        )}

        {/* Empty State Message */}
        {reportData && reportData.entries.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center print:hidden">
            <p className="text-yellow-800 font-medium">
              {filters.classId 
                ? 'Selected class has no lectures in this shift.'
                : 'No lectures found for the selected Day and Shift.'}
            </p>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

// Shift Report View Component
function ShiftReportView({ data }: { data: ReportData }) {
  // Get unique courses count
  const uniqueCourses = new Set(data.entries.map((e: any) => e.courseName))
  const totalCourses = uniqueCourses.size

  // Calculate total hours with decimal
  const totalHoursDecimal = data.summary.totalHours + (data.summary.totalMinutes / 60)

  // For "All Days All Classes" - Group by CLASS first, then by time and day
  if (data.reportType === 'all-days-all-classes') {
    // First group by class
    const groupedByClass: Record<string, any[]> = {}
    data.entries.forEach((entry: any) => {
      const classId = entry.timetable.classId || 'unknown'
      if (!groupedByClass[classId]) {
        groupedByClass[classId] = []
      }
      groupedByClass[classId].push(entry)
    })

    // Get all unique time slots across all entries
    const timeSlots = new Set<string>()
    data.entries.forEach((entry: any) => {
      const timeKey = `${entry.shiftTemplate.startTime}-${entry.shiftTemplate.endTime}`
      timeSlots.add(timeKey)
    })
    
    // Sort time slots
    const sortedTimeSlots = Array.from(timeSlots).sort((a, b) => {
      const aStart = a.split('-')[0]
      const bStart = b.split('-')[0]
      return aStart.localeCompare(bStart)
    })

    return (
      <div className="max-w-[1200px] mx-auto print:max-w-none print:m-0 print:p-0 print:w-full print:block bg-white print:bg-white">
        {/* Compact Header */}
        <div className="bg-blue-900 text-white p-4 mb-4 print:bg-blue-900 print:text-white print:p-3 print:mb-3">
          <div className="text-center">
            <h1 className="text-xl font-bold mb-1 print:text-lg print:font-bold print:text-white">Somali International University</h1>
            <h2 className="text-sm mb-2 print:text-xs print:text-white print:mb-1">Faculty of Engineering and Computer Science</h2>
            <h3 className="text-lg font-bold mb-3 print:text-base print:font-bold print:text-white print:mb-2">
              SHIFT TIMETABLE REPORT – ALL DAYS
            </h3>
            
            {/* Compact Metadata Row */}
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs print:text-[10px] print:gap-x-3">
              <span><strong>Academic Year:</strong> {data.semester?.academicYear?.name || 'N/A'}</span>
              <span><strong>Semester:</strong> {data.semester?.name || 'N/A'}</span>
              <span><strong>Shift:</strong> {data.shiftTemplate?.name || 'All Shifts'}</span>
              <span><strong>Generated:</strong> {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
          </div>
        </div>

        {/* Compact Summary - Top Right */}
        <div className="flex justify-end gap-3 mb-4 print:mb-3 print:gap-2">
          <div className="bg-blue-50 px-3 py-1.5 rounded text-xs print:bg-blue-50 print:px-2 print:py-1 print:rounded">
            <span className="text-gray-600 print:text-gray-700">Classes: </span>
            <span className="font-bold text-gray-900 print:text-gray-900">{data.summary.totalClasses}</span>
          </div>
          <div className="bg-green-50 px-3 py-1.5 rounded text-xs print:bg-green-50 print:px-2 print:py-1 print:rounded">
            <span className="text-gray-600 print:text-gray-700">Courses: </span>
            <span className="font-bold text-gray-900 print:text-gray-900">{totalCourses}</span>
          </div>
          <div className="bg-orange-50 px-3 py-1.5 rounded text-xs print:bg-orange-50 print:px-2 print:py-1 print:rounded">
            <span className="text-gray-600 print:text-gray-700">Hours: </span>
            <span className="font-bold text-gray-900 print:text-gray-900">{totalHoursDecimal.toFixed(1)}</span>
          </div>
        </div>

        {/* Tables Grouped by Class - 2 Columns Grid Layout */}
        {data.entries.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2 print:gap-3 items-start">
            {Object.entries(groupedByClass).map(([classId, classEntries]) => {
              const firstEntry = classEntries[0]
              const classInfo = firstEntry.timetable.class
              const classTitle = classInfo?.classTitle || 'N/A'
              const studyMode = firstEntry.timetable.studyMode || 'FULL_TIME'
              const deptName = firstEntry.timetable.department?.name || 'N/A'

              // Create a map of time slot -> day -> entry
              const timeDayMap: Record<string, Record<DayOfWeek, any>> = {}
              sortedTimeSlots.forEach(timeSlot => {
                timeDayMap[timeSlot] = {} as Record<DayOfWeek, any>
              })

              classEntries.forEach((entry: any) => {
                const timeKey = `${entry.shiftTemplate.startTime}-${entry.shiftTemplate.endTime}`
                if (!timeDayMap[timeKey]) {
                  timeDayMap[timeKey] = {} as Record<DayOfWeek, any>
                }
                timeDayMap[timeKey][entry.dayOfWeek] = entry
              })

              return (
                <div key={classId} className="print:break-inside-avoid flex flex-col bg-white border border-gray-200 rounded-lg shadow-sm print:border print:border-gray-300 print:rounded print:shadow-none">
                  {/* Class Header */}
                  <div className="bg-gray-100 px-3 py-1.5 border-b-2 border-gray-400 print:bg-gray-100 print:px-2 print:py-1 print:border-b-2 print:border-gray-500 flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-gray-900 print:text-xs print:font-bold">{classTitle}</h4>
                        <p className="text-[10px] text-gray-600 print:text-[8px] print:text-gray-700">
                          {studyMode === 'FULL_TIME' ? 'Full-Time' : 'Part-Time'} | Sem {data.semester?.name?.match(/\d+/)?.[0] || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Grid Table - Time vs Days */}
                  <div className="overflow-x-auto print:overflow-visible flex-1 p-2 print:p-1" style={{ overflow: 'visible', overflowX: 'visible', overflowY: 'visible' }}>
                    <table className="w-full text-xs print:text-[10px] border-collapse" style={{ width: '100%', tableLayout: 'auto' }}>
                      <thead>
                        <tr className="bg-gray-50 print:bg-gray-50">
                          <th className="border border-gray-300 px-2 py-1 text-center font-semibold text-gray-900 print:border-gray-400 print:px-1.5 print:py-0.5 print:text-[10px] print:font-bold w-[12%]">TIME</th>
                          {(() => {
                            // Filter days based on study mode from data
                            let daysToShow = DAY_ORDER
                            const studyMode = firstEntry.timetable.studyMode
                            if (studyMode === 'FULL_TIME') {
                              daysToShow = FULL_TIME_DAYS
                            } else if (studyMode === 'PART_TIME') {
                              daysToShow = PART_TIME_DAYS
                            }
                            return daysToShow.map(day => (
                              <th key={day} className="border border-gray-300 px-1.5 py-1 text-center font-semibold text-gray-900 print:border-gray-400 print:px-1 print:py-0.5 print:text-[9px] print:font-bold">
                                {DAY_LABELS[day].substring(0, 3).toUpperCase()}
                              </th>
                            ))
                          })()}
                        </tr>
                      </thead>
                      <tbody>
                        {sortedTimeSlots.map((timeSlot, timeIndex) => {
                          const [startTime, endTime] = timeSlot.split('-')
                          const dayEntries = timeDayMap[timeSlot] || {}

                          return (
                            <tr 
                              key={timeSlot}
                              className={`border-b border-gray-200 print:border-b print:border-gray-300 ${timeIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                            >
                              <td className="border border-gray-300 px-2 py-0.5 text-center font-medium text-gray-700 print:border-gray-400 print:px-1.5 print:py-0.5 print:text-[9px] align-middle">
                                {formatTime12Hour(startTime)}<br className="print:hidden" />
                                <span className="print:hidden">–</span><br className="print:hidden" />
                                {formatTime12Hour(endTime)}
                              </td>
                              {(() => {
                                // Filter days based on study mode from class
                                let daysToShow = DAY_ORDER
                                if (studyMode === 'FULL_TIME') {
                                  daysToShow = FULL_TIME_DAYS
                                } else if (studyMode === 'PART_TIME') {
                                  daysToShow = PART_TIME_DAYS
                                }
                                return daysToShow.map(day => {
                                  const entry = dayEntries[day]
                                  if (!entry) {
                                    return (
                                      <td key={day} className="border border-gray-300 px-1.5 py-0.5 text-center text-gray-400 print:border-gray-400 print:px-1 print:py-0.5 print:text-[9px] align-middle">
                                        —
                                      </td>
                                    )
                                  }

                                  const courseName = getCourseNameOnly(entry.courseName)
                                  const lecturerName = entry.lecturerName

                                  return (
                                    <td key={day} className="border border-gray-300 px-1.5 py-0.5 text-center text-gray-700 print:border-gray-400 print:px-1 print:py-0.5 print:text-[9px] align-middle">
                                      <div className="font-semibold text-gray-900 print:font-semibold print:text-gray-900 text-[10px] print:text-[8px] leading-tight">
                                        {courseName}
                                      </div>
                                      <div className="text-[9px] text-gray-600 print:text-[7px] print:text-gray-600 leading-tight">
                                        {lecturerName}
                                      </div>
                                    </td>
                                  )
                                })
                              })()}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-center print:bg-yellow-50 print:border print:border-yellow-300 print:p-2">
            <p className="text-yellow-800 text-sm font-medium print:text-yellow-900 print:text-xs">
              No lectures found for the selected filters.
            </p>
          </div>
        )}
      </div>
    )
  }

  // Original layout for "day-shift" report type
  // Group entries by class
  const groupedByClass: Record<string, any[]> = {}
  data.entries.forEach((entry: any) => {
    const classId = entry.timetable.classId || 'unknown'
    if (!groupedByClass[classId]) {
      groupedByClass[classId] = []
    }
    groupedByClass[classId].push(entry)
  })

  return (
    <div className="print:p-0 print:w-full print:max-w-none print:m-0 print:block">
      {/* Header */}
      <div className="bg-blue-900 text-white p-8 mb-6 print:bg-blue-900 print:text-white print:p-6 print:mb-5 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute right-0 top-0 bottom-0 w-32 opacity-10 print:opacity-10">
          <div className="grid grid-cols-4 gap-2 h-full p-4">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="rounded-full bg-white"></div>
            ))}
          </div>
        </div>
        
        <div className="relative">
          {/* Official Document Tag */}
          <div className="absolute top-0 right-0 bg-blue-700 px-4 py-2 rounded-bl-lg print:bg-blue-700">
            <span className="text-xs font-semibold uppercase tracking-wide">OFFICIAL DOCUMENT</span>
          </div>

          <div className="text-center pt-2">
            <h1 className="text-3xl font-bold mb-2 print:text-2xl print:font-bold print:text-white">Somali International University</h1>
            <h2 className="text-lg mb-4 print:text-base print:text-white print:mb-3">Faculty of Engineering and Computer Science</h2>
            <h3 className="text-2xl font-bold mb-6 print:text-xl print:font-bold print:text-white print:mb-4">
              SHIFT TIMETABLE REPORT {data.reportType === 'all-days-all-classes' ? '- ALL DAYS' : ''}
            </h3>
            
            {/* Filter Info in Header */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm print:grid-cols-4 print:gap-3 print:text-xs">
              <div>
                <span className="font-semibold">ACADEMIC YEAR:</span> {data.semester?.academicYear?.name || 'N/A'}
              </div>
              <div>
                <span className="font-semibold">SEMESTER / SESSION:</span> {data.semester?.name || 'N/A'}
              </div>
              {data.reportType === 'day-shift' && data.day && (
                <div>
                  <span className="font-semibold">SELECTED DAY:</span> {DAY_LABELS[data.day]}
                </div>
              )}
              <div>
                <span className="font-semibold">SHIFT TYPE:</span> {data.shiftTemplate?.name || 'All Shifts'}
              </div>
              {data.reportType === 'all-days-all-classes' && (
                <div className="col-span-2 text-right">
                  <span className="font-semibold">GENERATED DATE:</span> {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 print:mb-5 print:grid-cols-3 print:gap-3">
        <div className="bg-blue-50 p-4 rounded-lg print:bg-blue-50 print:p-3 print:rounded flex items-center gap-3">
          <div className="bg-blue-200 p-3 rounded-full print:bg-blue-200">
            <Users className="w-6 h-6 text-blue-700 print:w-5 print:h-5" />
          </div>
          <div>
            <div className="text-xs text-gray-600 mb-1 print:text-xs print:font-medium print:text-gray-700 uppercase">TOTAL CLASSES</div>
            <div className="font-bold text-2xl text-gray-900 print:text-xl print:text-gray-900">{data.summary.totalClasses}</div>
          </div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg print:bg-green-50 print:p-3 print:rounded flex items-center gap-3">
          <div className="bg-green-200 p-3 rounded-full print:bg-green-200">
            <BookOpen className="w-6 h-6 text-green-700 print:w-5 print:h-5" />
          </div>
          <div>
            <div className="text-xs text-gray-600 mb-1 print:text-xs print:font-medium print:text-gray-700 uppercase">TOTAL COURSES</div>
            <div className="font-bold text-2xl text-gray-900 print:text-xl print:text-gray-900">{totalCourses}</div>
          </div>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg print:bg-orange-50 print:p-3 print:rounded flex items-center gap-3">
          <div className="bg-orange-200 p-3 rounded-full print:bg-orange-200">
            <Clock className="w-6 h-6 text-orange-700 print:w-5 print:h-5" />
          </div>
          <div>
            <div className="text-xs text-gray-600 mb-1 print:text-xs print:font-medium print:text-gray-700 uppercase">TOTAL HOURS</div>
            <div className="font-bold text-2xl text-gray-900 print:text-xl print:text-gray-900">{totalHoursDecimal.toFixed(1)}</div>
          </div>
        </div>
      </div>

      {/* Class Sections - Grid Layout */}
      {data.entries.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 print:mb-5 print:grid-cols-2 print:gap-3">
          {Object.entries(groupedByClass).map(([classId, entries]) => {
            const firstEntry = entries[0]
            const classInfo = firstEntry.timetable.class
            const studyMode = firstEntry.timetable.studyMode || 'FULL_TIME'
            
            // Sort entries by time
            const sortedEntries = [...entries].sort((a, b) => {
              return a.shiftTemplate.startTime.localeCompare(b.shiftTemplate.startTime)
            })

            return (
              <div key={classId} className="bg-gray-50 rounded-lg shadow-sm border border-gray-200 p-4 print:bg-gray-50 print:rounded print:shadow-none print:border print:border-gray-300 print:p-3">
                {/* Class Header */}
                <div className="flex items-center justify-between mb-3 print:mb-2 pb-2 border-b border-gray-300 print:border-b print:border-gray-400">
                  <div>
                    <h4 className="font-bold text-lg text-gray-900 print:text-base print:font-bold">{classInfo?.classTitle || 'N/A'}</h4>
                    <p className="text-xs text-gray-600 print:text-xs print:text-gray-700">
                      MODE: {studyMode === 'FULL_TIME' ? 'FULL-TIME' : 'PART-TIME'} • SEMESTER {data.semester?.name?.match(/\d+/)?.[0] || 'N/A'}
                    </p>
                  </div>
                  <Grid className="w-5 h-5 text-gray-400 print:w-4 print:h-4" />
                </div>

                {/* Class Timetable Table */}
                <div className="overflow-x-auto print:overflow-visible">
                  <table className="w-full text-sm print:text-xs">
                    <thead>
                      <tr className="bg-gray-200 print:bg-gray-200">
                        <th className="px-2 py-1.5 text-left font-semibold text-gray-900 print:px-1.5 print:py-1 print:text-xs print:font-bold">TIME</th>
                        <th className="px-2 py-1.5 text-left font-semibold text-gray-900 print:px-1.5 print:py-1 print:text-xs print:font-bold">COURSE NAME</th>
                        <th className="px-2 py-1.5 text-left font-semibold text-gray-900 print:px-1.5 print:py-1 print:text-xs print:font-bold">LECTURER</th>
                        <th className="px-2 py-1.5 text-left font-semibold text-gray-900 print:px-1.5 print:py-1 print:text-xs print:font-bold">DEPT.</th>
                        <th className="px-2 py-1.5 text-left font-semibold text-gray-900 print:px-1.5 print:py-1 print:text-xs print:font-bold">ROOM</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedEntries.map((entry: any) => (
                        <tr key={entry.id} className="border-b border-gray-200 print:border-b print:border-gray-300">
                          <td className="px-2 py-2 text-gray-700 print:px-1.5 print:py-1.5 print:text-xs">
                            {formatTime12Hour(entry.shiftTemplate.startTime)} - {formatTime12Hour(entry.shiftTemplate.endTime)}
                          </td>
                          <td className="px-2 py-2 text-gray-700 print:px-1.5 print:py-1.5 print:text-xs">
                            {getCourseNameOnly(entry.courseName)}
                          </td>
                          <td className="px-2 py-2 text-gray-700 print:px-1.5 print:py-1.5 print:text-xs">
                            {entry.lecturerName}
                          </td>
                          <td className="px-2 py-2 text-gray-700 print:px-1.5 print:py-1.5 print:text-xs">
                            {entry.timetable.department?.name?.substring(0, 10) || 'N/A'}
                          </td>
                          <td className="px-2 py-2 text-gray-700 print:px-1.5 print:py-1.5 print:text-xs">
                            {entry.timetable.class?.room || entry.room || 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Class Rep Footer */}
                <div className="mt-3 pt-2 border-t border-gray-300 print:mt-2 print:pt-1.5 print:border-t print:border-gray-400">
                  <p className="text-xs text-gray-600 print:text-xs print:text-gray-700">Class Rep: <span className="font-semibold">TBD</span></p>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center print:bg-yellow-50 print:border print:border-yellow-300">
          <p className="text-yellow-800 font-medium print:text-yellow-900">
            {data.classId 
              ? 'Selected class has no lectures in this shift.'
              : 'No lectures found for the selected Day and Shift.'}
          </p>
        </div>
      )}

    </div>
  )
}
