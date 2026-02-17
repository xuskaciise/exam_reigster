'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'
import { Plus, Pencil, Trash2, Filter, Download, Users, Search } from 'lucide-react'

export default function ClassesPage() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingClass, setEditingClass] = useState<any>(null)
  const [classes, setClasses] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  const [formData, setFormData] = useState({
    classTitle: '',
    departmentId: '',
  })
  const [totalClasses, setTotalClasses] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const [classesRes, departmentsRes] = await Promise.all([
        fetch('/api/classes'),
        fetch('/api/departments')
      ])

      if (classesRes.ok) {
        const classesData = await classesRes.json()
        setClasses(classesData)
        setTotalClasses(classesData.length)
      }

      if (departmentsRes.ok) {
        const departmentsData = await departmentsRes.json()
        setDepartments(departmentsData)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.classTitle.trim() || !formData.departmentId) {
      alert('Please fill in all required fields')
      return
    }

    // Find department by ID from database
    const selectedDept = departments.find(dept => dept.id === formData.departmentId)
    
    if (!selectedDept) {
      alert('Invalid department selected')
      return
    }

    try {
      const response = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classTitle: formData.classTitle,
          departmentName: selectedDept.name,
        }),
      })

      if (response.ok) {
        await fetchData()
        setShowCreateModal(false)
        setFormData({ classTitle: '', departmentId: '' })
      } else {
        const error = await response.json()
        console.error('Error response:', error)
        alert(error.error || 'Failed to create class')
      }
    } catch (error) {
      console.error('Error creating class:', error)
      alert('Failed to create class. Please try again.')
    }
  }

  const handleEditClass = (cls: any) => {
    setEditingClass(cls)
    // Find department by name from database
    const dept = departments.find(d => d.name === cls.department)
    setFormData({
      classTitle: cls.classTitle,
      departmentId: dept?.id || '',
    })
    setShowEditModal(true)
  }

  const handleUpdateClass = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingClass) return

    // Find department by ID from database
    const selectedDept = departments.find(dept => dept.id === formData.departmentId)
    
    if (!selectedDept) {
      alert('Invalid department selected')
      return
    }

    try {
      const response = await fetch('/api/classes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingClass.id,
          classTitle: formData.classTitle,
          departmentName: selectedDept.name,
        }),
      })

      if (response.ok) {
        await fetchData()
        setShowEditModal(false)
        setEditingClass(null)
        setFormData({ classTitle: '', departmentId: '' })
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update class')
      }
    } catch (error) {
      console.error('Error updating class:', error)
      alert('Failed to update class. Please try again.')
    }
  }

  const handleDeleteClass = async (id: string) => {
    if (!confirm('Are you sure you want to delete this class?')) return

    try {
      const response = await fetch(`/api/classes?id=${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchData()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete class')
      }
    } catch (error) {
      console.error('Error deleting class:', error)
      alert('Failed to delete class. Please try again.')
    }
  }

  const getDepartmentColor = (deptName: string) => {
    if (deptName === 'Computer Science') return 'bg-blue-100 text-blue-700'
    if (deptName === 'Civil Engineering') return 'bg-orange-100 text-orange-700'
    return 'bg-gray-100 text-gray-700'
  }

  // Filter classes based on search query
  const filteredClasses = classes.filter(cls => {
    if (!searchQuery.trim()) return true
    
    const query = searchQuery.toLowerCase().trim()
    const classTitle = cls.classTitle?.toLowerCase() || ''
    const department = cls.department?.toLowerCase() || ''
    const classId = `cls-${classes.indexOf(cls) + 1001}`.toLowerCase()
    
    return (
      classTitle.includes(query) ||
      department.includes(query) ||
      classId.includes(query)
    )
  })

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manage University Classes</h1>
          <p className="text-gray-600 mt-1">
            Register new class records or modify existing data within the SIU Special Exam system. Keep class names and department associations accurate.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Register New Class */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="bg-green-600 text-white px-6 py-4 rounded-t-lg flex items-center gap-2">
                <Plus className="w-5 h-5" />
                <h2 className="text-lg font-semibold">Register New Class</h2>
              </div>
              <form onSubmit={handleCreateClass} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Class Name (e.g., CS-2024)
                  </label>
                  <input
                    type="text"
                    value={formData.classTitle}
                    onChange={(e) => setFormData({ ...formData, classTitle: e.target.value })}
                    placeholder="Enter class title"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Department
                  </label>
                  <select
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  >
                    <option value="">Select a department</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <span className="text-xl">⊞</span>
                  Register Class
                </button>
              </form>
            </div>

            {/* Total Active Classes */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 uppercase tracking-wide">Total Active Classes</p>
                  <p className="text-3xl font-bold text-gray-900">{totalClasses}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Existing Classes */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Existing Classes</h2>
                <div className="flex items-center gap-2">
                  <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    Filter
                  </button>
                  <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Export
                  </button>
                </div>
              </div>
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by class name, department, or ID..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CLASS TITLE
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      DEPARTMENT
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      DATE CREATED
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ACTIONS
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                        Loading classes...
                      </td>
                    </tr>
                  ) : filteredClasses.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                        {searchQuery ? `No classes found matching "${searchQuery}"` : 'No classes found. Create your first class to get started.'}
                      </td>
                    </tr>
                  ) : (
                    filteredClasses.map((cls) => {
                      const originalIndex = classes.findIndex(c => c.id === cls.id)
                      const createdDate = new Date(cls.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                      return (
                        <tr key={cls.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-medium text-gray-900">#CLS-{String(1000 + originalIndex + 1).padStart(4, '0')}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{cls.classTitle}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getDepartmentColor(cls.department)}`}>
                              {cls.department}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{createdDate}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEditClass(cls)}
                                className="text-gray-400 hover:text-blue-600 transition-colors"
                                title="Edit"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteClass(cls.id)}
                                className="text-gray-400 hover:text-red-600 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {searchQuery ? (
                  <>Showing {filteredClasses.length} of {classes.length} results</>
                ) : (
                  <>Showing 1 to {Math.min(4, classes.length)} of {classes.length} results</>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">←</button>
                <button className="px-3 py-1 bg-green-600 text-white rounded">1</button>
                <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">2</button>
                <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">3</button>
                <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">→</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Edit Class</h2>
            <form onSubmit={handleUpdateClass} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Class Name
                </label>
                <input
                  type="text"
                  value={formData.classTitle}
                  onChange={(e) => setFormData({ ...formData, classTitle: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department
                </label>
                <select
                  value={formData.departmentId}
                  onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                >
                  <option value="">Select a department</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingClass(null)
                    setFormData({ classTitle: '', departmentId: '' })
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors"
                >
                  Update Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
