'use client'

import { useState, useEffect, useRef } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'
import { FileText, Download, Printer, Calendar, Building2, Users, User, Clock, BookOpen, Search, ChevronDown, Image as ImageIcon } from 'lucide-react'
import { Shift, DayOfWeek } from '@prisma/client'

interface Timetable {
  id: string
  semesterId: string
  departmentId: string
  classId: string | null
  studyMode: Shift
  semester: {
    id: string
    name: string
    academicYear: {
      id: string
      name: string
    }
  }
  department: {
    id: string
    name: string
  }
  class: {
    id: string
    classTitle: string
  } | null
  entries: TimetableEntry[]
}

interface TimetableEntry {
  id: string
  dayOfWeek: DayOfWeek
  shiftTemplateId: string
  courseName: string
  lecturerName: string
  room: string | null
  entryType: string
  shiftTemplate: {
    id: string
    name: string
    startTime: string
    endTime: string
  }
}

// Day order: Saturday → Friday
const DAY_ORDER: DayOfWeek[] = ['SATURDAY', 'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']

// Convert 24-hour format to 12-hour format (e.g., "13:00" -> "1:00 PM")
function formatTime12Hour(time24: string): string {
  const [hours, minutes] = time24.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`
}

// Extract course name only (remove course code if present)
// Format: "CODE - Title" -> "Title"
function getCourseNameOnly(courseName: string): string {
  // If courseName contains " - ", extract only the title part
  if (courseName.includes(' - ')) {
    const parts = courseName.split(' - ')
    // Return everything after " - " (the title)
    return parts.slice(1).join(' - ').trim()
  }
  // If no " - " found, return as is
  return courseName.trim()
}

export default function TimetableReportsPage() {
  const [reportType, setReportType] = useState<'lecturer' | 'class'>('lecturer')
  
  // Filters
  const [academicYears, setAcademicYears] = useState<any[]>([])
  const [semesters, setSemesters] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [lecturers, setLecturers] = useState<any[]>([])
  
  const [filters, setFilters] = useState({
    academicYearId: '',
    semesterId: '',
    departmentId: '',
    studyMode: 'FULL_TIME' as Shift,
    lecturerId: '',
    classId: ''
  })

  const [timetables, setTimetables] = useState<Timetable[]>([])
  const [reportData, setReportData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [classDescription, setClassDescription] = useState('')

  // Searchable dropdown states
  const [isAcademicYearOpen, setIsAcademicYearOpen] = useState(false)
  const [academicYearSearch, setAcademicYearSearch] = useState('')
  const academicYearRef = useRef<HTMLDivElement>(null)

  const [isSemesterOpen, setIsSemesterOpen] = useState(false)
  const [semesterSearch, setSemesterSearch] = useState('')
  const semesterRef = useRef<HTMLDivElement>(null)

  const [isDepartmentOpen, setIsDepartmentOpen] = useState(false)
  const [departmentSearch, setDepartmentSearch] = useState('')
  const departmentRef = useRef<HTMLDivElement>(null)

  const [isStudyModeOpen, setIsStudyModeOpen] = useState(false)
  const studyModeRef = useRef<HTMLDivElement>(null)

  const [isLecturerOpen, setIsLecturerOpen] = useState(false)
  const [lecturerSearch, setLecturerSearch] = useState('')
  const lecturerRef = useRef<HTMLDivElement>(null)

  const [isClassOpen, setIsClassOpen] = useState(false)
  const [classSearch, setClassSearch] = useState('')
  const classRef = useRef<HTMLDivElement>(null)

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (academicYearRef.current && !academicYearRef.current.contains(event.target as Node)) {
        setIsAcademicYearOpen(false)
      }
      if (semesterRef.current && !semesterRef.current.contains(event.target as Node)) {
        setIsSemesterOpen(false)
      }
      if (departmentRef.current && !departmentRef.current.contains(event.target as Node)) {
        setIsDepartmentOpen(false)
      }
      if (studyModeRef.current && !studyModeRef.current.contains(event.target as Node)) {
        setIsStudyModeOpen(false)
      }
      if (lecturerRef.current && !lecturerRef.current.contains(event.target as Node)) {
        setIsLecturerOpen(false)
      }
      if (classRef.current && !classRef.current.contains(event.target as Node)) {
        setIsClassOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  useEffect(() => {
    fetchInitialData()
  }, [])

  useEffect(() => {
    if (filters.academicYearId) {
      fetchSemesters()
      setSemesterSearch('')
      setIsSemesterOpen(false)
    }
  }, [filters.academicYearId])

  useEffect(() => {
    if (filters.departmentId) {
      fetchLecturers()
      fetchClasses()
      setLecturerSearch('')
      setClassSearch('')
      setIsLecturerOpen(false)
      setIsClassOpen(false)
    }
  }, [filters.departmentId])

  const fetchInitialData = async () => {
    try {
      const [yearsRes, deptsRes] = await Promise.all([
        fetch('/api/academic-years'),
        fetch('/api/departments')
      ])

      if (yearsRes.ok) {
        const yearsData = await yearsRes.json()
        setAcademicYears(yearsData)
        if (yearsData.length > 0) {
          setFilters(prev => ({ ...prev, academicYearId: yearsData[0].id }))
        }
      }

      if (deptsRes.ok) {
        const deptsData = await deptsRes.json()
        setDepartments(deptsData)
        if (deptsData.length > 0) {
          setFilters(prev => ({ ...prev, departmentId: deptsData[0].id }))
        }
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
        if (data.length > 0) {
          setFilters(prev => ({ ...prev, semesterId: data[0].id }))
        }
      }
    } catch (error) {
      console.error('Error fetching semesters:', error)
    }
  }

  const fetchLecturers = async () => {
    try {
      const response = await fetch(`/api/lecturers`)
      if (response.ok) {
        const data = await response.json()
        setLecturers(data)
      }
    } catch (error) {
      console.error('Error fetching lecturers:', error)
    }
  }

  const fetchClasses = async () => {
    try {
      const response = await fetch('/api/classes')
      if (response.ok) {
        const data = await response.json()
        const filtered = filters.departmentId 
          ? data.filter((c: any) => c.departmentId === filters.departmentId)
          : data
        setClasses(filtered)
      }
    } catch (error) {
      console.error('Error fetching classes:', error)
    }
  }

  const generateReport = async () => {
    // Validation based on report type
    if (!filters.semesterId || !filters.studyMode) {
      alert('Please select Academic Year, Semester/Session, and Study Mode')
      return
    }

    if (reportType === 'lecturer') {
      if (!filters.lecturerId) {
        alert('Please select a Lecturer')
        return
      }
    } else {
      // For class reports, department is required
      if (!filters.departmentId) {
        alert('Please select Department')
        return
      }
      if (!filters.classId) {
        alert('Please select a Class')
        return
      }
    }

    setIsLoading(true)
    try {
      // For lecturer reports: fetch ALL timetables (no department filter)
      // For class reports: fetch timetables with department filter
      const params = new URLSearchParams({
        semesterId: filters.semesterId,
        studyMode: filters.studyMode
      })
      
      if (reportType === 'class') {
        // Class reports require department filter
        params.append('departmentId', filters.departmentId)
        if (filters.classId) {
          params.append('classId', filters.classId)
        }
      }
      // Note: For lecturer reports, we intentionally omit departmentId to get ALL departments

      const response = await fetch(`/api/timetables?${params}`)
      if (response.ok) {
        const data = await response.json()
        setTimetables(data)

        // Process data based on report type
        if (reportType === 'lecturer') {
          processLecturerReport(data)
        } else {
          processClassReport(data)
        }
      } else {
        alert('Failed to fetch timetable data')
      }
    } catch (error) {
      console.error('Error generating report:', error)
      alert('Failed to generate report')
    } finally {
      setIsLoading(false)
    }
  }

  const processLecturerReport = (timetables: Timetable[]) => {
    const selectedLecturer = lecturers.find(l => l.id === filters.lecturerId)
    if (!selectedLecturer) return

    // Collect all entries for the selected lecturer across ALL timetables (all departments)
    const lecturerEntries: any[] = []
    
    timetables.forEach(timetable => {
      timetable.entries.forEach(entry => {
        if (entry.lecturerName === selectedLecturer.fullName) {
          lecturerEntries.push({
            ...entry,
            class: timetable.class,
            semester: timetable.semester,
            department: timetable.department // Include department info for each entry
          })
        }
      })
    })

    // Group by day and sort by time
    const groupedByDay: Record<string, any[]> = {}
    DAY_ORDER.forEach(day => {
      groupedByDay[day] = []
    })

    lecturerEntries.forEach(entry => {
      if (groupedByDay[entry.dayOfWeek]) {
        groupedByDay[entry.dayOfWeek].push(entry)
      }
    })

    // Sort each day's entries by time
    Object.keys(groupedByDay).forEach(day => {
      groupedByDay[day].sort((a, b) => {
        const timeA = a.shiftTemplate.startTime
        const timeB = b.shiftTemplate.startTime
        return timeA.localeCompare(timeB)
      })
    })

    setReportData({
      type: 'lecturer',
      lecturer: selectedLecturer,
      academicYear: academicYears.find(y => y.id === filters.academicYearId),
      semester: semesters.find(s => s.id === filters.semesterId),
      studyMode: filters.studyMode,
      entries: groupedByDay
    })
  }

  const processClassReport = (timetables: Timetable[]) => {
    const selectedClass = classes.find(c => c.id === filters.classId)
    if (!selectedClass) return

    // Find timetable for the selected class
    const timetable = timetables.find(t => t.classId === filters.classId)
    if (!timetable) {
      alert('No timetable found for the selected class')
      return
    }

    // Group entries by day
    const groupedByDay: Record<string, any[]> = {}
    DAY_ORDER.forEach(day => {
      groupedByDay[day] = []
    })

    timetable.entries.forEach(entry => {
      if (groupedByDay[entry.dayOfWeek]) {
        groupedByDay[entry.dayOfWeek].push(entry)
      }
    })

    // Sort each day's entries by time
    Object.keys(groupedByDay).forEach(day => {
      groupedByDay[day].sort((a, b) => {
        const timeA = a.shiftTemplate.startTime
        const timeB = b.shiftTemplate.startTime
        return timeA.localeCompare(timeB)
      })
    })

    setReportData({
      type: 'class',
      class: selectedClass,
      department: departments.find(d => d.id === filters.departmentId),
      semester: timetable.semester,
      studyMode: filters.studyMode,
      description: classDescription,
      entries: groupedByDay
    })
  }

  const exportToPDF = () => {
    window.print()
  }

  const exportToImage = async () => {
    if (!reportData) return

    // Ensure we're on the client side
    if (typeof window === 'undefined') {
      alert('This feature is only available in the browser')
      return
    }

    // Try export container first, fallback to visible report
    let exportElement = document.getElementById('report-export')
    let useVisibleReport = false

    if (!exportElement) {
      // Fallback: use visible report content
      exportElement = document.getElementById('timetable-report-content')
      useVisibleReport = true
      
      if (!exportElement) {
        alert('Report content not found')
        return
      }
    }

    try {
      // Store original styles
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
        
        // Make element fully visible and in viewport for capture
        exportElement.style.position = 'fixed'
        exportElement.style.top = '0'
        exportElement.style.left = '0'
        exportElement.style.opacity = '1'
        exportElement.style.zIndex = '999999'
        exportElement.style.pointerEvents = 'none'
        exportElement.style.visibility = 'visible'
        exportElement.style.width = '1200px'
      } else {
        // For visible report, temporarily adjust width
        originalStyles.width = exportElement.style.width
        originalStyles.maxWidth = exportElement.style.maxWidth
        exportElement.style.width = '1200px'
        exportElement.style.maxWidth = '1200px'
      }
      
      // Force reflow to ensure styles are applied
      exportElement.offsetHeight
      
      // Wait for layout to be calculated and images to load
      await new Promise(resolve => setTimeout(resolve, 500))

      // Check element dimensions and content
      const offsetHeight = exportElement.offsetHeight
      const scrollHeight = exportElement.scrollHeight
      const offsetWidth = exportElement.offsetWidth
      const scrollWidth = exportElement.scrollWidth
      
      // Check if there's actual content
      const hasContent = exportElement.querySelector('#lecturer-report-view, #class-report-view') || 
                        exportElement.querySelector('.bg-blue-900, table')
      
      console.log('Export element check:', {
        elementId: exportElement.id,
        offsetHeight,
        scrollHeight,
        offsetWidth,
        scrollWidth,
        hasContent: !!hasContent,
        childrenCount: exportElement.children.length,
      })

      if (scrollHeight === 0 || offsetHeight === 0) {
        // Restore original styles
        if (!useVisibleReport) {
          Object.assign(exportElement.style, originalStyles)
        } else {
          exportElement.style.width = originalStyles.width || ''
          exportElement.style.maxWidth = originalStyles.maxWidth || ''
        }
        alert('Report content has no height. Please try again.')
        return
      }

      // Dynamically import html-to-image (client-side only)
      const { toPng } = await import('html-to-image')

      // Export as PNG with high quality
      const dataUrl = await toPng(exportElement, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        quality: 1.0,
        cacheBust: true,
        useCORS: true,
      })

      // Restore original styles
      if (!useVisibleReport) {
        Object.assign(exportElement.style, originalStyles)
      } else {
        exportElement.style.width = originalStyles.width || ''
        exportElement.style.maxWidth = originalStyles.maxWidth || ''
      }

      // Create download link
      const link = document.createElement('a')
      link.setAttribute('href', dataUrl)
      const fileName = reportData.type === 'lecturer' 
        ? `Lecturer_Timetable_${reportData.lecturer.fullName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.png`
        : `Class_Timetable_${reportData.class.classTitle.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.png`
      link.setAttribute('download', fileName)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Error exporting to image:', error)
      alert('Failed to export image: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const exportToExcel = () => {
    if (!reportData) return

    let csvContent = ''
    
    if (reportData.type === 'lecturer') {
      csvContent = 'Day,Time,Course Name,Class,Department,Semester/Session\n'
      DAY_ORDER.forEach(day => {
        const dayName = day.charAt(0) + day.slice(1).toLowerCase()
        if (reportData.entries[day] && reportData.entries[day].length > 0) {
          reportData.entries[day].forEach((entry: any) => {
            const time = `${formatTime12Hour(entry.shiftTemplate.startTime)} - ${formatTime12Hour(entry.shiftTemplate.endTime)}`
            const courseNameOnly = getCourseNameOnly(entry.courseName)
            const className = entry.class ? entry.class.classTitle : 'N/A'
            const departmentName = entry.department ? entry.department.name : 'N/A'
            csvContent += `${dayName},${time},"${courseNameOnly}",${className},${departmentName},${entry.semester.name}\n`
          })
        } else {
          csvContent += `${dayName},,,,\n`
        }
      })
    } else {
      csvContent = 'Day,Time,Course Name,Lecturer Name\n'
      DAY_ORDER.forEach(day => {
        const dayName = day.charAt(0) + day.slice(1).toLowerCase()
        if (reportData.entries[day] && reportData.entries[day].length > 0) {
          reportData.entries[day].forEach((entry: any) => {
            const time = `${formatTime12Hour(entry.shiftTemplate.startTime)} - ${formatTime12Hour(entry.shiftTemplate.endTime)}`
            const courseNameOnly = getCourseNameOnly(entry.courseName)
            csvContent += `${dayName},${time},"${courseNameOnly}","${entry.lecturerName}"\n`
          })
        } else {
          csvContent += `${dayName},,,\n`
        }
      })
    }

    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    const fileName = reportData.type === 'lecturer' 
      ? `Lecturer_Timetable_${reportData.lecturer.fullName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`
      : `Class_Timetable_${reportData.class.classTitle.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`
    link.setAttribute('download', fileName)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <AdminLayout>
      <div className="space-y-6 print:hidden" id="timetable-reports-container">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Timetable Reports</h1>
            <p className="text-gray-600 mt-1">Generate printable timetable reports by lecturer or class.</p>
          </div>
        </div>

        {/* Report Configuration */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Report Configuration</h2>
          
          {/* Report Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">Report Type</label>
            <div className="grid grid-cols-2 gap-4">
              <label className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                reportType === 'lecturer' 
                  ? 'border-green-600 bg-green-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}>
                  <input
                  type="radio"
                  name="reportType"
                  value="lecturer"
                  checked={reportType === 'lecturer'}
                  onChange={(e) => {
                    setReportType(e.target.value as 'lecturer')
                    // Clear department filter when switching to lecturer report
                    setFilters(prev => ({ ...prev, departmentId: '', lecturerId: '', classId: '' }))
                    setReportData(null)
                  }}
                  className="sr-only"
                />
                <div className="flex items-center gap-3">
                  <User className="w-6 h-6 text-gray-600" />
                  <div>
                    <div className="font-medium text-gray-900">By Lecturer</div>
                    <div className="text-sm text-gray-600">View individual faculty schedules</div>
                  </div>
                </div>
              </label>
              <label className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                reportType === 'class' 
                  ? 'border-green-600 bg-green-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}>
                  <input
                  type="radio"
                  name="reportType"
                  value="class"
                  checked={reportType === 'class'}
                  onChange={(e) => {
                    setReportType(e.target.value as 'class')
                    // Clear lecturer filter when switching to class report
                    setFilters(prev => ({ ...prev, lecturerId: '', classId: '' }))
                    setReportData(null)
                    setClassDescription('')
                  }}
                  className="sr-only"
                />
                <div className="flex items-center gap-3">
                  <Users className="w-6 h-6 text-gray-600" />
                  <div>
                    <div className="font-medium text-gray-900">By Class</div>
                    <div className="text-sm text-gray-600">View departmental class batches</div>
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {/* Academic Year - Searchable */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ACADEMIC YEAR</label>
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

            {/* Semester / Session - Searchable */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">SEMESTER / SESSION</label>
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
                {isSemesterOpen && !filters.academicYearId && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4">
                    <p className="text-sm text-gray-500">Please select Academic Year first</p>
                  </div>
                )}
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

            {/* Department - Searchable (Hidden for Lecturer reports) */}
            {reportType === 'class' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">DEPARTMENT</label>
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
                      placeholder="Search Department"
                      className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                    />
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
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
                        {departments
                          .filter(d => !departmentSearch || d.name.toLowerCase().includes(departmentSearch.toLowerCase()))
                          .map(dept => (
                            <button
                              key={dept.id}
                              type="button"
                              onClick={() => {
                                setFilters({ ...filters, departmentId: dept.id })
                                setIsDepartmentOpen(false)
                                setDepartmentSearch('')
                              }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors"
                            >
                              {dept.name}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            {reportType === 'lecturer' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">DEPARTMENT</label>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-xs text-gray-600">
                    Department filter is disabled because lecturers may teach across multiple departments.
                  </p>
                </div>
              </div>
            )}

            {/* Study Mode - Searchable */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">STUDY MODE</label>
              <div className="relative" ref={studyModeRef}>
                <div className="relative">
                  <input
                    type="text"
                    value={filters.studyMode === 'FULL_TIME' ? 'Full-time (Regular)' : 'Part-time'}
                    readOnly
                    onFocus={() => setIsStudyModeOpen(true)}
                    className="w-full px-4 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 cursor-pointer"
                  />
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                {isStudyModeOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => {
                        setFilters({ ...filters, studyMode: 'FULL_TIME' })
                        setIsStudyModeOpen(false)
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors"
                    >
                      Full-time (Regular)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFilters({ ...filters, studyMode: 'PART_TIME' })
                        setIsStudyModeOpen(false)
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors"
                    >
                      Part-time
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Lecturer or Class - Searchable */}
            {reportType === 'lecturer' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">LECTURER</label>
                <div className="relative" ref={lecturerRef}>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={lecturers.find(l => l.id === filters.lecturerId)?.fullName || lecturerSearch}
                      onChange={(e) => {
                        setLecturerSearch(e.target.value)
                        setIsLecturerOpen(true)
                      }}
                      onFocus={() => setIsLecturerOpen(true)}
                      placeholder="Search Lecturer"
                      className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                    />
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                  {isLecturerOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
                      <div className="p-2 border-b border-gray-200">
                        <div className="flex items-center gap-2">
                          <Search className="w-4 h-4 text-gray-400" />
                          <input
                            type="text"
                            value={lecturerSearch}
                            onChange={(e) => setLecturerSearch(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            placeholder="Search Lecturer"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-600 text-sm"
                            autoFocus
                          />
                        </div>
                      </div>
                      <div className="overflow-y-auto max-h-48">
                        {lecturers
                          .filter(l => !lecturerSearch || l.fullName.toLowerCase().includes(lecturerSearch.toLowerCase()))
                          .map(lecturer => (
                            <button
                              key={lecturer.id}
                              type="button"
                              onClick={() => {
                                setFilters({ ...filters, lecturerId: lecturer.id })
                                setIsLecturerOpen(false)
                                setLecturerSearch('')
                              }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors"
                            >
                              {lecturer.fullName}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">CLASS</label>
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
                      placeholder="Search Class"
                      disabled={!filters.departmentId}
                      className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                  {isClassOpen && !filters.departmentId && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4">
                      <p className="text-sm text-gray-500">Please select Department first</p>
                    </div>
                  )}
                  {isClassOpen && filters.departmentId && (
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

          {/* Description Field (Only for Class Reports) */}
          {reportType === 'class' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">DESCRIPTION (Optional)</label>
              <textarea
                value={classDescription}
                onChange={(e) => setClassDescription(e.target.value)}
                placeholder="Enter optional description for the class timetable report..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">This description will appear on the generated report.</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={generateReport}
              disabled={isLoading}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Generating...' : 'Generate Report'}
            </button>
            {reportData && (
              <>
                <button
                  onClick={exportToPDF}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  Export PDF
                </button>
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
              </>
            )}
          </div>
        </div>

        {/* Report Preview */}
        {reportData && (
          <>
            {/* Display Container (with styling) */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 print:shadow-none print:border-0 print:p-0 print:m-0 print:w-full print:max-w-none print:block print-only-report" id="timetable-report-content">
              {reportData.type === 'lecturer' ? (
                <LecturerReportView data={reportData} />
              ) : (
                <ClassReportView data={reportData} />
              )}
            </div>
            
            {/* Export Container (hidden but rendered, fixed width, no styling) */}
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
              {reportData.type === 'lecturer' ? (
                <LecturerReportView data={reportData} />
              ) : (
                <ClassReportView data={reportData} />
              )}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  )
}

// Lecturer Report Component
function LecturerReportView({ data }: { data: any }) {
  // Calculate total hours
  const calculateTotalHours = () => {
    let totalMinutes = 0
    
    DAY_ORDER.forEach(day => {
      const entries = data.entries[day] || []
      entries.forEach((entry: any) => {
        const startTime = entry.shiftTemplate.startTime
        const endTime = entry.shiftTemplate.endTime
        
        // Parse time strings (format: "HH:MM")
        const [startHours, startMins] = startTime.split(':').map(Number)
        const [endHours, endMins] = endTime.split(':').map(Number)
        
        const startTotalMinutes = startHours * 60 + startMins
        const endTotalMinutes = endHours * 60 + endMins
        
        totalMinutes += (endTotalMinutes - startTotalMinutes)
      })
    })
    
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    
    return { hours, minutes, totalMinutes }
  }
  
  const totalHours = calculateTotalHours()
  
  return (
    <div className="print:p-0 print:w-full print:max-w-none print:m-0 print:block" id="lecturer-report-view">
      {/* Header */}
      <div className="bg-blue-900 text-white p-6 mb-5 print:bg-blue-900 print:text-white print:p-5 print:mb-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-1 print:text-xl print:font-bold print:text-white">Somali International University</h1>
          <h2 className="text-lg mb-2 print:text-base print:text-white print:mb-1">Faculty of Engineering and Computer Science</h2>
          <h3 className="text-xl font-semibold print:text-lg print:font-semibold print:text-white">Lecturer Timetable Report</h3>
        </div>
      </div>

      {/* Lecturer Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 mb-5 print:mb-4 print:grid-cols-5 print:gap-2">
        <div className="bg-blue-50 p-3 rounded print:bg-blue-50 print:p-2 print:rounded">
          <div className="text-xs text-gray-600 mb-1 print:text-xs print:font-medium print:text-gray-700 uppercase">LECTURER NAME</div>
          <div className="font-semibold text-gray-900 text-sm print:text-sm print:text-gray-900">{data.lecturer.fullName}</div>
        </div>
        <div className="bg-purple-50 p-3 rounded print:bg-purple-50 print:p-2 print:rounded">
          <div className="text-xs text-gray-600 mb-1 print:text-xs print:font-medium print:text-gray-700 uppercase">ACADEMIC YEAR</div>
          <div className="font-semibold text-gray-900 text-sm print:text-sm print:text-gray-900">{data.academicYear?.name || 'N/A'}</div>
        </div>
        <div className="bg-yellow-50 p-3 rounded print:bg-yellow-50 print:p-2 print:rounded">
          <div className="text-xs text-gray-600 mb-1 print:text-xs print:font-medium print:text-gray-700 uppercase">SEMESTER / SESSION</div>
          <div className="font-semibold text-gray-900 text-sm print:text-sm print:text-gray-900">{data.semester?.name || 'N/A'}</div>
        </div>
        <div className="bg-orange-50 p-3 rounded print:bg-orange-50 print:p-2 print:rounded">
          <div className="text-xs text-gray-600 mb-1 print:text-xs print:font-medium print:text-gray-700 uppercase">STUDY MODE</div>
          <div className="font-semibold text-gray-900 text-sm print:text-sm print:text-gray-900">{data.studyMode === 'FULL_TIME' ? 'Full-time' : 'Part-time'}</div>
        </div>
        <div className="bg-green-50 p-3 rounded print:bg-green-50 print:p-2 print:rounded">
          <div className="text-xs text-gray-600 mb-1 print:text-xs print:font-medium print:text-gray-700 uppercase">TOTAL HOURS</div>
          <div className="font-semibold text-gray-900 text-sm print:text-sm print:text-gray-900">
            {totalHours.hours}h {totalHours.minutes > 0 ? `${totalHours.minutes}m` : ''}
          </div>
        </div>
      </div>

      {/* Timetable Table */}
      <div className="overflow-x-auto print:overflow-visible print:block print:w-full">
        <table className="w-full border-collapse border border-gray-300 print:border-collapse print:border print:border-gray-400">
          <thead>
            <tr className="bg-gray-100 print:bg-gray-100">
              <th className="border border-gray-300 px-3 py-2 text-left text-xs font-semibold text-gray-900 print:border-gray-400 print:px-2 print:py-1.5 print:text-xs print:font-bold">Day</th>
              <th className="border border-gray-300 px-3 py-2 text-left text-xs font-semibold text-gray-900 print:border-gray-400 print:px-2 print:py-1.5 print:text-xs print:font-bold">Time</th>
              <th className="border border-gray-300 px-3 py-2 text-left text-xs font-semibold text-gray-900 print:border-gray-400 print:px-2 print:py-1.5 print:text-xs print:font-bold">Course Name</th>
              <th className="border border-gray-300 px-3 py-2 text-left text-xs font-semibold text-gray-900 print:border-gray-400 print:px-2 print:py-1.5 print:text-xs print:font-bold">Class</th>
              <th className="border border-gray-300 px-3 py-2 text-left text-xs font-semibold text-gray-900 print:border-gray-400 print:px-2 print:py-1.5 print:text-xs print:font-bold">Department</th>
              <th className="border border-gray-300 px-3 py-2 text-left text-xs font-semibold text-gray-900 print:border-gray-400 print:px-2 print:py-1.5 print:text-xs print:font-bold">Session / Semester</th>
            </tr>
          </thead>
          <tbody>
            {DAY_ORDER.map(day => {
              const dayName = day.charAt(0) + day.slice(1).toLowerCase()
              const entries = data.entries[day] || []
              
              if (entries.length === 0) {
                return (
                  <tr key={day} className="hover:bg-gray-50 print:hover:bg-white">
                    <td className="border border-gray-300 px-3 py-2 font-medium text-gray-900 text-sm print:border-gray-400 print:px-2 print:py-1.5 print:text-xs">{dayName}</td>
                    <td className="border border-gray-300 px-3 py-2 text-gray-500 text-sm print:border-gray-400 print:px-2 print:py-1.5 print:text-xs">—</td>
                    <td className="border border-gray-300 px-3 py-2 text-gray-500 text-sm print:border-gray-400 print:px-2 print:py-1.5 print:text-xs">—</td>
                    <td className="border border-gray-300 px-3 py-2 text-gray-500 text-sm print:border-gray-400 print:px-2 print:py-1.5 print:text-xs">—</td>
                    <td className="border border-gray-300 px-3 py-2 text-gray-500 text-sm print:border-gray-400 print:px-2 print:py-1.5 print:text-xs">—</td>
                    <td className="border border-gray-300 px-3 py-2 text-gray-500 text-sm print:border-gray-400 print:px-2 print:py-1.5 print:text-xs">—</td>
                  </tr>
                )
              }

              return entries.map((entry: any, index: number) => (
                <tr key={`${day}-${index}`} className="hover:bg-gray-50 print:hover:bg-white">
                  {index === 0 && (
                    <td rowSpan={entries.length} className="border border-gray-300 px-3 py-2 font-medium text-gray-900 align-top text-sm print:border-gray-400 print:px-2 print:py-1.5 print:text-xs">
                      {dayName}
                    </td>
                  )}
                  <td className="border border-gray-300 px-3 py-2 text-gray-700 text-sm print:border-gray-400 print:px-2 print:py-1.5 print:text-xs">
                    {formatTime12Hour(entry.shiftTemplate.startTime)} - {formatTime12Hour(entry.shiftTemplate.endTime)}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-gray-700 text-sm print:border-gray-400 print:px-2 print:py-1.5 print:text-xs">{getCourseNameOnly(entry.courseName)}</td>
                  <td className="border border-gray-300 px-3 py-2 text-gray-700 text-sm print:border-gray-400 print:px-2 print:py-1.5 print:text-xs">
                    {entry.class ? entry.class.classTitle : 'N/A'}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-gray-700 text-sm print:border-gray-400 print:px-2 print:py-1.5 print:text-xs">
                    {entry.department ? entry.department.name : 'N/A'}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-gray-700 text-sm print:border-gray-400 print:px-2 print:py-1.5 print:text-xs">{entry.semester.name}</td>
                </tr>
              ))
            })}
          </tbody>
        </table>
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

// Class Report Component
function ClassReportView({ data }: { data: any }) {
  // Filter days based on study mode
  const getFilteredDays = () => {
    if (data.studyMode === 'FULL_TIME') {
      // Full-time: Saturday to Wednesday (exclude Thursday and Friday)
      return ['SATURDAY', 'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY'] as DayOfWeek[]
    } else {
      // Part-time: Only Thursday and Friday
      return ['THURSDAY', 'FRIDAY'] as DayOfWeek[]
    }
  }
  
  const filteredDays = getFilteredDays()
  
  return (
    <div className="print:p-0 print:w-full print:max-w-none print:m-0 print:block" id="class-report-view">
      {/* Header */}
      <div className="bg-blue-900 text-white p-6 mb-5 print:bg-blue-900 print:text-white print:p-5 print:mb-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-1 print:text-xl print:font-bold print:text-white">Somali International University</h1>
          <h2 className="text-lg mb-2 print:text-base print:text-white print:mb-1">Faculty of Engineering and Computer Science</h2>
          <h3 className="text-xl font-semibold print:text-lg print:font-semibold print:text-white">Class Timetable</h3>
        </div>
      </div>

      {/* Class Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-5 print:mb-4 print:grid-cols-4 print:gap-2">
        <div className="bg-blue-50 p-3 rounded print:bg-blue-50 print:p-2 print:rounded">
          <div className="text-xs text-gray-600 mb-1 print:text-xs print:font-medium print:text-gray-700 uppercase">CLASS NAME</div>
          <div className="font-semibold text-gray-900 text-sm print:text-sm print:text-gray-900">{data.class.classTitle}</div>
        </div>
        <div className="bg-green-50 p-3 rounded print:bg-green-50 print:p-2 print:rounded">
          <div className="text-xs text-gray-600 mb-1 print:text-xs print:font-medium print:text-gray-700 uppercase">DEPARTMENT</div>
          <div className="font-semibold text-gray-900 text-sm print:text-sm print:text-gray-900">{data.department?.name || 'N/A'}</div>
        </div>
        <div className="bg-purple-50 p-3 rounded print:bg-purple-50 print:p-2 print:rounded">
          <div className="text-xs text-gray-600 mb-1 print:text-xs print:font-medium print:text-gray-700 uppercase">SEMESTER</div>
          <div className="font-semibold text-gray-900 text-sm print:text-sm print:text-gray-900">{data.semester?.name || 'N/A'}</div>
        </div>
        <div className="bg-orange-50 p-3 rounded print:bg-orange-50 print:p-2 print:rounded">
          <div className="text-xs text-gray-600 mb-1 print:text-xs print:font-medium print:text-gray-700 uppercase">STUDY MODE</div>
          <div className="font-semibold text-gray-900 text-sm print:text-sm print:text-gray-900">{data.studyMode === 'FULL_TIME' ? 'Full-time' : 'Part-time'}</div>
        </div>
      </div>

      {/* Description (if provided) */}
      {data.description && data.description.trim() && (
        <div className="mb-5 p-3 bg-gray-50 border border-gray-200 rounded print:bg-gray-50 print:border print:border-gray-300 print:p-2 print:mb-4 print:rounded">
          <div className="text-xs font-medium text-gray-700 mb-1 print:text-xs print:font-semibold print:text-gray-900 uppercase">DESCRIPTION</div>
          <div className="text-sm text-gray-700 whitespace-pre-wrap print:text-sm print:text-gray-900">{data.description}</div>
        </div>
      )}

      {/* Timetable Table */}
      <div className="overflow-x-auto print:overflow-visible print:block print:w-full">
        <table className="w-full border-collapse border border-gray-300 print:border-collapse print:border print:border-gray-400">
          <thead>
            <tr className="bg-gray-100 print:bg-gray-100">
              <th className="border border-gray-300 px-3 py-2 text-left text-xs font-semibold text-gray-900 print:border-gray-400 print:px-2 print:py-1.5 print:text-xs print:font-bold">Day</th>
              <th className="border border-gray-300 px-3 py-2 text-left text-xs font-semibold text-gray-900 print:border-gray-400 print:px-2 print:py-1.5 print:text-xs print:font-bold">Time</th>
              <th className="border border-gray-300 px-3 py-2 text-left text-xs font-semibold text-gray-900 print:border-gray-400 print:px-2 print:py-1.5 print:text-xs print:font-bold">Course Name</th>
              <th className="border border-gray-300 px-3 py-2 text-left text-xs font-semibold text-gray-900 print:border-gray-400 print:px-2 print:py-1.5 print:text-xs print:font-bold">Lecturer Name</th>
            </tr>
          </thead>
          <tbody>
            {filteredDays.map(day => {
              const dayName = day.charAt(0) + day.slice(1).toLowerCase()
              const entries = data.entries[day] || []
              
              if (entries.length === 0) {
                return (
                  <tr key={day} className="hover:bg-gray-50 print:hover:bg-white">
                    <td className="border border-gray-300 px-3 py-2 font-medium text-gray-900 text-sm print:border-gray-400 print:px-2 print:py-1.5 print:text-xs">{dayName}</td>
                    <td className="border border-gray-300 px-3 py-2 text-gray-500 text-sm print:border-gray-400 print:px-2 print:py-1.5 print:text-xs">—</td>
                    <td className="border border-gray-300 px-3 py-2 text-gray-500 text-sm print:border-gray-400 print:px-2 print:py-1.5 print:text-xs">—</td>
                    <td className="border border-gray-300 px-3 py-2 text-gray-500 text-sm print:border-gray-400 print:px-2 print:py-1.5 print:text-xs">—</td>
                  </tr>
                )
              }

              return entries.map((entry: any, index: number) => (
                <tr key={`${day}-${index}`} className="hover:bg-gray-50 print:hover:bg-white">
                  {index === 0 && (
                    <td rowSpan={entries.length} className="border border-gray-300 px-3 py-2 font-medium text-gray-900 align-top text-sm print:border-gray-400 print:px-2 print:py-1.5 print:text-xs">
                      {dayName}
                    </td>
                  )}
                  <td className="border border-gray-300 px-3 py-2 text-gray-700 text-sm print:border-gray-400 print:px-2 print:py-1.5 print:text-xs">
                    {formatTime12Hour(entry.shiftTemplate.startTime)} - {formatTime12Hour(entry.shiftTemplate.endTime)}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-gray-700 text-sm print:border-gray-400 print:px-2 print:py-1.5 print:text-xs">{getCourseNameOnly(entry.courseName)}</td>
                  <td className="border border-gray-300 px-3 py-2 text-gray-700 text-sm print:border-gray-400 print:px-2 print:py-1.5 print:text-xs">{entry.lecturerName}</td>
                </tr>
              ))
            })}
          </tbody>
        </table>
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
