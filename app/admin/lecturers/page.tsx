'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'
import { Plus, Search, Edit, Trash2, User, Upload, Download, AlertTriangle, X } from 'lucide-react'

interface Lecturer {
  id: string
  fullName: string
  email: string | null
  phone: string | null
  departmentId: string | null
  department: {
    id: string
    name: string
  } | null
  createdAt: string
  updatedAt: string
}

export default function LecturersPage() {
  const [lecturers, setLecturers] = useState<Lecturer[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingLecturer, setEditingLecturer] = useState<Lecturer | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterDepartment, setFilterDepartment] = useState('')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const [duplicates, setDuplicates] = useState<{ name: string; lecturers: Lecturer[] }[]>([])
  const [isRemovingDuplicates, setIsRemovingDuplicates] = useState(false)

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    departmentId: ''
  })

  useEffect(() => {
    fetchLecturers()
    fetchDepartments()
  }, [])

  useEffect(() => {
    fetchLecturers()
  }, [searchQuery, filterDepartment])

  const fetchLecturers = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (filterDepartment) params.append('departmentId', filterDepartment)
      if (searchQuery) params.append('search', searchQuery)

      const response = await fetch(`/api/lecturers?${params}`)
      if (response.ok) {
        const data = await response.json()
        setLecturers(data)
      }
    } catch (error) {
      console.error('Error fetching lecturers:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/departments')
      if (response.ok) {
        const data = await response.json()
        // Sort departments by name in ascending order
        const sortedData = [...data].sort((a, b) => a.name.localeCompare(b.name))
        setDepartments(sortedData)
      }
    } catch (error) {
      console.error('Error fetching departments:', error)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/lecturers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          email: formData.email || null,
          phone: formData.phone || null,
          departmentId: formData.departmentId || null
        })
      })

      if (response.ok) {
        await fetchLecturers()
        setShowCreateModal(false)
        setFormData({ fullName: '', email: '', phone: '', departmentId: '' })
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to create lecturer')
      }
    } catch (error) {
      console.error('Error creating lecturer:', error)
      alert('Failed to create lecturer')
    }
  }

  const handleEdit = (lecturer: Lecturer) => {
    setEditingLecturer(lecturer)
    setFormData({
      fullName: lecturer.fullName,
      email: lecturer.email || '',
      phone: lecturer.phone || '',
      departmentId: lecturer.departmentId || ''
    })
    setShowEditModal(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingLecturer) return

    try {
      const response = await fetch('/api/lecturers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingLecturer.id,
          ...formData,
          email: formData.email || null,
          phone: formData.phone || null,
          departmentId: formData.departmentId || null
        })
      })

      if (response.ok) {
        await fetchLecturers()
        setShowEditModal(false)
        setEditingLecturer(null)
        setFormData({ fullName: '', email: '', phone: '', departmentId: '' })
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update lecturer')
      }
    } catch (error) {
      console.error('Error updating lecturer:', error)
      alert('Failed to update lecturer')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lecturer?')) return

    try {
      const response = await fetch(`/api/lecturers?id=${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchLecturers()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete lecturer')
      }
    } catch (error) {
      console.error('Error deleting lecturer:', error)
      alert('Failed to delete lecturer')
    }
  }

  const handleUploadExcel = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadFile) return

    try {
      setIsUploading(true)
      const formData = new FormData()
      formData.append('file', uploadFile)

      const response = await fetch('/api/lecturers/upload', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const result = await response.json()
        let message = `Successfully imported ${result.created} lecturer(s).`
        if (result.errors > 0) {
          message += `\n\n${result.errors} error(s) occurred:`
          if (result.errorMessages && result.errorMessages.length > 0) {
            message += '\n' + result.errorMessages.slice(0, 5).join('\n')
            if (result.errorMessages.length > 5) {
              message += `\n... and ${result.errorMessages.length - 5} more errors.`
            }
          }
        }
        alert(message)
        await fetchLecturers()
        setShowUploadModal(false)
        setUploadFile(null)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to upload lecturers')
      }
    } catch (error) {
      console.error('Error uploading lecturers:', error)
      alert('Failed to upload lecturers')
    } finally {
      setIsUploading(false)
    }
  }

  const filteredLecturers = lecturers.filter(lecturer => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        lecturer.fullName.toLowerCase().includes(query) ||
        (lecturer.email && lecturer.email.toLowerCase().includes(query))
      )
    }
    return true
  })

  // Find duplicate lecturers by name (case-insensitive)
  const findDuplicates = () => {
    const nameMap = new Map<string, Lecturer[]>()
    
    lecturers.forEach(lecturer => {
      const normalizedName = lecturer.fullName.trim().toLowerCase()
      if (!nameMap.has(normalizedName)) {
        nameMap.set(normalizedName, [])
      }
      nameMap.get(normalizedName)!.push(lecturer)
    })

    const duplicatesList: { name: string; lecturers: Lecturer[] }[] = []
    nameMap.forEach((lecturerList, normalizedName) => {
      if (lecturerList.length > 1) {
        duplicatesList.push({
          name: lecturerList[0].fullName, // Use the first lecturer's name as display
          lecturers: lecturerList
        })
      }
    })

    return duplicatesList
  }

  const handleFindDuplicates = () => {
    const duplicatesList = findDuplicates()
    setDuplicates(duplicatesList)
    setShowDuplicateModal(true)
  }

  const handleRemoveDuplicates = async () => {
    if (duplicates.length === 0) return

    if (!confirm(`Are you sure you want to remove ${duplicates.reduce((sum, dup) => sum + dup.lecturers.length - 1, 0)} duplicate lecturer(s)?\n\nThis will keep the first entry for each duplicate name and delete the rest.`)) {
      return
    }

    try {
      setIsRemovingDuplicates(true)
      const idsToDelete: string[] = []

      duplicates.forEach(dup => {
        // Keep the first lecturer (oldest by ID or creation date), delete the rest
        const sortedLecturers = [...dup.lecturers].sort((a, b) => {
          // Sort by creation date, or by ID if dates are equal
          const dateA = new Date(a.createdAt).getTime()
          const dateB = new Date(b.createdAt).getTime()
          if (dateA !== dateB) return dateA - dateB
          return a.id.localeCompare(b.id)
        })

        // Add all except the first one to deletion list
        for (let i = 1; i < sortedLecturers.length; i++) {
          idsToDelete.push(sortedLecturers[i].id)
        }
      })

      // Delete all duplicates
      const deletePromises = idsToDelete.map(id =>
        fetch(`/api/lecturers?id=${id}`, { method: 'DELETE' })
      )

      await Promise.all(deletePromises)
      await fetchLecturers()
      setShowDuplicateModal(false)
      setDuplicates([])
      alert(`Successfully removed ${idsToDelete.length} duplicate lecturer(s).`)
    } catch (error) {
      console.error('Error removing duplicates:', error)
      alert('Failed to remove duplicates. Please try again.')
    } finally {
      setIsRemovingDuplicates(false)
    }
  }

  // Check if a lecturer is a duplicate
  const isDuplicate = (lecturer: Lecturer): boolean => {
    const normalizedName = lecturer.fullName.trim().toLowerCase()
    return lecturers.filter(l => l.fullName.trim().toLowerCase() === normalizedName).length > 1
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Lecturer Management</h1>
            <p className="text-gray-600 mt-1">Manage lecturers and faculty members</p>
          </div>
          <div className="flex items-center gap-3">
            {findDuplicates().length > 0 && (
              <button
                onClick={handleFindDuplicates}
                className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
              >
                <AlertTriangle className="w-5 h-5" />
                Remove Duplicates ({findDuplicates().reduce((sum, dup) => sum + dup.lecturers.length - 1, 0)})
              </button>
            )}
            <button
              onClick={() => setShowUploadModal(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              <Upload className="w-5 h-5" />
              Upload Excel
            </button>
            <button
              onClick={() => {
                setFormData({ fullName: '', email: '', phone: '', departmentId: '' })
                setShowCreateModal(true)
              }}
              className="bg-primary hover:bg-primary-dark text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Lecturer
            </button>
            <a
              href="/api/lecturers/export-template"
              download
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              <Download className="w-5 h-5" />
              Download Template
            </a>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search lecturers by name or email..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Lecturers Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : filteredLecturers.length === 0 ? (
            <div className="p-12 text-center">
              <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No lecturers found</p>
              <p className="text-gray-400 text-sm mt-2">Create your first lecturer to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Department</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredLecturers.map((lecturer) => (
                    <tr key={lecturer.id} className={`hover:bg-gray-50 transition-colors ${isDuplicate(lecturer) ? 'bg-orange-50' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="font-medium text-gray-900">{lecturer.fullName}</div>
                          {isDuplicate(lecturer) && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-800 rounded-full flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Duplicate
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-gray-600">{lecturer.email || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-gray-600">{lecturer.phone || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-gray-600">{lecturer.department?.name || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(lecturer)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(lecturer.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Create New Lecturer</h2>
                    <p className="text-sm text-gray-600">SIU FECT Exam & Timetable Management</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    setFormData({ fullName: '', email: '', phone: '', departmentId: '' })
                  }}
                  className="absolute top-6 right-6 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleCreate} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="e.g., Dr. John Nash, Prof. Grace Hopper"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email (Optional)</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="e.g., john.nash@siu.edu"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone (Optional)</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g., +252 61 1234567"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Department (Optional)</label>
                  <select
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false)
                      setFormData({ fullName: '', email: '', phone: '', departmentId: '' })
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

        {/* Edit Modal */}
        {showEditModal && editingLecturer && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Edit className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Edit Lecturer</h2>
                    <p className="text-sm text-gray-600">SIU FECT Exam & Timetable Management</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingLecturer(null)
                    setFormData({ fullName: '', email: '', phone: '', departmentId: '' })
                  }}
                  className="absolute top-6 right-6 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleUpdate} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="e.g., Dr. John Nash, Prof. Grace Hopper"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email (Optional)</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="e.g., john.nash@siu.edu"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone (Optional)</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g., +252 61 1234567"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Department (Optional)</label>
                  <select
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false)
                      setEditingLecturer(null)
                      setFormData({ fullName: '', email: '', phone: '', departmentId: '' })
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Update Lecturer
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                    <Upload className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Upload Lecturers from Excel</h2>
                    <p className="text-sm text-gray-600">SIU FECT Exam & Timetable Management</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowUploadModal(false)
                    setUploadFile(null)
                  }}
                  className="absolute top-6 right-6 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleUploadExcel} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Excel File</label>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    File should have columns: Full Name, Email (optional), Phone (optional), Department (optional)
                  </p>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUploadModal(false)
                      setUploadFile(null)
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    disabled={isUploading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!uploadFile || isUploading}
                  >
                    {isUploading ? 'Uploading...' : 'Upload & Import'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Duplicate Lecturers Modal */}
        {showDuplicateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Duplicate Lecturers Found</h2>
                      <p className="text-sm text-gray-600">
                        {duplicates.reduce((sum, dup) => sum + dup.lecturers.length - 1, 0)} duplicate(s) will be removed
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowDuplicateModal(false)
                      setDuplicates([])
                    }}
                    className="text-gray-400 hover:text-gray-600"
                    disabled={isRemovingDuplicates}
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6">
                  {duplicates.map((dup, index) => (
                    <div key={index} className="border border-orange-200 rounded-lg p-4 bg-orange-50">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-900 text-lg">{dup.name}</h3>
                        <span className="px-3 py-1 text-sm font-medium bg-orange-200 text-orange-800 rounded-full">
                          {dup.lecturers.length} duplicate(s)
                        </span>
                      </div>
                      <div className="space-y-2">
                        {dup.lecturers.map((lecturer, idx) => {
                          const isFirst = idx === 0
                          return (
                            <div
                              key={lecturer.id}
                              className={`p-3 rounded-lg border ${
                                isFirst
                                  ? 'bg-green-50 border-green-300'
                                  : 'bg-white border-orange-300'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-900">{lecturer.fullName}</span>
                                    {isFirst && (
                                      <span className="px-2 py-0.5 text-xs font-medium bg-green-200 text-green-800 rounded-full">
                                        Keep (First Entry)
                                      </span>
                                    )}
                                    {!isFirst && (
                                      <span className="px-2 py-0.5 text-xs font-medium bg-red-200 text-red-800 rounded-full">
                                        Will Delete
                                      </span>
                                    )}
                                  </div>
                                  <div className="mt-1 text-sm text-gray-600 space-y-1">
                                    {lecturer.email && <div>Email: {lecturer.email}</div>}
                                    {lecturer.phone && <div>Phone: {lecturer.phone}</div>}
                                    <div>Department: {lecturer.department?.name || 'N/A'}</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-6 border-t border-gray-200 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowDuplicateModal(false)
                    setDuplicates([])
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  disabled={isRemovingDuplicates}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRemoveDuplicates}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isRemovingDuplicates || duplicates.length === 0}
                >
                  {isRemovingDuplicates ? 'Removing...' : `Remove ${duplicates.reduce((sum, dup) => sum + dup.lecturers.length - 1, 0)} Duplicate(s)`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
