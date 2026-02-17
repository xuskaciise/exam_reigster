'use client'

import { useState, useEffect, useRef } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'
import { FileText, Download, Printer, Search, ChevronDown, Image as ImageIcon, CalendarDays } from 'lucide-react'
import { DayOfWeek } from '@prisma/client'

// Day order: Saturday → Friday
const DAY_ORDER: DayOfWeek[] = ['SATURDAY', 'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']

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
  day: DayOfWeek
  shiftTemplateId: string | null
  departmentId: string | null
  classId: string | null
}

export default function ShiftTimetableReportPage() {
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
    // Validate required filters (only Academic Year, Semester/Session, and Day are required)
    if (!filters.academicYearId || !filters.semesterId || !filters.day) {
      alert('Please select Academic Year, Semester/Session, and Day')
      return
    }

    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        academicYearId: filters.academicYearId,
        semesterId: filters.semesterId,
        day: filters.day,
      })

      // Add optional filters only if selected
      if (filters.shiftTemplateId) {
        params.append('shiftTemplateId', filters.shiftTemplateId)
      }
      if (filters.departmentId) {
        params.append('departmentId', filters.departmentId)
      }
      if (filters.classId) {
        params.append('classId', filters.classId)
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
      entry.room || 'N/A',
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

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 print:hidden">
          <CalendarDays className="w-8 h-8 text-green-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Shift Timetable Report</h1>
            <p className="text-gray-600">Generate reports by Day, Shift, and optional Class</p>
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

            {/* Day */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">DAY *</label>
              <div className="relative" ref={dayRef}>
                <div className="relative">
                  <input
                    type="text"
                    value={filters.day ? DAY_LABELS[filters.day] : ''}
                    readOnly
                    onFocus={() => setIsDayOpen(true)}
                    placeholder="Select Day"
                    className="w-full px-4 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 cursor-pointer"
                  />
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                {isDayOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg overflow-hidden">
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

            {/* Shift */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">SHIFT (Optional)</label>
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
                    placeholder="Search Shift (Leave empty for all shifts)"
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

            {/* Department (Optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">DEPARTMENT (Optional)</label>
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

            {/* Class (Optional) */}
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
  return (
    <div className="print:p-0 print:w-full print:max-w-none print:m-0 print:block">
      {/* Header */}
      <div className="bg-blue-900 text-white p-6 mb-5 print:bg-blue-900 print:text-white print:p-5 print:mb-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-1 print:text-xl print:font-bold print:text-white">Somali International University</h1>
          <h2 className="text-lg mb-2 print:text-base print:text-white print:mb-1">Faculty of Engineering and Computer Science</h2>
          <h3 className="text-xl font-semibold print:text-lg print:font-semibold print:text-white">Shift Timetable Report</h3>
        </div>
      </div>

      {/* Report Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 mb-5 print:mb-4 print:grid-cols-5 print:gap-2">
        <div className="bg-blue-50 p-3 rounded print:bg-blue-50 print:p-2 print:rounded">
          <div className="text-xs text-gray-600 mb-1 print:text-xs print:font-medium print:text-gray-700 uppercase">DAY</div>
          <div className="font-semibold text-gray-900 text-sm print:text-sm print:text-gray-900">{DAY_LABELS[data.day]}</div>
        </div>
        <div className="bg-purple-50 p-3 rounded print:bg-purple-50 print:p-2 print:rounded">
          <div className="text-xs text-gray-600 mb-1 print:text-xs print:font-medium print:text-gray-700 uppercase">SHIFT</div>
          <div className="font-semibold text-gray-900 text-sm print:text-sm print:text-gray-900">{data.shiftTemplate?.name || 'All Shifts'}</div>
        </div>
        <div className="bg-green-50 p-3 rounded print:bg-green-50 print:p-2 print:rounded">
          <div className="text-xs text-gray-600 mb-1 print:text-xs print:font-medium print:text-gray-700 uppercase">DEPARTMENT</div>
          <div className="font-semibold text-gray-900 text-sm print:text-sm print:text-gray-900">{data.department?.name || 'All Departments'}</div>
        </div>
        <div className="bg-yellow-50 p-3 rounded print:bg-yellow-50 print:p-2 print:rounded">
          <div className="text-xs text-gray-600 mb-1 print:text-xs print:font-medium print:text-gray-700 uppercase">ACADEMIC YEAR</div>
          <div className="font-semibold text-gray-900 text-sm print:text-sm print:text-gray-900">{data.semester?.academicYear?.name || 'N/A'}</div>
        </div>
        <div className="bg-orange-50 p-3 rounded print:bg-orange-50 print:p-2 print:rounded">
          <div className="text-xs text-gray-600 mb-1 print:text-xs print:font-medium print:text-gray-700 uppercase">SEMESTER</div>
          <div className="font-semibold text-gray-900 text-sm print:text-sm print:text-gray-900">{data.semester?.name || 'N/A'}</div>
        </div>
      </div>

      {/* Table */}
      {data.entries.length > 0 ? (
        <div className="overflow-x-auto print:overflow-visible print:block print:w-full">
          <table className="w-full border-collapse border border-gray-300 print:border-collapse print:border print:border-gray-400">
            <thead>
              <tr className="bg-gray-100 print:bg-gray-100">
                <th className="border border-gray-300 px-3 py-2 text-left text-xs font-semibold text-gray-900 print:border-gray-400 print:px-2 print:py-1.5 print:text-xs print:font-bold">Class</th>
                <th className="border border-gray-300 px-3 py-2 text-left text-xs font-semibold text-gray-900 print:border-gray-400 print:px-2 print:py-1.5 print:text-xs print:font-bold">Course Name</th>
                <th className="border border-gray-300 px-3 py-2 text-left text-xs font-semibold text-gray-900 print:border-gray-400 print:px-2 print:py-1.5 print:text-xs print:font-bold">Lecturer</th>
                <th className="border border-gray-300 px-3 py-2 text-left text-xs font-semibold text-gray-900 print:border-gray-400 print:px-2 print:py-1.5 print:text-xs print:font-bold">Department</th>
                <th className="border border-gray-300 px-3 py-2 text-left text-xs font-semibold text-gray-900 print:border-gray-400 print:px-2 print:py-1.5 print:text-xs print:font-bold">Room</th>
                <th className="border border-gray-300 px-3 py-2 text-left text-xs font-semibold text-gray-900 print:border-gray-400 print:px-2 print:py-1.5 print:text-xs print:font-bold">Time</th>
              </tr>
            </thead>
            <tbody>
              {data.entries.map((entry: any) => (
                <tr key={entry.id} className="hover:bg-gray-50 print:hover:bg-white">
                  <td className="border border-gray-300 px-3 py-2 text-gray-700 text-sm print:border-gray-400 print:px-2 print:py-1.5 print:text-xs">
                    {entry.timetable.class?.classTitle || 'N/A'}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-gray-700 text-sm print:border-gray-400 print:px-2 print:py-1.5 print:text-xs">
                    {getCourseNameOnly(entry.courseName)}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-gray-700 text-sm print:border-gray-400 print:px-2 print:py-1.5 print:text-xs">
                    {entry.lecturerName}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-gray-700 text-sm print:border-gray-400 print:px-2 print:py-1.5 print:text-xs">
                    {entry.timetable.department?.name || 'N/A'}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-gray-700 text-sm print:border-gray-400 print:px-2 print:py-1.5 print:text-xs">
                    {entry.room || 'N/A'}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-gray-700 text-sm print:border-gray-400 print:px-2 print:py-1.5 print:text-xs">
                    {formatTime12Hour(entry.shiftTemplate.startTime)} - {formatTime12Hour(entry.shiftTemplate.endTime)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
          <p className="text-yellow-800 font-medium">
            {data.classId 
              ? 'Selected class has no lectures in this shift.'
              : 'No lectures found for the selected Day and Shift.'}
          </p>
        </div>
      )}

      {/* Footer Summary */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 print:mt-4 print:grid-cols-3 print:gap-3">
        <div className="bg-gray-50 p-4 rounded print:bg-gray-50 print:p-3 print:rounded">
          <div className="text-xs text-gray-600 mb-1 print:text-xs print:font-medium print:text-gray-700 uppercase">Total Classes</div>
          <div className="font-bold text-lg text-gray-900 print:text-base print:text-gray-900">{data.summary.totalClasses}</div>
        </div>
        <div className="bg-gray-50 p-4 rounded print:bg-gray-50 print:p-3 print:rounded">
          <div className="text-xs text-gray-600 mb-1 print:text-xs print:font-medium print:text-gray-700 uppercase">Total Lectures</div>
          <div className="font-bold text-lg text-gray-900 print:text-base print:text-gray-900">{data.summary.totalLectures}</div>
        </div>
        <div className="bg-gray-50 p-4 rounded print:bg-gray-50 print:p-3 print:rounded">
          <div className="text-xs text-gray-600 mb-1 print:text-xs print:font-medium print:text-gray-700 uppercase">Total Hours</div>
          <div className="font-bold text-lg text-gray-900 print:text-base print:text-gray-900">
            {data.summary.totalHours}h {data.summary.totalMinutes > 0 ? `${data.summary.totalMinutes}m` : ''}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 pt-3 border-t border-gray-300 print:mt-4 print:border-t print:border-gray-400 print:pt-2">
        <div className="text-xs text-gray-600 print:text-black print:text-xs">
          <p>Generated: {new Date().toLocaleString()}</p>
          <p className="mt-0.5">SIU FECT Timetable Management System</p>
        </div>
      </div>
    </div>
  )
}
