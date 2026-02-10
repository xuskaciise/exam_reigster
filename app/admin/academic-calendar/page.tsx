'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'
import { Plus, Pencil, Trash2, Calendar, Users, ClipboardList, Download, RefreshCw, Settings } from 'lucide-react'

interface AcademicYear {
  id: string
  name: string
  startDate: string
  endDate: string
  isActive: boolean
  semesters: Semester[]
}

interface Semester {
  id: string
  name: string
  semesterType: string
  startDate: string
  endDate: string
  status: string
  description?: string
}

export default function AcademicCalendarPage() {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([])
  const [selectedYear, setSelectedYear] = useState<AcademicYear | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateYearModal, setShowCreateYearModal] = useState(false)
  const [showEditYearModal, setShowEditYearModal] = useState(false)
  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null)
  const [showCreateSemesterModal, setShowCreateSemesterModal] = useState(false)
  const [showEditSemesterModal, setShowEditSemesterModal] = useState(false)
  const [editingSemester, setEditingSemester] = useState<Semester | null>(null)

  const [yearFormData, setYearFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
    isActive: false
  })

  const [semesterFormData, setSemesterFormData] = useState({
    name: '',
    semesterType: 'ODD',
    startDate: '',
    endDate: '',
    status: 'UPCOMING',
    description: ''
  })

  useEffect(() => {
    fetchAcademicYears()
  }, [])

  useEffect(() => {
    if (academicYears.length > 0 && !selectedYear) {
      const activeYear = academicYears.find(y => y.isActive) || academicYears[0]
      setSelectedYear(activeYear)
    }
  }, [academicYears, selectedYear])

  const fetchAcademicYears = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/academic-years')
      if (response.ok) {
        const data = await response.json()
        setAcademicYears(data)
        if (data.length > 0 && !selectedYear) {
          const activeYear = data.find((y: AcademicYear) => y.isActive) || data[0]
          setSelectedYear(activeYear)
        }
      }
    } catch (error) {
      console.error('Error fetching academic years:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateYear = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!yearFormData.name || !yearFormData.startDate || !yearFormData.endDate) {
      alert('Please fill in all required fields')
      return
    }

    try {
      const response = await fetch('/api/academic-years', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(yearFormData)
      })

      if (response.ok) {
        await fetchAcademicYears()
        setShowCreateYearModal(false)
        setYearFormData({ name: '', startDate: '', endDate: '', isActive: false })
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to create academic year')
      }
    } catch (error) {
      console.error('Error creating academic year:', error)
      alert('Failed to create academic year')
    }
  }

  const handleEditYear = (year: AcademicYear) => {
    setEditingYear(year)
    setYearFormData({
      name: year.name,
      startDate: year.startDate.split('T')[0],
      endDate: year.endDate.split('T')[0],
      isActive: year.isActive
    })
    setShowEditYearModal(true)
  }

  const handleUpdateYear = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingYear || !yearFormData.name || !yearFormData.startDate || !yearFormData.endDate) {
      alert('Please fill in all required fields')
      return
    }

    try {
      const response = await fetch('/api/academic-years', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingYear.id,
          ...yearFormData
        })
      })

      if (response.ok) {
        await fetchAcademicYears()
        setShowEditYearModal(false)
        setEditingYear(null)
        setYearFormData({ name: '', startDate: '', endDate: '', isActive: false })
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update academic year')
      }
    } catch (error) {
      console.error('Error updating academic year:', error)
      alert('Failed to update academic year')
    }
  }

  const handleDeleteYear = async (id: string) => {
    if (!confirm('Are you sure you want to delete this academic year? This will also delete all associated semesters.')) return

    try {
      const response = await fetch(`/api/academic-years?id=${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchAcademicYears()
        if (selectedYear?.id === id) {
          setSelectedYear(null)
        }
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete academic year')
      }
    } catch (error) {
      console.error('Error deleting academic year:', error)
      alert('Failed to delete academic year')
    }
  }

  const handleCreateSemester = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedYear || !semesterFormData.name || !semesterFormData.startDate || !semesterFormData.endDate) {
      alert('Please fill in all required fields')
      return
    }

    try {
      const response = await fetch('/api/semesters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...semesterFormData,
          academicYearId: selectedYear.id
        })
      })

      if (response.ok) {
        await fetchAcademicYears()
        setShowCreateSemesterModal(false)
        setSemesterFormData({
          name: '',
          semesterType: 'ODD',
          startDate: '',
          endDate: '',
          status: 'UPCOMING',
          description: ''
        })
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to create semester')
      }
    } catch (error) {
      console.error('Error creating semester:', error)
      alert('Failed to create semester')
    }
  }

  const handleEditSemester = (semester: Semester) => {
    setEditingSemester(semester)
    setSemesterFormData({
      name: semester.name,
      semesterType: semester.semesterType,
      startDate: semester.startDate.split('T')[0],
      endDate: semester.endDate.split('T')[0],
      status: semester.status,
      description: semester.description || ''
    })
    setShowEditSemesterModal(true)
  }

  const handleUpdateSemester = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingSemester) return

    try {
      const response = await fetch('/api/semesters', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingSemester.id,
          ...semesterFormData
        })
      })

      if (response.ok) {
        await fetchAcademicYears()
        setShowEditSemesterModal(false)
        setEditingSemester(null)
        setSemesterFormData({
          name: '',
          semesterType: 'ODD',
          startDate: '',
          endDate: '',
          status: 'UPCOMING',
          description: ''
        })
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update semester')
      }
    } catch (error) {
      console.error('Error updating semester:', error)
      alert('Failed to update semester')
    }
  }

  const handleDeleteSemester = async (id: string) => {
    if (!confirm('Are you sure you want to delete this semester?')) return

    try {
      const response = await fetch(`/api/semesters?id=${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchAcademicYears()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete semester')
      }
    } catch (error) {
      console.error('Error deleting semester:', error)
      alert('Failed to delete semester')
    }
  }

  const handleActivateYear = async (year: AcademicYear) => {
    try {
      const response = await fetch('/api/academic-years', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: year.id,
          isActive: true
        })
      })

      if (response.ok) {
        await fetchAcademicYears()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to activate academic year')
      }
    } catch (error) {
      console.error('Error activating academic year:', error)
      alert('Failed to activate academic year')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return 'bg-green-100 text-green-800'
      case 'UPCOMING':
        return 'bg-orange-100 text-orange-800'
      case 'COMPLETED':
        return 'bg-gray-100 text-gray-800'
      case 'INACTIVE':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusDot = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return 'bg-green-500'
      case 'UPCOMING':
        return 'bg-orange-500'
      case 'COMPLETED':
        return 'bg-gray-500'
      case 'INACTIVE':
        return 'bg-gray-500'
      default:
        return 'bg-gray-500'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

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
      <div className="flex gap-6 h-[calc(100vh-8rem)]">
        {/* Left Sidebar - Academic Years */}
        <div className="w-80 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">ACADEMIC YEARS</h2>
            <button
              onClick={() => setShowCreateYearModal(true)}
              className="w-full border-2 border-green-600 text-green-600 px-4 py-2 rounded-lg font-medium hover:bg-green-50 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Academic Year
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {academicYears.map((year) => (
              <div
                key={year.id}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  selectedYear?.id === year.id
                    ? 'border-green-600 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div 
                    onClick={() => setSelectedYear(year)}
                    className="flex-1 cursor-pointer"
                  >
                    <h3 className="font-semibold text-gray-900">{year.name}</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    {year.isActive && (
                      <span className="px-2 py-0.5 bg-green-600 text-white text-xs rounded">ACTIVE</span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEditYear(year)
                      }}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteYear(year.id)
                      }}
                      className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div 
                  onClick={() => setSelectedYear(year)}
                  className="cursor-pointer"
                >
                  <p className="text-xs text-gray-600 mb-2">
                    {formatDate(year.startDate)} - {formatDate(year.endDate)}
                  </p>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {year.semesters.map((sem) => (
                      <span
                        key={sem.id}
                        className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded"
                      >
                        {sem.semesterType === 'ODD' ? 'S1' : sem.semesterType === 'EVEN' ? 'S2' : 'ST'}
                      </span>
                    ))}
                  </div>
                  {year.semesters.length === 0 && (
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Pencil className="w-3 h-3" />
                      No sessions created
                    </p>
                  )}
                  {year.semesters.length > 0 && year.isActive && (
                    <p className="text-xs text-gray-600 mt-1">
                      Current Session: {year.semesters.find(s => s.status === 'IN_PROGRESS')?.name || 'N/A'}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 p-6 overflow-y-auto">
          {selectedYear ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl font-bold text-gray-900">{selectedYear.name} Details</h1>
                    {selectedYear.isActive && (
                      <span className="px-3 py-1 bg-green-600 text-white text-sm rounded">CURRENT</span>
                    )}
                  </div>
                  <p className="text-gray-600">
                    Managing {selectedYear.semesters.length} Active Sessions for this Academic Year.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Year Config
                  </button>
                  <button
                    onClick={() => setShowCreateSemesterModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add New Session
                  </button>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Registration Status</p>
                      <p className="font-semibold text-gray-900">Open (Sem 1)</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Enrollment</p>
                      <p className="font-semibold text-gray-900">14,250 Students</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <ClipboardList className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Pending Results</p>
                      <p className="font-semibold text-gray-900">AY 23-24 (ST)</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Semesters Table */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">SESSION NAME</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">TYPE</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">START DATE</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">END DATE</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">STATUS</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedYear.semesters.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-500">
                          No semesters found. Click "Add New Session" to create one.
                        </td>
                      </tr>
                    ) : (
                      selectedYear.semesters.map((semester) => (
                        <tr key={semester.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div>
                              <div className="font-medium text-gray-900">{semester.name}</div>
                              {semester.description && (
                                <div className="text-xs text-gray-500 mt-0.5">{semester.description}</div>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                              {semester.semesterType === 'ODD' ? '1 / ODD' : semester.semesterType === 'EVEN' ? '2 / EVEN' : '3 / SUMMER'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-700">{formatDate(semester.startDate)}</td>
                          <td className="py-3 px-4 text-gray-700">{formatDate(semester.endDate)}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${getStatusDot(semester.status)}`}></div>
                              <span className={`px-2 py-1 text-xs rounded ${getStatusColor(semester.status)}`}>
                                {semester.status.replace('_', ' ')}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEditSemester(semester)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              {semester.status === 'INACTIVE' && (
                                <button
                                  onClick={() => handleActivateYear(selectedYear)}
                                  className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                                >
                                  ACTIVATE
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteSemester(semester.id)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">Select an academic year from the sidebar to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Academic Year Modal */}
      {showCreateYearModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Create Academic Year</h2>
            </div>
            <form onSubmit={handleCreateYear} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Academic Year Name</label>
                <input
                  type="text"
                  value={yearFormData.name}
                  onChange={(e) => setYearFormData({ ...yearFormData, name: e.target.value })}
                  placeholder="e.g., AY 2024-25"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={yearFormData.startDate}
                    onChange={(e) => setYearFormData({ ...yearFormData, startDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                  <input
                    type="date"
                    value={yearFormData.endDate}
                    onChange={(e) => setYearFormData({ ...yearFormData, endDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                    required
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={yearFormData.isActive}
                  onChange={(e) => setYearFormData({ ...yearFormData, isActive: e.target.checked })}
                  className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-600"
                />
                <label className="text-sm text-gray-700">Set as active academic year</label>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateYearModal(false)
                    setYearFormData({ name: '', startDate: '', endDate: '', isActive: false })
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Create Year
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Academic Year Modal */}
      {showEditYearModal && editingYear && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Edit Academic Year</h2>
            </div>
            <form onSubmit={handleUpdateYear} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Academic Year Name</label>
                <input
                  type="text"
                  value={yearFormData.name}
                  onChange={(e) => setYearFormData({ ...yearFormData, name: e.target.value })}
                  placeholder="e.g., AY 2024-25"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={yearFormData.startDate}
                    onChange={(e) => setYearFormData({ ...yearFormData, startDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                  <input
                    type="date"
                    value={yearFormData.endDate}
                    onChange={(e) => setYearFormData({ ...yearFormData, endDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                    required
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={yearFormData.isActive}
                  onChange={(e) => setYearFormData({ ...yearFormData, isActive: e.target.checked })}
                  className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-600"
                />
                <label className="text-sm text-gray-700">Set as active academic year</label>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditYearModal(false)
                    setEditingYear(null)
                    setYearFormData({ name: '', startDate: '', endDate: '', isActive: false })
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Update Year
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Semester Modal */}
      {showCreateSemesterModal && selectedYear && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Add New Session</h2>
            </div>
            <form onSubmit={handleCreateSemester} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Session Name</label>
                <input
                  type="text"
                  value={semesterFormData.name}
                  onChange={(e) => setSemesterFormData({ ...semesterFormData, name: e.target.value })}
                  placeholder="e.g., Semester 1 (ODD)"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Session Type</label>
                <select
                  value={semesterFormData.semesterType}
                  onChange={(e) => setSemesterFormData({ ...semesterFormData, semesterType: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                  required
                >
                  <option value="ODD">ODD (Semester 1)</option>
                  <option value="EVEN">EVEN (Semester 2)</option>
                  <option value="SUMMER">SUMMER</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={semesterFormData.startDate}
                    onChange={(e) => setSemesterFormData({ ...semesterFormData, startDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                  <input
                    type="date"
                    value={semesterFormData.endDate}
                    onChange={(e) => setSemesterFormData({ ...semesterFormData, endDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={semesterFormData.status}
                  onChange={(e) => setSemesterFormData({ ...semesterFormData, status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                >
                  <option value="UPCOMING">Upcoming</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
                <textarea
                  value={semesterFormData.description}
                  onChange={(e) => setSemesterFormData({ ...semesterFormData, description: e.target.value })}
                  placeholder="e.g., Standard Fall Term"
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateSemesterModal(false)
                    setSemesterFormData({
                      name: '',
                      semesterType: 'ODD',
                      startDate: '',
                      endDate: '',
                      status: 'UPCOMING',
                      description: ''
                    })
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Create Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Semester Modal */}
      {showEditSemesterModal && editingSemester && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Edit Session</h2>
            </div>
            <form onSubmit={handleUpdateSemester} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Session Name</label>
                <input
                  type="text"
                  value={semesterFormData.name}
                  onChange={(e) => setSemesterFormData({ ...semesterFormData, name: e.target.value })}
                  placeholder="e.g., Semester 1 (ODD)"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Session Type</label>
                <select
                  value={semesterFormData.semesterType}
                  onChange={(e) => setSemesterFormData({ ...semesterFormData, semesterType: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                  required
                >
                  <option value="ODD">ODD (Semester 1)</option>
                  <option value="EVEN">EVEN (Semester 2)</option>
                  <option value="SUMMER">SUMMER</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={semesterFormData.startDate}
                    onChange={(e) => setSemesterFormData({ ...semesterFormData, startDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                  <input
                    type="date"
                    value={semesterFormData.endDate}
                    onChange={(e) => setSemesterFormData({ ...semesterFormData, endDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={semesterFormData.status}
                  onChange={(e) => setSemesterFormData({ ...semesterFormData, status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                >
                  <option value="UPCOMING">Upcoming</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
                <textarea
                  value={semesterFormData.description}
                  onChange={(e) => setSemesterFormData({ ...semesterFormData, description: e.target.value })}
                  placeholder="e.g., Standard Fall Term"
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditSemesterModal(false)
                    setEditingSemester(null)
                    setSemesterFormData({
                      name: '',
                      semesterType: 'ODD',
                      startDate: '',
                      endDate: '',
                      status: 'UPCOMING',
                      description: ''
                    })
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Update Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
