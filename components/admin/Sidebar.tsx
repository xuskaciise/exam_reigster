'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  ClipboardList, 
  Users, 
  ShieldCheck, 
  BarChart3, 
  Link2, 
  Settings,
  LogOut,
  Moon,
  Building2,
  Clock,
  Calendar,
  CalendarDays,
  BookOpen,
  User,
  FileText
} from 'lucide-react'
import { useState, useEffect } from 'react'
import Logo from '@/components/Logo'

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number
}

export default function Sidebar() {
  const pathname = usePathname()
  const [darkMode, setDarkMode] = useState(false)
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0)

  useEffect(() => {
    // Fetch pending approvals count
    const fetchPendingCount = async () => {
      try {
        const response = await fetch('/api/registrations?status=pending')
        if (response.ok) {
          const data = await response.json()
          setPendingApprovalsCount(data.length)
        }
      } catch (error) {
        console.error('Error fetching pending approvals count:', error)
      }
    }

    fetchPendingCount()
    // Refresh count every 30 seconds
    const interval = setInterval(fetchPendingCount, 30000)
    return () => clearInterval(interval)
  }, [])

  const navItems: NavItem[] = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Registration Forms', href: '/admin/registration-forms', icon: ClipboardList },
    { name: 'Student Requests', href: '/admin/student-requests', icon: Users },
    { name: 'Approvals', href: '/admin/approvals', icon: ShieldCheck, badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined },
  ]

  const toolItems: NavItem[] = [
    { name: 'Reports', href: '/admin/reports', icon: BarChart3 },
    { name: 'Timetable Reports', href: '/admin/timetable-reports', icon: FileText },
    { name: 'Shift Timetable Report', href: '/admin/shift-timetable-report', icon: CalendarDays },
    { name: 'Open/Close Registration', href: '/admin/registration-control', icon: Link2 },
    { name: 'Departments', href: '/admin/departments', icon: Building2 },
    { name: 'Classes', href: '/admin/classes', icon: Users },
    { name: 'Courses', href: '/admin/courses', icon: BookOpen },
    { name: 'Lecturers', href: '/admin/lecturers', icon: User },
    { name: 'Shift Templates', href: '/admin/shift-templates', icon: Clock },
    { name: 'Academic Calendar', href: '/admin/academic-calendar', icon: Calendar },
    { name: 'Timetables', href: '/admin/timetables', icon: CalendarDays },
    { name: 'User Management', href: '/admin/user-management', icon: Users },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
  ]

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen">
      {/* Logo Section */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col items-center">
          <Logo size="sm" showText={false} />
        </div>
      </div>

      {/* Main Menu */}
      <div className="flex-1 overflow-y-auto py-4">
        <div className="px-4 mb-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">MAIN MENU</h3>
        </div>
        <nav className="space-y-1 px-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="flex-1">{item.name}</span>
                {item.badge && (
                  <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Tools Section */}
        <div className="px-4 mt-6 mb-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">TOOLS</h3>
        </div>
        <nav className="space-y-1 px-2">
          {toolItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-gray-200 space-y-2">
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Moon className="w-5 h-5" />
          <span>Toggle Theme</span>
        </button>
        <button
          onClick={async () => {
            await fetch('/api/auth/logout', { method: 'POST' })
            window.location.href = '/admin/login'
          }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  )
}
