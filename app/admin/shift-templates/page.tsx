'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'
import { Plus, Pencil, Trash2, Clock, Download, Info } from 'lucide-react'
import { Shift } from '@prisma/client'

interface ShiftTemplate {
  id: string
  name: string
  studyMode: Shift
  startTime: string
  endTime: string
  duration: number
  isBreak: boolean
  isActive: boolean
  shiftBlocks: ShiftBlock[]
}

interface ShiftBlock {
  id: string
  dayOfWeek: string
}

export default function ShiftTemplatesPage() {
  const [studyMode, setStudyMode] = useState<Shift>('FULL_TIME')
  const [shiftTemplates, setShiftTemplates] = useState<ShiftTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<ShiftTemplate | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    startTime: '',
    endTime: '',
    isBreak: false,
    dayOfWeeks: [] as string[]
  })

  const dayOptions = [
    { value: 'SATURDAY', label: 'Saturday' },
    { value: 'SUNDAY', label: 'Sunday' },
    { value: 'MONDAY', label: 'Monday' },
    { value: 'TUESDAY', label: 'Tuesday' },
    { value: 'WEDNESDAY', label: 'Wednesday' },
    { value: 'THURSDAY', label: 'Thursday' },
    { value: 'FRIDAY', label: 'Friday' }
  ]

  useEffect(() => {
    fetchShiftTemplates()
  }, [studyMode])

  const fetchShiftTemplates = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/shift-templates?studyMode=${studyMode}`)
      if (response.ok) {
        const data = await response.json()
        setShiftTemplates(data)
      }
    } catch (error) {
      console.error('Error fetching shift templates:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins.toString().padStart(2, '0')}m`
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  const calculateTotalHours = () => {
    const totalMinutes = shiftTemplates
      .filter(t => !t.isBreak && t.isActive)
      .reduce((sum, t) => sum + t.duration, 0)
    return (totalMinutes / 60).toFixed(1)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.startTime || !formData.endTime) {
      alert('Please fill in all required fields')
      return
    }

    try {
      const response = await fetch('/api/shift-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          studyMode
        })
      })

      if (response.ok) {
        await fetchShiftTemplates()
        setShowCreateModal(false)
        setFormData({ name: '', startTime: '', endTime: '', isBreak: false, dayOfWeeks: [] })
      } else {
        const error = await response.json()
        console.error('API Error:', error)
        alert(error.error || error.details || 'Failed to create shift template')
      }
    } catch (error) {
      console.error('Error creating shift template:', error)
      alert(`Failed to create shift template: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const handleEdit = (template: ShiftTemplate) => {
    setEditingTemplate(template)
    setFormData({
      name: template.name,
      startTime: template.startTime,
      endTime: template.endTime,
      isBreak: template.isBreak,
      dayOfWeeks: template.shiftBlocks.map(b => b.dayOfWeek)
    })
    setShowEditModal(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTemplate) return

    try {
      const response = await fetch('/api/shift-templates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingTemplate.id,
          ...formData,
          studyMode
        })
      })

      if (response.ok) {
        await fetchShiftTemplates()
        setShowEditModal(false)
        setEditingTemplate(null)
        setFormData({ name: '', startTime: '', endTime: '', isBreak: false, dayOfWeeks: [] })
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update shift template')
      }
    } catch (error) {
      console.error('Error updating shift template:', error)
      alert('Failed to update shift template')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this shift template?')) return

    try {
      const response = await fetch(`/api/shift-templates?id=${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchShiftTemplates()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete shift template')
      }
    } catch (error) {
      console.error('Error deleting shift template:', error)
      alert('Failed to delete shift template')
    }
  }

  const toggleDayOfWeek = (day: string) => {
    setFormData(prev => ({
      ...prev,
      dayOfWeeks: prev.dayOfWeeks.includes(day)
        ? prev.dayOfWeeks.filter(d => d !== day)
        : [...prev.dayOfWeeks, day]
    }))
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
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Shift Template Management</h1>
          <p className="text-gray-600 mt-1">
            Manage and configure time blocks for full-time and part-time exams. Changes reflect globally across upcoming timetables.
          </p>
        </div>

        {/* Mode Selection and Add Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setStudyMode('FULL_TIME')}
              className={`px-6 py-2.5 rounded-lg font-medium transition-colors ${
                studyMode === 'FULL_TIME'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Full-time Mode
            </button>
            <button
              onClick={() => setStudyMode('PART_TIME')}
              className={`px-6 py-2.5 rounded-lg font-medium transition-colors ${
                studyMode === 'PART_TIME'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Part-time Mode
            </button>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add New Shift
          </button>
        </div>

        {/* Active Template Info */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-gray-700">ACTIVE TEMPLATE:</span>
              <span className="text-sm text-gray-900">2024 FALL SEMESTER</span>
              <button className="p-1 hover:bg-gray-100 rounded">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Shift Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">SHIFT NAME</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">START TIME</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">END TIME</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">DURATION</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {shiftTemplates.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">
                      No shift templates found. Click "Add New Shift" to create one.
                    </td>
                  </tr>
                ) : (
                  shiftTemplates.map((template) => (
                    <tr key={template.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{template.name}</span>
                          {template.isBreak && (
                            <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded">Break</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-700">{formatTime(template.startTime)}</td>
                      <td className="py-3 px-4 text-gray-700">{formatTime(template.endTime)}</td>
                      <td className="py-3 px-4 text-gray-700">{formatDuration(template.duration)}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(template)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(template.id)}
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

          {/* Summary */}
          <div className="mt-6 pt-6 border-t border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Info className="w-4 h-4 text-green-600" />
              <span>Total {shiftTemplates.filter(t => !t.isBreak && t.isActive).length} shift templates defined for {studyMode === 'FULL_TIME' ? 'Full-time' : 'Part-time'} mode.</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>Last updated: {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              <button className="text-green-600 hover:text-green-700 font-medium">DOWNLOAD CONFIG</button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Full-time Coverage</h3>
            <p className="text-3xl font-bold text-gray-900 mb-1">{calculateTotalHours()}h</p>
            <p className="text-sm text-green-600">+2.0h vs last term</p>
            <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-600 h-2 rounded-full" style={{ width: '75%' }}></div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Staff Required (Est.)</h3>
            <p className="text-3xl font-bold text-gray-900 mb-1">42</p>
            <p className="text-sm text-gray-500">Invigilators / Day</p>
            <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-600 h-2 rounded-full" style={{ width: '60%' }}></div>
            </div>
          </div>

          <div className="bg-green-600 rounded-lg shadow-sm border border-gray-200 p-6 text-white">
            <h3 className="text-sm font-medium mb-2">Need custom blocks?</h3>
            <p className="text-sm mb-4">Special shifts can be assigned to individual exam rooms via Settings.</p>
            <button className="bg-white text-green-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors">
              VIEW EXCEPTIONS
            </button>
          </div>
        </div>

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Add New Shift</h2>
              </div>
              <form onSubmit={handleCreate} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Shift Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., 01 Morning Shift"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                    <input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                    <input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                      required
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">Days of Week</label>
                    <button
                      type="button"
                      onClick={() => {
                        if (formData.dayOfWeeks.length === dayOptions.length) {
                          setFormData({ ...formData, dayOfWeeks: [] })
                        } else {
                          setFormData({ ...formData, dayOfWeeks: dayOptions.map(d => d.value) })
                        }
                      }}
                      className="text-xs text-green-600 hover:text-green-700 font-medium"
                    >
                      {formData.dayOfWeeks.length === dayOptions.length ? 'Uncheck All' : 'Check All'}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {dayOptions.map((day) => (
                      <label key={day.value} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.dayOfWeeks.includes(day.value)}
                          onChange={() => toggleDayOfWeek(day.value)}
                          className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-600"
                        />
                        <span className="text-sm text-gray-700">{day.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isBreak}
                    onChange={(e) => setFormData({ ...formData, isBreak: e.target.checked })}
                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-600"
                  />
                  <label className="text-sm text-gray-700">This is a break period (read-only)</label>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false)
                      setFormData({ name: '', startTime: '', endTime: '', isBreak: false, dayOfWeeks: [] })
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Save Shift
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && editingTemplate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Edit Shift</h2>
              </div>
              <form onSubmit={handleUpdate} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Shift Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., 01 Morning Shift"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                    <input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                    <input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                      required
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">Days of Week</label>
                    <button
                      type="button"
                      onClick={() => {
                        if (formData.dayOfWeeks.length === dayOptions.length) {
                          setFormData({ ...formData, dayOfWeeks: [] })
                        } else {
                          setFormData({ ...formData, dayOfWeeks: dayOptions.map(d => d.value) })
                        }
                      }}
                      className="text-xs text-green-600 hover:text-green-700 font-medium"
                    >
                      {formData.dayOfWeeks.length === dayOptions.length ? 'Uncheck All' : 'Check All'}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {dayOptions.map((day) => (
                      <label key={day.value} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.dayOfWeeks.includes(day.value)}
                          onChange={() => toggleDayOfWeek(day.value)}
                          className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-600"
                        />
                        <span className="text-sm text-gray-700">{day.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isBreak}
                    onChange={(e) => setFormData({ ...formData, isBreak: e.target.checked })}
                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-600"
                  />
                  <label className="text-sm text-gray-700">This is a break period (read-only)</label>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false)
                      setEditingTemplate(null)
                      setFormData({ name: '', startTime: '', endTime: '', isBreak: false, dayOfWeeks: [] })
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Update Shift
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
