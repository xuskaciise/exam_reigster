'use client'

import { useState, useEffect, useRef } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'
import { Plus, Search, Calendar, Clock, BookOpen, User, MapPin, AlertTriangle, CheckCircle, Grid3x3, List, Copy, MoreVertical } from 'lucide-react'
import { Shift, DayOfWeek, TimetableEntryType } from '@prisma/client'

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
  entryType: TimetableEntryType
  shiftTemplate: {
    id: string
    name: string
    startTime: string
    endTime: string
  }
}

export default function TimetablesPage() {
  const [timetable, setTimetable] = useState<Timetable | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEntryModal, setShowEntryModal] = useState(false)
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null)

  // Filters
  const [academicYears, setAcademicYears] = useState<any[]>([])
  const [semesters, setSemesters] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [shiftTemplates, setShiftTemplates] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [lecturers, setLecturers] = useState<any[]>([])

  const [isCourseDropdownOpen, setIsCourseDropdownOpen] = useState(false)
  const [courseSearchQuery, setCourseSearchQuery] = useState('')
  const courseDropdownRef = useRef<HTMLDivElement>(null)

  const [isLecturerDropdownOpen, setIsLecturerDropdownOpen] = useState(false)
  const [lecturerSearchQuery, setLecturerSearchQuery] = useState('')
  const lecturerDropdownRef = useRef<HTMLDivElement>(null)

  const [showCreateCourseModal, setShowCreateCourseModal] = useState(false)
  const [showCreateLecturerModal, setShowCreateLecturerModal] = useState(false)
  const [newCourseData, setNewCourseData] = useState({ code: '', title: '' })
  const [newLecturerData, setNewLecturerData] = useState({ fullName: '', email: '', phone: '' })
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [showCopyModal, setShowCopyModal] = useState(false)
  const [copyFilters, setCopyFilters] = useState({
    semesterId: '',
    departmentId: '',
    classId: '',
    studyMode: 'FULL_TIME' as Shift
  })

  // Copy/Paste Clipboard State
  const [clipboard, setClipboard] = useState<{
    type: 'cell' | 'shift' | 'day' | null
    data: any
    sourceDay?: DayOfWeek
    sourceShiftId?: string
  } | null>(null)
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    type: 'cell' | 'shift' | 'day' | 'empty'
    day?: DayOfWeek
    shiftId?: string
    entry?: TimetableEntry
  } | null>(null)
  const [showReplaceModal, setShowReplaceModal] = useState<{
    day: DayOfWeek
    shiftId: string
    existingEntry?: TimetableEntry
  } | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [pasteTarget, setPasteTarget] = useState<{ day: DayOfWeek; shiftId: string } | null>(null)

  const [filters, setFilters] = useState({
    academicYearId: '',
    semesterId: '',
    departmentId: '',
    studyMode: 'FULL_TIME' as Shift,
    classId: ''
  })

  const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false)
  const [classSearchQuery, setClassSearchQuery] = useState('')
  const classDropdownRef = useRef<HTMLDivElement>(null)

  const [entryFormData, setEntryFormData] = useState({
    dayOfWeek: 'MONDAY' as DayOfWeek,
    shiftTemplateId: '',
    courseName: '',
    lecturerName: '',
    room: '',
    entryType: 'LECTURE' as TimetableEntryType
  })
  const [selectedLecturerDepartmentId, setSelectedLecturerDepartmentId] = useState<string | null>(null)

  const [conflicts, setConflicts] = useState<{
    hasConflicts: boolean
    lecturer: any[]
    room: any[]
  } | null>(null)

  const dayOptions: { value: DayOfWeek; label: string }[] = [
    { value: 'SATURDAY', label: 'Saturday' },
    { value: 'SUNDAY', label: 'Sunday' },
    { value: 'MONDAY', label: 'Monday' },
    { value: 'TUESDAY', label: 'Tuesday' },
    { value: 'WEDNESDAY', label: 'Wednesday' },
    { value: 'THURSDAY', label: 'Thursday' },
    { value: 'FRIDAY', label: 'Friday' }
  ]

  // Entry types available for both FULL_TIME and PART_TIME study modes
  const entryTypeOptions = [
    { value: 'LECTURE', label: 'Core Lecture', color: 'bg-blue-100 border-blue-300 text-blue-800' },
    { value: 'LABORATORY', label: 'Laboratory', color: 'bg-green-100 border-green-300 text-green-800' },
    { value: 'TUTORIAL', label: 'Tutorial/Math', color: 'bg-yellow-100 border-yellow-300 text-yellow-800' }
  ]

  useEffect(() => {
    fetchInitialData()
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (classDropdownRef.current && !classDropdownRef.current.contains(event.target as Node)) {
        setIsClassDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  useEffect(() => {
    if (filters.semesterId && filters.departmentId && filters.studyMode) {
      fetchTimetable()
    }
  }, [filters])

  const fetchInitialData = async () => {
    try {
      const [yearsRes, deptsRes, classesRes] = await Promise.all([
        fetch('/api/academic-years'),
        fetch('/api/departments'),
        fetch('/api/classes')
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

      if (classesRes.ok) {
        const classesData = await classesRes.json()
        setClasses(classesData)
      }

      // Fetch courses and lecturers on initial load
      await fetchCourses()
      await fetchLecturers()
    } catch (error) {
      console.error('Error fetching initial data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (filters.academicYearId) {
      fetchSemesters()
    }
  }, [filters.academicYearId])

  useEffect(() => {
    if (filters.studyMode) {
      fetchShiftTemplates()
    }
  }, [filters.studyMode])

  // Note: Courses and Lecturers are always fetched globally, not filtered by department
  // Department/Class filters are used ONLY for timetable context, not for fetching courses/lecturers

  useEffect(() => {
    // Fetch courses when search query changes (global, not filtered by department)
    fetchCourses()
  }, [courseSearchQuery])

  useEffect(() => {
    // Fetch lecturers when search query changes (global, not filtered by department)
    fetchLecturers()
  }, [lecturerSearchQuery])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (courseDropdownRef.current && !courseDropdownRef.current.contains(event.target as Node)) {
        setIsCourseDropdownOpen(false)
      }
      if (lecturerDropdownRef.current && !lecturerDropdownRef.current.contains(event.target as Node)) {
        setIsLecturerDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

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

  const fetchShiftTemplates = async () => {
    try {
      const response = await fetch(`/api/shift-templates?studyMode=${filters.studyMode}`)
      if (response.ok) {
        const data = await response.json()
        setShiftTemplates(data.filter((t: any) => !t.isBreak))
      }
    } catch (error) {
      console.error('Error fetching shift templates:', error)
    }
  }

  const fetchCourses = async () => {
    try {
      // Fetch ALL courses globally - not filtered by department or class
      const params = new URLSearchParams()
      if (courseSearchQuery) params.append('search', courseSearchQuery)
      // Note: departmentId filter removed - courses are global for timetable entries

      const response = await fetch(`/api/courses?${params}`)
      if (response.ok) {
        const data = await response.json()
        setCourses(data)
      }
    } catch (error) {
      console.error('Error fetching courses:', error)
    }
  }

  const fetchLecturers = async () => {
    try {
      // Fetch ALL lecturers globally - not filtered by department, class, study mode, or course
      const params = new URLSearchParams()
      if (lecturerSearchQuery) params.append('search', lecturerSearchQuery)
      // Note: departmentId filter removed - lecturers are global for timetable entries

      const response = await fetch(`/api/lecturers?${params}`)
      if (response.ok) {
        const data = await response.json()
        setLecturers(data)
      }
    } catch (error) {
      console.error('Error fetching lecturers:', error)
    }
  }

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCourseData.code || !newCourseData.title) {
      alert('Please fill in course code and title')
      return
    }

    try {
      const response = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newCourseData,
          departmentId: filters.departmentId || null
        })
      })

      if (response.ok) {
        await fetchCourses()
        setShowCreateCourseModal(false)
        setNewCourseData({ code: '', title: '' })
        // Auto-select the newly created course
        const newCourse = await response.json()
        setEntryFormData({ ...entryFormData, courseName: `${newCourse.code} - ${newCourse.title}` })
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to create course')
      }
    } catch (error) {
      console.error('Error creating course:', error)
      alert('Failed to create course')
    }
  }

  const handleCreateLecturer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newLecturerData.fullName) {
      alert('Please fill in lecturer name')
      return
    }

    try {
      const response = await fetch('/api/lecturers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newLecturerData,
          departmentId: filters.departmentId || null
        })
      })

      if (response.ok) {
        await fetchLecturers()
        setShowCreateLecturerModal(false)
        setNewLecturerData({ fullName: '', email: '', phone: '' })
        // Auto-select the newly created lecturer
        const newLecturer = await response.json()
        setEntryFormData({ ...entryFormData, lecturerName: newLecturer.fullName })
        setSelectedLecturerDepartmentId(newLecturer.departmentId || null)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to create lecturer')
      }
    } catch (error) {
      console.error('Error creating lecturer:', error)
      alert('Failed to create lecturer')
    }
  }

  const fetchTimetable = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({
        semesterId: filters.semesterId,
        departmentId: filters.departmentId,
        studyMode: filters.studyMode
      })
      if (filters.classId) params.append('classId', filters.classId)

      const response = await fetch(`/api/timetables?${params}`)
      if (response.ok) {
        const data = await response.json()
        if (data.length > 0) {
          setTimetable(data[0])
        } else {
          // Create timetable if it doesn't exist
          await createTimetable()
        }
      }
    } catch (error) {
      console.error('Error fetching timetable:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const createTimetable = async () => {
    try {
      const response = await fetch('/api/timetables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          semesterId: filters.semesterId,
          departmentId: filters.departmentId,
          classId: filters.classId || null,
          studyMode: filters.studyMode
        })
      })

      if (response.ok) {
        const data = await response.json()
        setTimetable(data)
      }
    } catch (error) {
      console.error('Error creating timetable:', error)
    }
  }

  // Copy/Paste Functions
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const clearClipboard = () => {
    setClipboard(null)
    setPasteTarget(null)
  }

  const handleCopyCell = (entry: TimetableEntry) => {
    setClipboard({
      type: 'cell',
      data: {
        courseName: entry.courseName,
        lecturerName: entry.lecturerName,
        room: entry.room,
        entryType: entry.entryType
      },
      sourceDay: entry.dayOfWeek,
      sourceShiftId: entry.shiftTemplateId
    })
    showToast('Copied successfully')
    setContextMenu(null)
  }

  const handleCopyShift = (shiftId: string) => {
    if (!timetable) return
    const shiftEntries = timetable.entries.filter(e => e.shiftTemplateId === shiftId)
    setClipboard({
      type: 'shift',
      data: shiftEntries.map(e => ({
        shiftTemplateId: e.shiftTemplateId,
        dayOfWeek: e.dayOfWeek,
        courseName: e.courseName,
        lecturerName: e.lecturerName,
        room: e.room,
        entryType: e.entryType
      })),
      sourceShiftId: shiftId
    })
    showToast('Copied shift successfully')
    setContextMenu(null)
  }

  const handleCopyDay = (day: DayOfWeek) => {
    if (!timetable) return
    const dayEntries = timetable.entries.filter(e => e.dayOfWeek === day)
    setClipboard({
      type: 'day',
      data: dayEntries.map(e => ({
        shiftTemplateId: e.shiftTemplateId,
        courseName: e.courseName,
        lecturerName: e.lecturerName,
        room: e.room,
        entryType: e.entryType
      })),
      sourceDay: day
    })
    showToast('Copied day successfully')
    setContextMenu(null)
  }

  const canPaste = (targetDay: DayOfWeek, targetShiftId: string): boolean => {
    if (!clipboard || !timetable) return false
    
    // Must be same academic year, class, and study mode
    // These are already validated by the timetable context
    
    if (clipboard.type === 'cell') {
      // Can paste cell to any empty cell or replace existing
      return true
    } else if (clipboard.type === 'shift') {
      // Can paste shift to any day
      return true
    } else if (clipboard.type === 'day') {
      // Can paste day to any shift
      return true
    }
    return false
  }

  const handlePaste = async (targetDay: DayOfWeek, targetShiftId: string, replaceExisting: boolean = false) => {
    if (!clipboard || !timetable) return

    // Check if target has existing entry
    const existingEntry = timetable.entries.find(
      e => e.dayOfWeek === targetDay && e.shiftTemplateId === targetShiftId
    )

    if (existingEntry && !replaceExisting) {
      setShowReplaceModal({ day: targetDay, shiftId: targetShiftId, existingEntry })
      return
    }

    try {
      if (clipboard.type === 'cell') {
        // Paste single cell
        const response = await fetch('/api/timetable-entries', {
          method: existingEntry ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(existingEntry ? {
            id: existingEntry.id,
            dayOfWeek: targetDay,
            shiftTemplateId: targetShiftId,
            courseName: clipboard.data.courseName,
            lecturerName: clipboard.data.lecturerName,
            room: clipboard.data.room,
            entryType: clipboard.data.entryType
          } : {
            timetableId: timetable.id,
            dayOfWeek: targetDay,
            shiftTemplateId: targetShiftId,
            courseName: clipboard.data.courseName,
            lecturerName: clipboard.data.lecturerName,
            room: clipboard.data.room,
            entryType: clipboard.data.entryType
          })
        })

        if (response.ok) {
          showToast('Pasted successfully')
          await fetchTimetable()
        } else {
          const error = await response.json()
          showToast(error.error || 'Failed to paste', 'error')
        }
      } else if (clipboard.type === 'shift') {
        // Paste entire shift to target day (all entries from the shift go to target day, keeping their original shift times)
        let successCount = 0
        let errorCount = 0

        for (const entryData of clipboard.data) {
          // Use the shift template ID from the entry data (preserve original shift time)
          const shiftIdToUse = entryData.shiftTemplateId || clipboard.sourceShiftId || targetShiftId

          const existing = timetable.entries.find(
            e => e.dayOfWeek === targetDay && e.shiftTemplateId === shiftIdToUse
          )

          const response = await fetch('/api/timetable-entries', {
            method: existing ? 'PATCH' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(existing ? {
              id: existing.id,
              dayOfWeek: targetDay,
              shiftTemplateId: shiftIdToUse,
              courseName: entryData.courseName,
              lecturerName: entryData.lecturerName,
              room: entryData.room,
              entryType: entryData.entryType
            } : {
              timetableId: timetable.id,
              dayOfWeek: targetDay,
              shiftTemplateId: shiftIdToUse,
              courseName: entryData.courseName,
              lecturerName: entryData.lecturerName,
              room: entryData.room,
              entryType: entryData.entryType
            })
          })

          if (response.ok) {
            successCount++
          } else {
            errorCount++
          }
        }

        if (successCount > 0) {
          showToast(`Pasted ${successCount} entry/entries successfully`)
          await fetchTimetable()
        }
        if (errorCount > 0) {
          showToast(`${errorCount} error(s) occurred`, 'error')
        }
      } else if (clipboard.type === 'day') {
        // Paste entire day to target shift (all entries from the day go to target shift, keeping their original days)
        let successCount = 0
        let errorCount = 0

        for (const entryData of clipboard.data) {
          // Use the day from the clipboard source (preserve original day)
          const dayToUse = clipboard.sourceDay || targetDay

          const existing = timetable.entries.find(
            e => e.dayOfWeek === dayToUse && e.shiftTemplateId === targetShiftId
          )

          const response = await fetch('/api/timetable-entries', {
            method: existing ? 'PATCH' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(existing ? {
              id: existing.id,
              dayOfWeek: dayToUse,
              shiftTemplateId: targetShiftId,
              courseName: entryData.courseName,
              lecturerName: entryData.lecturerName,
              room: entryData.room,
              entryType: entryData.entryType
            } : {
              timetableId: timetable.id,
              dayOfWeek: dayToUse,
              shiftTemplateId: targetShiftId,
              courseName: entryData.courseName,
              lecturerName: entryData.lecturerName,
              room: entryData.room,
              entryType: entryData.entryType
            })
          })

          if (response.ok) {
            successCount++
          } else {
            errorCount++
          }
        }

        if (successCount > 0) {
          showToast(`Pasted ${successCount} entry/entries successfully`)
          await fetchTimetable()
        }
        if (errorCount > 0) {
          showToast(`${errorCount} error(s) occurred`, 'error')
        }
      }

      setContextMenu(null)
      setPasteTarget(null)
    } catch (error) {
      console.error('Error pasting:', error)
      showToast('Failed to paste', 'error')
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'c' && contextMenu) {
          e.preventDefault()
          if (contextMenu.type === 'cell' && contextMenu.entry) {
            handleCopyCell(contextMenu.entry)
          } else if (contextMenu.type === 'shift' && contextMenu.shiftId) {
            handleCopyShift(contextMenu.shiftId)
          } else if (contextMenu.type === 'day' && contextMenu.day) {
            handleCopyDay(contextMenu.day)
          }
        } else if (e.key === 'v' && pasteTarget) {
          e.preventDefault()
          handlePaste(pasteTarget.day, pasteTarget.shiftId)
        }
      } else if (e.key === 'Escape') {
        clearClipboard()
        setContextMenu(null)
        setPasteTarget(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [contextMenu, pasteTarget, clipboard, timetable])

  // Clear clipboard when filters change
  useEffect(() => {
    clearClipboard()
  }, [filters.academicYearId, filters.classId, filters.studyMode])

  const handleCopyTimetable = async () => {
    if (!timetable || !timetable.entries || timetable.entries.length === 0) {
      alert('No timetable entries to copy')
      return
    }

    if (!copyFilters.semesterId || !copyFilters.departmentId) {
      alert('Please select semester and department for the copy')
      return
    }

    try {
      // Create new timetable
      const createResponse = await fetch('/api/timetables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          semesterId: copyFilters.semesterId,
          departmentId: copyFilters.departmentId,
          classId: copyFilters.classId || null,
          studyMode: copyFilters.studyMode
        })
      })

      if (!createResponse.ok) {
        const error = await createResponse.json()
        alert(error.error || 'Failed to create timetable')
        return
      }

      const newTimetable = await createResponse.json()

      // Copy all entries
      let copied = 0
      let errors = 0

      for (const entry of timetable.entries) {
        try {
          const entryResponse = await fetch('/api/timetable-entries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              timetableId: newTimetable.id,
              dayOfWeek: entry.dayOfWeek,
              shiftTemplateId: entry.shiftTemplateId,
              courseName: entry.courseName,
              lecturerName: entry.lecturerName,
              room: entry.room,
              entryType: entry.entryType
            })
          })

          if (entryResponse.ok) {
            copied++
          } else {
            errors++
          }
        } catch (error) {
          errors++
        }
      }

      alert(`Successfully copied ${copied} entry/entries. ${errors > 0 ? `${errors} error(s) occurred.` : ''}`)
      setShowCopyModal(false)
      
      // Find academicYearId from the selected semester
      const selectedSemester = semesters.find(s => s.id === copyFilters.semesterId)
      const academicYearId = selectedSemester?.academicYearId || filters.academicYearId
      
      // Update filters to show the new timetable
      setFilters({
        academicYearId,
        ...copyFilters,
        classId: copyFilters.classId
      })
      
      // Fetch the new timetable
      await fetchTimetable()
    } catch (error) {
      console.error('Error copying timetable:', error)
      alert('Failed to copy timetable')
    }
  }

  const handleUpdateEntry = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingEntry || !entryFormData.shiftTemplateId || !entryFormData.courseName || !entryFormData.lecturerName) {
      alert('Please fill in all required fields')
      return
    }

    try {
      const response = await fetch('/api/timetable-entries', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingEntry.id,
          ...entryFormData
        })
      })

      if (response.ok) {
        await fetchTimetable()
        setShowEntryModal(false)
        setEditingEntry(null)
        setEntryFormData({
          dayOfWeek: 'MONDAY',
          shiftTemplateId: '',
          courseName: '',
          lecturerName: '',
          room: '',
          entryType: 'LECTURE'
        })
        setSelectedLecturerDepartmentId(null)
        setConflicts(null)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update timetable entry')
      }
    } catch (error) {
      console.error('Error updating timetable entry:', error)
      alert('Failed to update timetable entry')
    }
  }

  const handleDeleteEntry = async (id: string) => {
    if (!confirm('Are you sure you want to delete this timetable entry?')) return

    try {
      const response = await fetch(`/api/timetable-entries?id=${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchTimetable()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete timetable entry')
      }
    } catch (error) {
      console.error('Error deleting timetable entry:', error)
      alert('Failed to delete timetable entry')
    }
  }

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!timetable || !entryFormData.shiftTemplateId || !entryFormData.courseName || !entryFormData.lecturerName) {
      alert('Please fill in all required fields')
      return
    }

    try {
      const response = await fetch('/api/timetable-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timetableId: timetable.id,
          ...entryFormData
        })
      })

      if (response.ok) {
        const data = await response.json()
        setConflicts(data.conflicts)
        
        if (data.conflicts.hasConflicts) {
          // Show conflicts but still allow save
          const proceed = confirm(
            `Conflicts detected!\n\n` +
            `${data.conflicts.lecturer.length > 0 ? `Lecturer conflict: ${data.conflicts.lecturer.map((c: any) => c.courseName).join(', ')}\n` : ''}` +
            `${data.conflicts.room.length > 0 ? `Room conflict: ${data.conflicts.room.map((c: any) => c.courseName).join(', ')}\n` : ''}` +
            `\nDo you want to proceed anyway?`
          )
          if (!proceed) {
            return
          }
        }

        await fetchTimetable()
        setShowEntryModal(false)
        setEntryFormData({
          dayOfWeek: 'MONDAY',
          shiftTemplateId: '',
          courseName: '',
          lecturerName: '',
          room: '',
          entryType: 'LECTURE'
        })
        setSelectedLecturerDepartmentId(null)
        setConflicts(null)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to create timetable entry')
      }
    } catch (error) {
      console.error('Error creating timetable entry:', error)
      alert('Failed to create timetable entry')
    }
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  const getEntryColor = (entryType: TimetableEntryType, hasConflict: boolean = false) => {
    if (hasConflict) return 'bg-red-100 border-red-300 text-red-800'
    switch (entryType) {
      case 'LECTURE':
        return 'bg-blue-100 border-blue-300 text-blue-800'
      case 'LABORATORY':
        return 'bg-green-100 border-green-300 text-green-800'
      case 'TUTORIAL':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800'
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800'
    }
  }

  // Group entries by day and time
  const groupedEntries = timetable?.entries.reduce((acc, entry) => {
    const key = `${entry.dayOfWeek}-${entry.shiftTemplateId}`
    if (!acc[key]) {
      acc[key] = []
    }
    acc[key].push(entry)
    return acc
  }, {} as Record<string, TimetableEntry[]>) || {}

  // Get unique time slots
  const timeSlots = shiftTemplates
    .filter(t => !t.isBreak)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
    .map(t => ({
      id: t.id,
      name: t.name,
      startTime: t.startTime,
      endTime: t.endTime,
      display: `${formatTime(t.startTime)} - ${formatTime(t.endTime)}`
    }))

  // Get days for the study mode
  const activeDays = filters.studyMode === 'FULL_TIME'
    ? ['SATURDAY', 'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY'] as DayOfWeek[]
    : ['THURSDAY', 'FRIDAY'] as DayOfWeek[]

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Timetable Management</h1>
            <p className="text-gray-600 mt-1">Manage and organize class schedules</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search entries..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex items-center gap-2 border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-4 py-2 transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-primary text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
                title="Grid View"
              >
                <Grid3x3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-4 py-2 transition-colors ${
                  viewMode === 'table'
                    ? 'bg-primary text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
                title="Table View"
              >
                <List className="w-5 h-5" />
              </button>
            </div>
            {timetable && timetable.entries && timetable.entries.length > 0 && (
              <button
                onClick={() => {
                  setCopyFilters({
                    semesterId: filters.semesterId,
                    departmentId: filters.departmentId,
                    classId: filters.classId,
                    studyMode: filters.studyMode
                  })
                  setShowCopyModal(true)
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
              >
                <Copy className="w-5 h-5" />
                Copy
              </button>
            )}
            <button
              onClick={async () => {
                if (!timetable) {
                  await createTimetable()
                } else {
                  // Fetch courses and lecturers when opening modal
                  await fetchCourses()
                  await fetchLecturers()
                  setShowEntryModal(true)
                }
              }}
              className="bg-primary hover:bg-primary-dark text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">ACADEMIC YEAR</label>
              <select
                value={filters.academicYearId}
                onChange={(e) => setFilters({ ...filters, academicYearId: e.target.value, semesterId: '' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              >
                <option value="">Select Year</option>
                {academicYears.map((year) => (
                  <option key={year.id} value={year.id}>{year.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">SESSION</label>
              <select
                value={filters.semesterId}
                onChange={(e) => setFilters({ ...filters, semesterId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                disabled={!filters.academicYearId}
              >
                <option value="">Select Session</option>
                {semesters.map((sem) => (
                  <option key={sem.id} value={sem.id}>{sem.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">DEPARTMENT</label>
              <select
                value={filters.departmentId}
                onChange={(e) => setFilters({ ...filters, departmentId: e.target.value, classId: '' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              >
                <option value="">Select Department</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">STUDY MODE</label>
              <select
                value={filters.studyMode}
                onChange={(e) => setFilters({ ...filters, studyMode: e.target.value as Shift })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              >
                <option value="FULL_TIME">Full-time</option>
                <option value="PART_TIME">Part-time</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">CLASS</label>
              <div className="relative" ref={classDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsClassDropdownOpen(!isClassDropdownOpen)}
                  disabled={!filters.departmentId}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm text-left flex items-center justify-between bg-white disabled:bg-gray-50 disabled:cursor-not-allowed"
                >
                  <span className={filters.classId ? 'text-gray-900' : 'text-gray-500'}>
                    {filters.classId
                      ? classes.find(c => c.id === filters.classId)?.classTitle || 'Select Class'
                      : 'All Classes'}
                  </span>
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform ${isClassDropdownOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {isClassDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
                    <div className="p-2 border-b border-gray-200">
                      <input
                        type="text"
                        value={classSearchQuery}
                        onChange={(e) => setClassSearchQuery(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="Search class..."
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                        autoFocus
                      />
                    </div>
                    <div className="overflow-y-auto max-h-48">
                      <button
                        type="button"
                        onClick={() => {
                          setFilters({ ...filters, classId: '' })
                          setIsClassDropdownOpen(false)
                          setClassSearchQuery('')
                        }}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors ${
                          !filters.classId ? 'bg-primary text-white hover:bg-primary-dark' : 'text-gray-900'
                        }`}
                      >
                        All Classes
                      </button>
                      {classes
                        .filter(c => {
                          if (c.departmentId !== filters.departmentId) return false
                          if (classSearchQuery) {
                            return c.classTitle.toLowerCase().includes(classSearchQuery.toLowerCase())
                          }
                          return true
                        })
                        .length === 0 ? (
                          <div className="px-4 py-3 text-sm text-gray-500 text-center">
                            No class found
                          </div>
                        ) : (
                          classes
                            .filter(c => {
                              if (c.departmentId !== filters.departmentId) return false
                              if (classSearchQuery) {
                                return c.classTitle.toLowerCase().includes(classSearchQuery.toLowerCase())
                              }
                              return true
                            })
                            .map((cls) => (
                              <button
                                key={cls.id}
                                type="button"
                                onClick={() => {
                                  setFilters({ ...filters, classId: cls.id })
                                  setIsClassDropdownOpen(false)
                                  setClassSearchQuery('')
                                }}
                                className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors ${
                                  filters.classId === cls.id ? 'bg-primary text-white hover:bg-primary-dark' : 'text-gray-900'
                                }`}
                              >
                                {cls.classTitle}
                              </button>
                            ))
                        )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Timetable View */}
        {timetable ? (
          viewMode === 'table' ? (
            /* Table View */
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Class</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Days</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Course</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Time</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Lecturer Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">DEP</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Study Mode</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Semester</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Room</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {timetable.entries.map((entry) => {
                      const hasConflict = timetable.entries.some(e => 
                        e.id !== entry.id && 
                        ((e.room && e.room === entry.room && e.dayOfWeek === entry.dayOfWeek && e.shiftTemplateId === entry.shiftTemplateId) ||
                        (e.lecturerName === entry.lecturerName && e.dayOfWeek === entry.dayOfWeek && e.shiftTemplateId === entry.shiftTemplateId))
                      )
                      const dayLabel = dayOptions.find(d => d.value === entry.dayOfWeek)?.label || entry.dayOfWeek
                      const timeDisplay = `${formatTime(entry.shiftTemplate.startTime)} - ${formatTime(entry.shiftTemplate.endTime)}`
                      const bgColor = hasConflict 
                        ? 'bg-red-50' 
                        : entry.entryType === 'LECTURE' 
                          ? 'bg-blue-50' 
                          : entry.entryType === 'LABORATORY' 
                            ? 'bg-green-50' 
                            : 'bg-yellow-50'
                      
                      return (
                        <tr 
                          key={entry.id} 
                          className={`hover:bg-opacity-80 transition-colors ${bgColor}`}
                        >
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {timetable.class?.classTitle || 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">{dayLabel}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{entry.courseName}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{timeDisplay}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{entry.lecturerName}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{timetable.department.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {filters.studyMode === 'FULL_TIME' ? 'Full Time' : 'Part Time'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">{timetable.semester.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{entry.room || 'N/A'}</td>
                          <td className="px-4 py-3 text-right text-sm">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={async () => {
                                  await fetchCourses()
                                  await fetchLecturers()
                                  setEditingEntry(entry)
                                  setEntryFormData({
                                    dayOfWeek: entry.dayOfWeek,
                                    shiftTemplateId: entry.shiftTemplateId,
                                    courseName: entry.courseName,
                                    lecturerName: entry.lecturerName,
                                    room: entry.room || '',
                                    entryType: entry.entryType
                                  })
                                  // Find lecturer department ID from lecturers list
                                  const lecturer = lecturers.find(l => l.fullName === entry.lecturerName)
                                  setSelectedLecturerDepartmentId(lecturer?.departmentId || null)
                                  setShowEntryModal(true)
                                }}
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="Edit"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeleteEntry(entry.id)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Delete"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Grid View */
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="sticky left-0 z-10 bg-gray-50 px-4 py-3 text-left text-sm font-semibold text-gray-700 border-r border-gray-200">
                      TIME
                    </th>
                    {activeDays.map((day) => (
                      <th 
                        key={day} 
                        className="px-4 py-3 text-center text-sm font-semibold text-gray-700 min-w-[150px] relative group"
                        onContextMenu={(e) => {
                          e.preventDefault()
                          setContextMenu({ x: e.clientX, y: e.clientY, type: 'day', day })
                        }}
                      >
                        {dayOptions.find(d => d.value === day)?.label.toUpperCase()}
                        <button
                          onClick={() => handleCopyDay(day)}
                          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 text-blue-600 hover:bg-blue-50 rounded transition-all"
                          title="Copy Day"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timeSlots.map((slot) => (
                    <tr key={slot.id} className="border-b border-gray-100">
                      <td 
                        className="sticky left-0 z-10 bg-white px-4 py-3 text-sm font-medium text-gray-700 border-r border-gray-200 whitespace-nowrap relative group"
                        onContextMenu={(e) => {
                          e.preventDefault()
                          setContextMenu({ x: e.clientX, y: e.clientY, type: 'shift', shiftId: slot.id })
                        }}
                      >
                        {slot.display}
                        <button
                          onClick={() => handleCopyShift(slot.id)}
                          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 text-blue-600 hover:bg-blue-50 rounded transition-all"
                          title="Copy Shift"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </td>
                      {activeDays.map((day) => {
                        const key = `${day}-${slot.id}`
                        const entries = groupedEntries[key] || []
                        return (
                          <td 
                            key={day} 
                            className={`px-2 py-2 align-top min-h-[80px] ${
                              pasteTarget?.day === day && pasteTarget?.shiftId === slot.id
                                ? 'border-2 border-dashed border-green-500 bg-green-50/30'
                                : canPaste(day, slot.id) && clipboard
                                ? 'border-2 border-dashed border-green-300'
                                : ''
                            }`}
                            onContextMenu={(e) => {
                              e.preventDefault()
                              if (entries.length > 0) {
                                setContextMenu({ x: e.clientX, y: e.clientY, type: 'cell', day, shiftId: slot.id, entry: entries[0] })
                              } else {
                                setContextMenu({ x: e.clientX, y: e.clientY, type: 'empty', day, shiftId: slot.id })
                                setPasteTarget({ day, shiftId: slot.id })
                              }
                            }}
                            onMouseEnter={() => {
                              if (canPaste(day, slot.id) && clipboard) {
                                setPasteTarget({ day, shiftId: slot.id })
                              }
                            }}
                            onMouseLeave={() => {
                              if (pasteTarget?.day === day && pasteTarget?.shiftId === slot.id) {
                                setPasteTarget(null)
                              }
                            }}
                          >
                            {entries.map((entry) => {
                              // Check for conflicts
                              const hasConflict = Boolean(
                                entries.length > 1 || 
                                (entry.room && timetable.entries.some(e => 
                                  e.id !== entry.id && 
                                  e.room === entry.room && 
                                  e.dayOfWeek === entry.dayOfWeek &&
                                  e.shiftTemplateId === entry.shiftTemplateId
                                ))
                              )
                              return (
                                <div
                                  key={entry.id}
                                  className={`mb-2 p-2 rounded border ${getEntryColor(entry.entryType, hasConflict)} group relative`}
                                  onContextMenu={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    setContextMenu({ x: e.clientX, y: e.clientY, type: 'cell', day, shiftId: slot.id, entry })
                                  }}
                                >
                                  <div
                                    className="cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={async () => {
                                      // Fetch courses and lecturers when opening edit modal
                                      await fetchCourses()
                                      await fetchLecturers()
                                      setEditingEntry(entry)
                                      setEntryFormData({
                                        dayOfWeek: entry.dayOfWeek,
                                        shiftTemplateId: entry.shiftTemplateId,
                                        courseName: entry.courseName,
                                        lecturerName: entry.lecturerName,
                                        room: entry.room || '',
                                        entryType: entry.entryType
                                      })
                                      // Find lecturer department ID from lecturers list
                                      const lecturer = lecturers.find(l => l.fullName === entry.lecturerName)
                                      setSelectedLecturerDepartmentId(lecturer?.departmentId || null)
                                      setShowEntryModal(true)
                                    }}
                                  >
                                    <div className="font-semibold text-xs mb-1">{entry.courseName}</div>
                                    <div className="text-xs opacity-80">{entry.lecturerName}</div>
                                    {entry.room && (
                                      <div className="text-xs opacity-70 mt-1">{entry.room}</div>
                                    )}
                                    {hasConflict && (
                                      <div className="flex items-center gap-1 mt-1 text-xs">
                                        <AlertTriangle className="w-3 h-3" />
                                        <span>Conflict</span>
                                      </div>
                                    )}
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleDeleteEntry(entry.id)
                                    }}
                                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 text-red-600 hover:bg-red-50 rounded transition-all"
                                    title="Delete"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleCopyCell(entry)
                                    }}
                                    className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 p-1 text-blue-600 hover:bg-blue-50 rounded transition-all"
                                    title="Copy (Ctrl+C)"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </button>
                                </div>
                              )
                            })}
                            {entries.length === 0 && (
                              <button
                                onClick={() => {
                                  if (clipboard && canPaste(day, slot.id)) {
                                    handlePaste(day, slot.id)
                                  } else {
                                    setEntryFormData({
                                      dayOfWeek: day,
                                      shiftTemplateId: slot.id,
                                      courseName: '',
                                      lecturerName: '',
                                      room: '',
                                      entryType: 'LECTURE'
                                    })
                                    setSelectedLecturerDepartmentId(null)
                                    setShowEntryModal(true)
                                  }
                                }}
                                onContextMenu={(e) => {
                                  e.preventDefault()
                                  if (clipboard && canPaste(day, slot.id)) {
                                    handlePaste(day, slot.id)
                                  }
                                }}
                                className={`w-full h-16 border-2 border-dashed rounded transition-colors text-xs ${
                                  pasteTarget?.day === day && pasteTarget?.shiftId === slot.id
                                    ? 'border-green-500 bg-green-50/30 text-green-700'
                                    : canPaste(day, slot.id) && clipboard
                                    ? 'border-green-300 bg-green-50/20 text-green-600'
                                    : 'border-gray-300 hover:border-primary hover:bg-primary/5 text-gray-400'
                                }`}
                              >
                                {clipboard && canPaste(day, slot.id) ? 'Paste (Ctrl+V)' : '+ Add'}
                              </button>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center gap-6 flex-wrap">
                <span className="text-sm font-semibold text-gray-700">LEGEND:</span>
                {entryTypeOptions.map((type) => (
                  <div key={type.value} className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded border ${type.color.split(' ')[0]}`}></div>
                    <span className="text-sm text-gray-600">{type.label}</span>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded border bg-red-100"></div>
                  <span className="text-sm text-gray-600">Conflict</span>
                </div>
              </div>
            </div>
          </div>
          )
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <p className="text-gray-500">Select filters above to view or create a timetable</p>
          </div>
        )}

        {/* Add/Edit Entry Modal */}
        {showEntryModal && timetable && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {editingEntry ? 'Edit Timetable Entry' : 'Add Timetable Entry'}
                    </h2>
                    <p className="text-sm text-gray-600">SIU FECT Exam & Timetable Management</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowEntryModal(false)
                    setEditingEntry(null)
                    setConflicts(null)
                    setEntryFormData({
                      dayOfWeek: 'MONDAY',
                      shiftTemplateId: '',
                      courseName: '',
                      lecturerName: '',
                      room: '',
                      entryType: 'LECTURE'
                    })
                    setSelectedLecturerDepartmentId(null)
                  }}
                  className="absolute top-6 right-6 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={editingEntry ? handleUpdateEntry : handleCreateEntry} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Day of Week
                  </label>
                  <select
                    value={entryFormData.dayOfWeek}
                    onChange={(e) => setEntryFormData({ ...entryFormData, dayOfWeek: e.target.value as DayOfWeek })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                    required
                  >
                    {dayOptions.map((day) => (
                      <option key={day.value} value={day.value}>{day.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Shift (Time Slot)
                  </label>
                  <select
                    value={entryFormData.shiftTemplateId}
                    onChange={(e) => setEntryFormData({ ...entryFormData, shiftTemplateId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                    required
                  >
                    <option value="">Select a time block</option>
                    {shiftTemplates.map((shift) => (
                      <option key={shift.id} value={shift.id}>
                        {shift.name} ({formatTime(shift.startTime)} - {formatTime(shift.endTime)})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Course Code & Title
                  </label>
                  <p className="text-xs text-gray-500 mb-2">All courses available (cross-department)</p>
                  <div className="relative" ref={courseDropdownRef}>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={entryFormData.courseName}
                        onChange={(e) => {
                          setEntryFormData({ ...entryFormData, courseName: e.target.value })
                          setCourseSearchQuery(e.target.value)
                          setIsCourseDropdownOpen(true)
                        }}
                        onFocus={() => setIsCourseDropdownOpen(true)}
                        placeholder="Search Course Code or Title"
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                        required
                      />
                    </div>
                    {isCourseDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
                        <div className="p-2 border-b border-gray-200">
                          <div className="flex items-center gap-2">
                            <Search className="w-4 h-4 text-gray-400" />
                            <input
                              type="text"
                              value={courseSearchQuery}
                              onChange={(e) => {
                                setCourseSearchQuery(e.target.value)
                                setEntryFormData({ ...entryFormData, courseName: e.target.value })
                              }}
                              onClick={(e) => e.stopPropagation()}
                              placeholder="Search Course Code or Title"
                              className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                              autoFocus
                            />
                          </div>
                        </div>
                        <div className="overflow-y-auto max-h-48">
                          {courses.length === 0 && !courseSearchQuery ? (
                            <div className="px-4 py-3 text-sm text-gray-500 text-center">
                              <div>No courses available</div>
                              <button
                                type="button"
                                onClick={() => {
                                  setNewCourseData({ code: '', title: '' })
                                  setShowCreateCourseModal(true)
                                  setIsCourseDropdownOpen(false)
                                }}
                                className="mt-2 text-green-600 hover:text-green-700 font-medium"
                              >
                                + Create New Course
                              </button>
                            </div>
                          ) : courses
                            .filter(c => {
                              if (!courseSearchQuery) return true
                              const searchLower = courseSearchQuery.toLowerCase()
                              return c.code.toLowerCase().includes(searchLower) || 
                                     c.title.toLowerCase().includes(searchLower) ||
                                     `${c.code} - ${c.title}`.toLowerCase().includes(searchLower)
                            })
                            .length === 0 ? (
                              <>
                                <div className="px-4 py-3 text-sm text-gray-500 text-center">
                                  No course found matching "{courseSearchQuery}"
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setNewCourseData({ code: courseSearchQuery.split(' - ')[0] || '', title: courseSearchQuery.split(' - ')[1] || courseSearchQuery })
                                    setShowCreateCourseModal(true)
                                    setIsCourseDropdownOpen(false)
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-green-600 hover:bg-green-50 transition-colors border-t border-gray-200 font-medium"
                                >
                                  + Create "{courseSearchQuery || 'New Course'}"
                                </button>
                              </>
                            ) : (
                              <>
                                {courses
                                  .filter(c => {
                                    if (!courseSearchQuery) return true
                                    const searchLower = courseSearchQuery.toLowerCase()
                                    return c.code.toLowerCase().includes(searchLower) || 
                                           c.title.toLowerCase().includes(searchLower) ||
                                           `${c.code} - ${c.title}`.toLowerCase().includes(searchLower)
                                  })
                                  .map((course) => (
                                    <button
                                      key={course.id}
                                      type="button"
                                      onClick={() => {
                                        setEntryFormData({ ...entryFormData, courseName: `${course.code} - ${course.title}` })
                                        setIsCourseDropdownOpen(false)
                                        setCourseSearchQuery('')
                                      }}
                                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors"
                                    >
                                      <div className="font-medium text-gray-900">{course.code} - {course.title}</div>
                                      {course.department && (
                                        <div className="text-xs text-gray-500 mt-0.5">{course.department.name}</div>
                                      )}
                                    </button>
                                  ))}
                                {courseSearchQuery && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setNewCourseData({ code: courseSearchQuery.split(' - ')[0] || '', title: courseSearchQuery.split(' - ')[1] || courseSearchQuery })
                                      setShowCreateCourseModal(true)
                                      setIsCourseDropdownOpen(false)
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-green-600 hover:bg-green-50 transition-colors border-t border-gray-200 font-medium"
                                  >
                                    + Create "{courseSearchQuery}"
                                  </button>
                                )}
                              </>
                            )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Lecturer / Faculty Member
                  </label>
                  <p className="text-xs text-gray-500 mb-2">All lecturers available (not limited by department)</p>
                  <div className="relative" ref={lecturerDropdownRef}>
                    <input
                      type="text"
                      value={entryFormData.lecturerName}
                      onChange={(e) => {
                        setEntryFormData({ ...entryFormData, lecturerName: e.target.value })
                        setLecturerSearchQuery(e.target.value)
                        setIsLecturerDropdownOpen(true)
                        // Clear department ID if lecturer name is cleared
                        if (!e.target.value) {
                          setSelectedLecturerDepartmentId(null)
                        }
                      }}
                      onFocus={() => setIsLecturerDropdownOpen(true)}
                      placeholder="Search Faculty Member"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                      required
                    />
                    {selectedLecturerDepartmentId && timetable && selectedLecturerDepartmentId !== timetable.departmentId && (
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                          <div className="text-xs text-yellow-800">
                            <p className="font-medium">Note: Lecturer department differs from timetable department</p>
                            <p className="text-yellow-700 mt-0.5">
                              Lecturer: {lecturers.find(l => l.departmentId === selectedLecturerDepartmentId)?.department?.name || 
                                        lecturers.find(l => l.fullName === entryFormData.lecturerName)?.department?.name || 'Unknown'} | 
                              Timetable: {timetable.department.name}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    {isLecturerDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
                        <div className="p-2 border-b border-gray-200">
                          <div className="flex items-center gap-2">
                            <Search className="w-4 h-4 text-gray-400" />
                            <input
                              type="text"
                              value={lecturerSearchQuery}
                              onChange={(e) => {
                                setLecturerSearchQuery(e.target.value)
                                setEntryFormData({ ...entryFormData, lecturerName: e.target.value })
                              }}
                              onClick={(e) => e.stopPropagation()}
                              placeholder="Search Faculty Member"
                              className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                              autoFocus
                            />
                          </div>
                        </div>
                        <div className="overflow-y-auto max-h-48">
                          {lecturers.length === 0 && !lecturerSearchQuery ? (
                            <div className="px-4 py-3 text-sm text-gray-500 text-center">
                              <div>No lecturers available</div>
                              <button
                                type="button"
                                onClick={() => {
                                  setNewLecturerData({ fullName: '', email: '', phone: '' })
                                  setShowCreateLecturerModal(true)
                                  setIsLecturerDropdownOpen(false)
                                }}
                                className="mt-2 text-green-600 hover:text-green-700 font-medium"
                              >
                                + Create New Lecturer
                              </button>
                            </div>
                          ) : lecturers
                            .filter(l => {
                              if (!lecturerSearchQuery) return true
                              return l.fullName.toLowerCase().includes(lecturerSearchQuery.toLowerCase())
                            })
                            .length === 0 ? (
                              <>
                                <div className="px-4 py-3 text-sm text-gray-500 text-center">
                                  No lecturer found matching "{lecturerSearchQuery}"
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setNewLecturerData({ fullName: lecturerSearchQuery, email: '', phone: '' })
                                    setShowCreateLecturerModal(true)
                                    setIsLecturerDropdownOpen(false)
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-green-600 hover:bg-green-50 transition-colors border-t border-gray-200 font-medium"
                                >
                                  + Create "{lecturerSearchQuery || 'New Lecturer'}"
                                </button>
                              </>
                            ) : (
                              <>
                                {lecturers
                                  .filter(l => {
                                    if (!lecturerSearchQuery) return true
                                    return l.fullName.toLowerCase().includes(lecturerSearchQuery.toLowerCase())
                                  })
                                  .map((lecturer) => (
                                    <button
                                      key={lecturer.id}
                                      type="button"
                                      onClick={() => {
                                        setEntryFormData({ ...entryFormData, lecturerName: lecturer.fullName })
                                        setSelectedLecturerDepartmentId(lecturer.departmentId || null)
                                        setIsLecturerDropdownOpen(false)
                                        setLecturerSearchQuery('')
                                      }}
                                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors"
                                    >
                                      <div className="font-medium text-gray-900">{lecturer.fullName}</div>
                                      {lecturer.email && (
                                        <div className="text-xs text-gray-500 mt-0.5">{lecturer.email}</div>
                                      )}
                                      {lecturer.department && (
                                        <div className="text-xs text-gray-500">{lecturer.department.name}</div>
                                      )}
                                    </button>
                                  ))}
                                {lecturerSearchQuery && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setNewLecturerData({ fullName: lecturerSearchQuery, email: '', phone: '' })
                                      setShowCreateLecturerModal(true)
                                      setIsLecturerDropdownOpen(false)
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-green-600 hover:bg-green-50 transition-colors border-t border-gray-200 font-medium"
                                  >
                                    + Create "{lecturerSearchQuery}"
                                  </button>
                                )}
                              </>
                            )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Room Assignment
                  </label>
                  <input
                    type="text"
                    value={entryFormData.room}
                    onChange={(e) => setEntryFormData({ ...entryFormData, room: e.target.value })}
                    placeholder="e.g. Room 402, Building B"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Entry Type</label>
                  <select
                    value={entryFormData.entryType}
                    onChange={(e) => setEntryFormData({ ...entryFormData, entryType: e.target.value as TimetableEntryType })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                  >
                    {entryTypeOptions.map((type) => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                {/* Conflict Warnings */}
                {conflicts && conflicts.hasConflicts && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-medium text-yellow-800 mb-2">Heads up! Conflicts detected:</h4>
                        {conflicts.lecturer.length > 0 && (
                          <p className="text-sm text-yellow-700 mb-1">
                            • Lecturer conflict: {conflicts.lecturer.map((c: any) => c.courseName).join(', ')}
                          </p>
                        )}
                        {conflicts.room.length > 0 && (
                          <p className="text-sm text-yellow-700">
                            • Room conflict: {conflicts.room.map((c: any) => c.courseName).join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEntryModal(false)
                      setEditingEntry(null)
                      setConflicts(null)
                      setEntryFormData({
                        dayOfWeek: 'MONDAY',
                        shiftTemplateId: '',
                        courseName: '',
                        lecturerName: '',
                        room: '',
                        entryType: 'LECTURE'
                      })
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {editingEntry ? 'Update Entry' : 'Save Entry'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Create Course Modal */}
        {showCreateCourseModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Create New Course</h2>
              </div>
              <form onSubmit={handleCreateCourse} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Course Code</label>
                  <input
                    type="text"
                    value={newCourseData.code}
                    onChange={(e) => setNewCourseData({ ...newCourseData, code: e.target.value })}
                    placeholder="e.g., CS101"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Course Title</label>
                  <input
                    type="text"
                    value={newCourseData.title}
                    onChange={(e) => setNewCourseData({ ...newCourseData, title: e.target.value })}
                    placeholder="e.g., Data Structures"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                    required
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateCourseModal(false)
                      setNewCourseData({ code: '', title: '' })
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Create Course
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Create Lecturer Modal */}
        {showCreateLecturerModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Create New Lecturer</h2>
              </div>
              <form onSubmit={handleCreateLecturer} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={newLecturerData.fullName}
                    onChange={(e) => setNewLecturerData({ ...newLecturerData, fullName: e.target.value })}
                    placeholder="e.g., Dr. John Nash"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email (Optional)</label>
                  <input
                    type="email"
                    value={newLecturerData.email}
                    onChange={(e) => setNewLecturerData({ ...newLecturerData, email: e.target.value })}
                    placeholder="e.g., john.nash@siu.edu"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone (Optional)</label>
                  <input
                    type="text"
                    value={newLecturerData.phone}
                    onChange={(e) => setNewLecturerData({ ...newLecturerData, phone: e.target.value })}
                    placeholder="e.g., +252 61 1234567"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateLecturerModal(false)
                      setNewLecturerData({ fullName: '', email: '', phone: '' })
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Create Lecturer
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Copy Timetable Modal */}
        {showCopyModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Copy className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Copy Timetable</h2>
                    <p className="text-sm text-gray-600">Copy entries to a new timetable</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCopyModal(false)}
                  className="absolute top-6 right-6 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    Copying <strong>{timetable?.entries.length || 0} entry/entries</strong> from current timetable.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Session/Semester</label>
                  <select
                    value={copyFilters.semesterId}
                    onChange={(e) => setCopyFilters({ ...copyFilters, semesterId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="">Select Session/Semester</option>
                    {semesters.map((semester) => (
                      <option key={semester.id} value={semester.id}>{semester.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                  <select
                    value={copyFilters.departmentId}
                    onChange={(e) => {
                      setCopyFilters({ ...copyFilters, departmentId: e.target.value, classId: '' })
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Study Mode</label>
                  <select
                    value={copyFilters.studyMode}
                    onChange={(e) => setCopyFilters({ ...copyFilters, studyMode: e.target.value as Shift })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="FULL_TIME">Full-time</option>
                    <option value="PART_TIME">Part-time</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Class (Optional)</label>
                  <select
                    value={copyFilters.classId}
                    onChange={(e) => setCopyFilters({ ...copyFilters, classId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="">All Classes</option>
                    {classes
                      .filter(c => c.departmentId === copyFilters.departmentId)
                      .map((cls) => (
                        <option key={cls.id} value={cls.id}>{cls.classTitle}</option>
                      ))}
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCopyModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyTimetable}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Copy Timetable
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Context Menu */}
        {contextMenu && (
          <div
            className="fixed bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50 min-w-[180px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => {
              e.preventDefault()
              setContextMenu(null)
            }}
          >
            {contextMenu.type === 'cell' && contextMenu.entry && (
              <>
                <button
                  onClick={() => handleCopyCell(contextMenu.entry!)}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copy Cell (Ctrl+C)
                </button>
                <div className="border-t border-gray-200 my-1"></div>
                <button
                  onClick={async () => {
                    await fetchCourses()
                    await fetchLecturers()
                    setEditingEntry(contextMenu.entry!)
                    setEntryFormData({
                      dayOfWeek: contextMenu.entry!.dayOfWeek,
                      shiftTemplateId: contextMenu.entry!.shiftTemplateId,
                      courseName: contextMenu.entry!.courseName,
                      lecturerName: contextMenu.entry!.lecturerName,
                      room: contextMenu.entry!.room || '',
                      entryType: contextMenu.entry!.entryType
                    })
                    // Find lecturer department ID from lecturers list
                    const lecturer = lecturers.find(l => l.fullName === contextMenu.entry!.lecturerName)
                    setSelectedLecturerDepartmentId(lecturer?.departmentId || null)
                    setShowEntryModal(true)
                    setContextMenu(null)
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    handleDeleteEntry(contextMenu.entry!.id)
                    setContextMenu(null)
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </>
            )}
            {contextMenu.type === 'shift' && contextMenu.shiftId && (
              <button
                onClick={() => handleCopyShift(contextMenu.shiftId!)}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Copy Shift (Ctrl+C)
              </button>
            )}
            {contextMenu.type === 'day' && contextMenu.day && (
              <button
                onClick={() => handleCopyDay(contextMenu.day!)}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Copy Day (Ctrl+C)
              </button>
            )}
            {contextMenu.type === 'empty' && clipboard && canPaste(contextMenu.day!, contextMenu.shiftId!) && (
              <button
                onClick={() => handlePaste(contextMenu.day!, contextMenu.shiftId!)}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Paste (Ctrl+V)
              </button>
            )}
          </div>
        )}

        {/* Replace Confirmation Modal */}
        {showReplaceModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Replace Entry?</h2>
                <p className="text-sm text-gray-600 mt-1">This slot already has a class. Replace?</p>
              </div>
              <div className="p-6 space-y-4">
                {showReplaceModal.existingEntry && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Current Entry:</p>
                    <p className="text-sm text-gray-600">{showReplaceModal.existingEntry.courseName}</p>
                    <p className="text-xs text-gray-500">{showReplaceModal.existingEntry.lecturerName}</p>
                  </div>
                )}
                {clipboard && clipboard.type === 'cell' && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">New Entry:</p>
                    <p className="text-sm text-gray-600">{clipboard.data.courseName}</p>
                    <p className="text-xs text-gray-500">{clipboard.data.lecturerName}</p>
                  </div>
                )}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowReplaceModal(null)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (showReplaceModal) {
                        await handlePaste(showReplaceModal.day, showReplaceModal.shiftId, true)
                        setShowReplaceModal(null)
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                  >
                    Replace
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Toast Notification */}
        {toast && (
          <div className={`fixed bottom-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 ${
            toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}>
            {toast.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
            <span>{toast.message}</span>
          </div>
        )}

        {/* Click outside to close context menu */}
        {contextMenu && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setContextMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault()
              setContextMenu(null)
            }}
          />
        )}
      </div>
    </AdminLayout>
  )
}
