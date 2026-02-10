'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Moon, ArrowRight, ArrowLeft, Trash2 } from 'lucide-react'
import Logo from '@/components/Logo'

interface Course {
  id: string
  name: string
  examType: string
}

export default function RegistrationFormPage({ params }: { params: { formId: string } }) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isClosed, setIsClosed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [formName, setFormName] = useState('')
  const [endDate, setEndDate] = useState<string | null>(null)

  useEffect(() => {
    // Check if registration is closed via API and get form details
    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/registration-forms/${params.formId}/status`)
        const data = await response.json()
        if (data.status === 'CLOSED') {
          setIsClosed(true)
          router.replace('/register/closed')
        }
        // Get full form details
        const formResponse = await fetch(`/api/registration-forms?id=${params.formId}`)
        if (formResponse.ok) {
          const formData = await formResponse.json()
          setFormName(formData.name || formData.formName || '')
          setEndDate(formData.endDate || null)
        }
        
        // Fetch classes only (departments are static)
        const classesRes = await fetch('/api/classes')
        if (classesRes.ok) {
          const classesData = await classesRes.json()
          setClasses(classesData)
        }
      } catch (error) {
        console.error('Error checking registration status:', error)
        setIsClosed(true)
        router.replace('/register/closed')
      } finally {
        setIsLoading(false)
      }
    }
    checkStatus()
  }, [params.formId, router])
  
  const [studentId, setStudentId] = useState('')
  const [fullName, setFullName] = useState('')
  const [department, setDepartment] = useState('') // Auto-set from class
  const [classId, setClassId] = useState('')
  const [semester, setSemester] = useState('')
  const [shift, setShift] = useState('fulltime')
  const [classes, setClasses] = useState<any[]>([])
  const [classSearchQuery, setClassSearchQuery] = useState('')
  const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false)
  const classDropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (classDropdownRef.current && !classDropdownRef.current.contains(event.target as Node)) {
        setIsClassDropdownOpen(false)
      }
    }

    if (isClassDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isClassDropdownOpen])
  
  const [examScope, setExamScope] = useState<'all-midterm' | 'all-final' | 'specific'>('specific')
  const [courses, setCourses] = useState<Course[]>([
    { id: '1', name: '', examType: 'Midterm' }
  ])
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleAddCourse = () => {
    setCourses([...courses, { id: Date.now().toString(), name: '', examType: 'Midterm' }])
  }

  const handleRemoveCourse = (id: string) => {
    setCourses(courses.filter(c => c.id !== id))
  }

  const handleCourseChange = (id: string, field: 'name' | 'examType', value: string) => {
    setCourses(courses.map(c => c.id === id ? { ...c, [field]: value } : c))
  }

  const handleNext = async () => {
    if (step === 1) {
      // Validate required fields (department is auto-set from class)
      if (!studentId || !fullName || !classId || !semester || !shift) {
        alert('Please fill in all required fields')
        return
      }
      
      // Ensure department is set from class
      if (!department) {
        alert('Please select a class to determine the department')
        return
      }

      setIsSubmitting(true)

      try {
        // Check if student has already registered for this form
        const existingRegResponse = await fetch(`/api/registrations?studentId=${studentId}&formId=${params.formId}`)
        if (existingRegResponse.ok) {
          const existingRegs = await existingRegResponse.json()
          if (existingRegs && existingRegs.length > 0) {
            alert('You have already registered for this exam. Each student can only register once per form.')
            setIsSubmitting(false)
            return
          }
        }

        // Step 1: Save student info
        console.log('[Registration] Saving student info:', { studentId, fullName, department, classId, semester, shift })
        
        const saveResponse = await fetch('/api/students', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId,
            fullName,
            department,
            classId,
            semester,
            shift,
          }),
        })
        
        if (!saveResponse.ok) {
          const errorData = await saveResponse.json()
          console.error('[Registration] Save error:', errorData)
          const errorMsg = errorData.error || errorData.details || 'Failed to save student information'
          alert(`Error: ${errorMsg}\n\nPlease check the browser console (F12) for more details.`)
          setIsSubmitting(false)
          return
        }
        
        const savedStudent = await saveResponse.json()
        console.log('[Registration] Student saved successfully:', savedStudent)

        // Step 2: Verify by reading back the student data
        const readResponse = await fetch(`/api/students?studentId=${studentId}`)
        if (!readResponse.ok) {
          console.warn('[Registration] Could not verify student, but continuing...')
        } else {
          const verifiedStudent = await readResponse.json()
          console.log('[Registration] Student verified:', verifiedStudent)
        }

        // Step 3: Proceed to next step
        setStep(2)
        setIsSubmitting(false)
      } catch (error) {
        console.error('[Registration] Error saving student info:', error)
        setIsSubmitting(false)
        alert(`Failed to save student information: ${error instanceof Error ? error.message : 'Network error. Please check your connection.'}`)
      }
    }
  }

  const handleBack = () => {
    if (step === 2) {
      setStep(1)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Prepare registration data
      const registrationData = {
        registrationFormId: params.formId,
        studentId,
        examScope,
        reason,
        documentUrl: null,
        courses: examScope === 'specific' ? courses.filter(c => c.name.trim() !== '') : undefined,
      }

      const response = await fetch('/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to submit registration')
      }

      router.push(`/register/${params.formId}/success`)
    } catch (error) {
      console.error('Error submitting registration:', error)
      alert(error instanceof Error ? error.message : 'Failed to submit registration. Please try again.')
      setIsSubmitting(false)
    }
  }

  // Show loading while checking status
  if (isLoading || isClosed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <Logo size="sm" showText={false} />
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-gray-900">Student Portal</h1>
              <p className="text-xs sm:text-sm text-gray-600">Special Exam Registration System</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </header>

      {/* Progress Indicator */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-2 sm:gap-4">
          <div className={`flex items-center gap-2 sm:gap-3 ${step >= 1 ? 'text-primary' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 text-sm sm:text-base ${
              step >= 1 ? 'bg-primary border-primary text-white' : 'border-gray-300'
            }`}>
              {step > 1 ? '✓' : '1'}
            </div>
            <span className="font-medium text-xs sm:text-sm md:text-base">Student Information</span>
          </div>
          <div className={`flex-1 h-1 ${step >= 2 ? 'bg-primary' : 'bg-gray-200'}`}></div>
          <div className={`flex items-center gap-2 sm:gap-3 ${step >= 2 ? 'text-primary' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 text-sm sm:text-base ${
              step >= 2 ? 'bg-primary border-primary text-white' : 'border-gray-300'
            }`}>
              2
            </div>
            <span className="font-medium text-xs sm:text-sm md:text-base">Exam Details</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-4 sm:p-6">
        {/* Form Name and End Date */}
        {formName && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">{formName}</h2>
                {endDate && (
                  <p className="text-xs sm:text-sm text-gray-600">
                    Registration closes: <span className="font-semibold text-gray-900">{new Date(endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 md:p-8">
          {step === 1 && (
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Student Information</h2>
              <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
                Please enter your academic information as it appears in the university records.
              </p>
              <form onSubmit={(e) => { e.preventDefault(); handleNext(); }} className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Student ID Number
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={studentId}
                        onChange={(e) => setStudentId(e.target.value)}
                        placeholder="e.g. 138989"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="As written on your ID card"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Class
                    </label>
                    <div className="relative" ref={classDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setIsClassDropdownOpen(!isClassDropdownOpen)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-left flex items-center justify-between bg-white"
                      >
                        <span className={classId ? 'text-gray-900' : 'text-gray-500'}>
                          {classId 
                            ? classes.find(c => c.id === classId)?.classTitle || 'Select Class'
                            : 'Select Class'}
                        </span>
                        <svg
                          className={`w-5 h-5 text-gray-400 transition-transform ${isClassDropdownOpen ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      {isClassDropdownOpen && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 sm:max-h-60 overflow-hidden">
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
                          <div className="overflow-y-auto max-h-48 sm:max-h-48">
                            {classes
                              .filter((cls) => {
                                // Filter by search query only
                                if (classSearchQuery) {
                                  return cls.classTitle.toLowerCase().includes(classSearchQuery.toLowerCase())
                                }
                                return true
                              })
                              .length === 0 ? (
                                <div className="px-4 py-3 text-sm text-gray-500 text-center">
                                  No class found
                                </div>
                              ) : (
                                classes
                                  .filter((cls) => {
                                    // Filter by search query only
                                    if (classSearchQuery) {
                                      return cls.classTitle.toLowerCase().includes(classSearchQuery.toLowerCase())
                                    }
                                    return true
                                  })
                                  .map((cls) => (
                                    <button
                                      key={cls.id}
                                      type="button"
                                      onClick={() => {
                                        setClassId(cls.id)
                                        // Auto-set department from selected class
                                        if (cls.department) {
                                          setDepartment(cls.department)
                                        }
                                        setIsClassDropdownOpen(false)
                                        setClassSearchQuery('')
                                      }}
                                      className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors ${
                                        classId === cls.id ? 'bg-primary text-white hover:bg-primary-dark' : 'text-gray-900'
                                      }`}
                                    >
                                      <div>
                                        <div className="font-medium">{cls.classTitle}</div>
                                        {cls.department && (
                                          <div className="text-xs text-gray-500 mt-0.5">{cls.department}</div>
                                        )}
                                      </div>
                                    </button>
                                  ))
                              )}
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Hidden input for form validation */}
                    <input
                      type="hidden"
                      value={classId}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Semester
                    </label>
                    <select
                      value={semester}
                      onChange={(e) => setSemester(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      required
                    >
                      <option value="">Select Semester</option>
                      <option value="1">Semester 1</option>
                      <option value="2">Semester 2</option>
                      <option value="3">Semester 3</option>
                      <option value="4">Semester 4</option>
                      <option value="5">Semester 5</option>
                      <option value="6">Semester 6</option>
                      <option value="7">Semester 7</option>
                      <option value="8">Semester 8</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Study Time
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {[
                      { value: 'fulltime', label: 'Full Time', time: 'Full-time student' },
                      { value: 'parttime', label: 'Part Time', time: 'Part-time student' },
                    ].map((option) => (
                      <label
                        key={option.value}
                        className={`border-2 rounded-lg p-3 sm:p-4 cursor-pointer transition-colors ${
                          shift === option.value
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 sm:gap-3">
                          <input
                            type="radio"
                            name="shift"
                            value={option.value}
                            checked={shift === option.value}
                            onChange={(e) => setShift(e.target.value)}
                            className="w-4 h-4 text-primary border-gray-300 focus:ring-primary flex-shrink-0"
                          />
                          <div>
                            <div className="font-medium text-sm sm:text-base text-gray-900">{option.label}</div>
                            <div className="text-xs sm:text-sm text-gray-500">{option.time}</div>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="w-full sm:w-auto bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors text-sm sm:text-base"
                  >
                    Next Step
                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
              </form>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Select Exam Requirements</h2>
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                {/* Exam Scope */}
                <div>
                  <p className="text-sm text-gray-600 mb-3 sm:mb-4">
                    Please select the type of exam you are registering for.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {[
                      { value: 'all-midterm', label: 'All Midterm Exams', desc: 'All midterm exams for the semester' },
                      { value: 'all-final', label: 'All Final Exams', desc: 'All final exams for the semester' },
                      { value: 'specific', label: 'Specific Courses', desc: 'Select specific courses' },
                    ].map((option) => (
                      <label
                        key={option.value}
                        className={`border-2 rounded-lg p-3 sm:p-4 cursor-pointer transition-colors relative ${
                          examScope === option.value
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="examScope"
                          value={option.value}
                          checked={examScope === option.value}
                          onChange={(e) => setExamScope(e.target.value as 'all-midterm' | 'all-final' | 'specific')}
                          className="sr-only"
                        />
                        {examScope === option.value && (
                          <div className="absolute top-2 right-2 w-5 h-5 sm:w-6 sm:h-6 bg-primary rounded-full flex items-center justify-center">
                            <span className="text-white text-xs sm:text-sm">✓</span>
                          </div>
                        )}
                        <div className="font-medium text-sm sm:text-base text-gray-900 mb-1 pr-6 sm:pr-8">{option.label}</div>
                        <div className="text-xs sm:text-sm text-gray-500">{option.desc}</div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Course List */}
                {examScope === 'specific' && (
                  <div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4 gap-2">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900">COURSE LIST</h3>
                      <button
                        type="button"
                        onClick={handleAddCourse}
                        className="text-primary hover:text-primary-dark font-medium flex items-center gap-1 text-sm sm:text-base"
                      >
                        <span className="text-lg sm:text-xl">+</span>
                        Add Course
                      </button>
                    </div>
                    <div className="space-y-3 sm:space-y-4">
                      {courses.map((course) => (
                        <div key={course.id} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
                          <input
                            type="text"
                            value={course.name}
                            onChange={(e) => handleCourseChange(course.id, 'name', e.target.value)}
                            placeholder="e.g., Introduction to Computer Science"
                            className="flex-1 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm sm:text-base"
                          />
                          <select
                            value={course.examType}
                            onChange={(e) => handleCourseChange(course.id, 'examType', e.target.value)}
                            className="px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm sm:text-base"
                          >
                            <option>Midterm</option>
                            <option>Final</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => handleRemoveCourse(course.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors self-start sm:self-auto"
                          >
                            <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reason */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Request
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={5}
                    placeholder="Please provide a detailed explanation for your special exam request..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-y"
                    required
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between pt-4 gap-3 sm:gap-0">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium flex items-center justify-center gap-2 transition-colors text-sm sm:text-base"
                  >
                    <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                    Back to Step 1
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto bg-primary hover:bg-primary-dark text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Registration'}
                    {!isSubmitting && <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-8 sm:mt-12 pb-6 sm:pb-8 text-center px-4">
        <p className="text-xs sm:text-sm text-gray-600">
          Having issues? Contact the FECT administration office{' '}
          <a href="mailto:fect_fa@siu.edu.so" className="text-primary hover:underline break-all">
            fect_fa@siu.edu.so
          </a>
          {' '}or call 0613999945
        </p>
      </footer>
    </div>
  )
}
