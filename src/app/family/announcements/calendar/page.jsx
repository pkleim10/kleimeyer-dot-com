'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase'
import { usePermissions } from '@/hooks/usePermissions'

export default function AppointmentsPage() {
  const { user, loading: authLoading } = useAuth()
  const { canViewFamily, permissionsLoading } = usePermissions()
  const router = useRouter()

  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode] = useState('calendar') // 'calendar' or 'list'

  // Helper function to calculate next occurrence for recurring appointments
  const getNextRecurringOccurrence = useCallback((appointment, targetDate) => {
    if (!appointment.is_recurring || !appointment.recurrence_start_date || !appointment.recurrence_end_date || !appointment.recurrence_time || !appointment.recurrence_days || appointment.recurrence_days.length === 0) {
      return null
    }

    // Parse dates as local dates (not UTC) to avoid timezone issues
    const startDate = new Date(appointment.recurrence_start_date + 'T00:00:00')
    const endDate = new Date(appointment.recurrence_end_date + 'T23:59:59')
    const [hours, minutes] = appointment.recurrence_time.split(':').map(Number)
    
    // If target date is past the end date, no more occurrences
    if (targetDate > endDate) {
      return null
    }

    // Find the next occurrence from target date
    let currentDate = new Date(Math.max(targetDate, startDate))
    const maxIterations = 365 // Prevent infinite loops
    let iterations = 0

    while (iterations < maxIterations) {
      const dayOfWeek = currentDate.getDay()
      
      // Check if current date is one of the recurring days
      if (appointment.recurrence_days.includes(dayOfWeek)) {
        // Create the appointment datetime for this day
        const appointmentDateTime = new Date(currentDate)
        appointmentDateTime.setHours(hours, minutes, 0, 0)
        
        // If this appointment is within the end date, return it
        if (appointmentDateTime <= endDate) {
          return appointmentDateTime
        }
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1)
      iterations++
    }

    return null
  }, [])

  // Helper function to get all occurrences of recurring appointments for a given month
  const getRecurringOccurrencesForMonth = useCallback((appointment, year, month) => {
    if (!appointment.is_recurring) return []

    const occurrences = []
    const startDate = new Date(year, month, 1)
    const endDate = new Date(year, month + 1, 0) // Last day of month
    
    // Parse dates as local dates (not UTC) to avoid timezone issues
    const appointmentStartDate = new Date(appointment.recurrence_start_date + 'T00:00:00')
    const appointmentEndDate = new Date(appointment.recurrence_end_date + 'T23:59:59')
    
    // Adjust dates to month boundaries
    const actualStartDate = new Date(Math.max(startDate, appointmentStartDate))
    const actualEndDate = new Date(Math.min(endDate, appointmentEndDate))
    
    const [hours, minutes] = appointment.recurrence_time.split(':').map(Number)
    
    for (let date = new Date(actualStartDate); date <= actualEndDate; date.setDate(date.getDate() + 1)) {
      const dayOfWeek = date.getDay()
      
      if (appointment.recurrence_days.includes(dayOfWeek)) {
        const occurrenceDate = new Date(date)
        occurrenceDate.setHours(hours, minutes, 0, 0)
        occurrences.push(occurrenceDate)
      }
    }
    
    return occurrences
  }, [])

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Not authenticated')
        return
      }

      const response = await fetch('/api/family/bulletins?category=appointment&status=active', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('API Error:', errorData)
        setError('Failed to load appointments')
        return
      }

      const { bulletins } = await response.json()
      setAppointments(bulletins || [])
    } catch (err) {
      console.error('Error fetching appointments:', err)
      setError('Failed to load appointments')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Simple auth check - redirect if no user
    if (!authLoading && !user) {
      router.push('/login?redirect=/family/announcements/calendar')
      return
    }
    
    // Permission check - redirect if user doesn't have family permissions
    if (!authLoading && !permissionsLoading && user && !canViewFamily) {
      router.push('/')
      return
    }
    
    // If user is authenticated and has permissions, load appointments
    if (!authLoading && !permissionsLoading && user && canViewFamily) {
      fetchAppointments()
    }
  }, [user, authLoading, permissionsLoading, canViewFamily, router, fetchAppointments])

  // Generate calendar data for current month
  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    
    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startDay = firstDay.getDay() // 0 = Sunday
    
    // Create calendar grid
    const calendar = []
    let currentWeek = []
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startDay; i++) {
      currentWeek.push(null)
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const dayAppointments = []
      
      // Check regular appointments
      appointments.forEach(appointment => {
        if (!appointment.is_recurring && appointment.appointment_datetime) {
          const appointmentDate = new Date(appointment.appointment_datetime)
          if (appointmentDate.toDateString() === date.toDateString()) {
            dayAppointments.push({
              ...appointment,
              occurrenceDate: appointmentDate
            })
          }
        }
      })
      
      // Check recurring appointments
      appointments.forEach(appointment => {
        if (appointment.is_recurring) {
          const occurrences = getRecurringOccurrencesForMonth(appointment, year, month)
          occurrences.forEach(occurrence => {
            if (occurrence.toDateString() === date.toDateString()) {
              dayAppointments.push({
                ...appointment,
                occurrenceDate: occurrence
              })
            }
          })
        }
      })
      
      currentWeek.push({
        date,
        day,
        appointments: dayAppointments.sort((a, b) => a.occurrenceDate - b.occurrenceDate)
      })
      
      // If we've filled a week, add it and start a new one
      if (currentWeek.length === 7) {
        calendar.push(currentWeek)
        currentWeek = []
      }
    }
    
    // Add remaining days if week is not complete
    if (currentWeek.length > 0) {
      // Fill remaining days with null
      while (currentWeek.length < 7) {
        currentWeek.push(null)
      }
      calendar.push(currentWeek)
    }
    
    return calendar
  }, [currentDate, appointments, getRecurringOccurrencesForMonth])

  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1)
      } else {
        newDate.setMonth(newDate.getMonth() + 1)
      }
      return newDate
    })
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const printCalendar = () => {
    window.print()
  }

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Phoenix'
    })
  }

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  }

  // Show loading while auth and permissions are being determined
  if (authLoading || permissionsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-gray-900 dark:text-gray-100">
            Loading...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="no-print bg-white dark:bg-slate-800 shadow-sm border-b border-gray-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                Calendar
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                View and manage family appointments in calendar format
              </p>
            </div>
            <div className="mt-4 sm:mt-0 sm:ml-4">
              <button
                onClick={printCalendar}
                className="print-button inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Calendar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Message */}
        {error && (
          <div className="no-print mb-6 rounded-md bg-red-50 dark:bg-red-900/30 p-4">
            <div className="flex">
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-300">
                  Error
                </h3>
                <div className="mt-2 text-sm text-red-700 dark:text-red-400">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-gray-900 dark:text-gray-100">
              Loading appointments...
            </div>
          </div>
        ) : (
          /* Calendar View */
          <div className="print-calendar bg-white dark:bg-slate-800 rounded-lg shadow-lg overflow-hidden">
            {/* Calendar Header */}
            <div className="calendar-header px-6 py-4 border-b border-gray-200 dark:border-slate-700">
              {/* Navigation - hidden when printing */}
              <div className="calendar-nav no-print flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => navigateMonth('prev')}
                    className="nav-button p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <h2 className="nav-title text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </h2>
                  <button
                    onClick={() => navigateMonth('next')}
                    className="nav-button p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
                <button
                  onClick={goToToday}
                  className="nav-button px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Today
                </button>
              </div>
              
              {/* Print-only header - only visible when printing */}
              <div className="print-header text-center" style={{ display: 'none' }}>
                <h1 className="text-xl font-bold text-black">
                  Appointment Calendar - {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h1>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="p-6">
              {/* Day Headers */}
              <div className="calendar-grid grid grid-cols-7 gap-px bg-gray-200 dark:bg-slate-700 mb-4">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="day-header bg-gray-50 dark:bg-slate-800 px-4 py-3 text-center text-sm font-medium text-gray-900 dark:text-gray-100">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="calendar-grid grid grid-cols-7 gap-px bg-gray-200 dark:bg-slate-700">
                {calendarData.map((week, weekIndex) =>
                  week.map((day, dayIndex) => (
                    <div
                      key={`${weekIndex}-${dayIndex}`}
                      className={`calendar-day min-h-[120px] bg-white dark:bg-slate-800 p-2 ${
                        day && day.date.toDateString() === new Date().toDateString()
                          ? 'today bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500'
                          : ''
                      }`}
                    >
                      {day ? (
                        <>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                            {day.day}
                          </div>
                          <div className="space-y-1">
                            {day.appointments.map((appointment, index) => (
                              <div
                                key={`${appointment.id}-${index}`}
                                className="appointment-item text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-2 py-1 rounded truncate"
                                title={`${appointment.title} - ${formatTime(appointment.occurrenceDate)}`}
                              >
                                <div className="font-medium truncate">{appointment.title}</div>
                                <div className="text-blue-600 dark:text-blue-400">
                                  {formatTime(appointment.occurrenceDate)}
                                </div>
                                {appointment.appointment_location && (
                                  <div className="text-blue-600 dark:text-blue-400 truncate">
                                    {appointment.appointment_location}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 0.25in;
          }
          
          body {
            margin: 0;
            padding: 0;
            background: white !important;
            color: black !important;
            height: 100vh;
            overflow: hidden;
          }
          
          * {
            page-break-after: avoid !important;
            page-break-before: avoid !important;
          }
          
          .print-calendar {
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border: 2px solid #000 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            // max-height: 100vh !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          
          .calendar-nav {
            display: none !important;
          }
          
          .print-header {
            display: block !important;
            padding: 0.125rem !important;
            background: #f3f4f6 !important;
            // border-bottom: 2px solid #000 !important;
            margin-bottom: 0.125rem !important;
          }
          
          /* Hide everything except calendar */
          .no-print,
          nav,
          header,
          footer,
          button:not(.print-button) {
            display: none !important;
          }
          
          /* Keep print button visible */
          .print-button {
            display: inline-flex !important;
          }
          
          .print-calendar .p-6 {
            padding: 0.125rem !important;
          }
          
          .print-calendar .calendar-grid {
            border: 2px solid #000 !important;
            margin: 0 !important;
            margin-bottom: 0 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          
          .print-calendar .day-header {
            background: #e5e7eb !important;
            border: 1px solid #000 !important;
            font-weight: bold !important;
            padding: 0.25rem !important;
            font-size: 0.875rem !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          
          .print-calendar .calendar-day {
            border: 1px solid #000 !important;
            min-height: 100px !important;
            padding: 0.25rem !important;
            background: white !important;
            font-size: 0.75rem !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          
          .print-calendar .appointment-item {
            background: #dbeafe !important;
            border: 1px solid #3b82f6 !important;
            color: #1e40af !important;
            margin-bottom: 0.25rem !important;
            padding: 0.25rem !important;
            font-size: 0.75rem !important;
          }
          
          .print-calendar .today {
            background: #fef3c7 !important;
            border: 2px solid #f59e0b !important;
          }
          
          .print-title {
            text-align: center !important;
            font-size: 1.5rem !important;
            font-weight: bold !important;
            margin-bottom: 1rem !important;
            color: black !important;
          }
          
          .print-month-year {
            text-align: center !important;
            font-size: 1.25rem !important;
            font-weight: bold !important;
            color: black !important;
          }
        }
      `}</style>
    </div>
  )
}
