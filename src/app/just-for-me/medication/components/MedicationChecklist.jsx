'use client'

import { useMedications } from '@/contexts/MedicationContext'
import { getChecklistData, formatTimeSlot } from '@/utils/medicationScheduler'

export default function MedicationChecklist() {
  const { medications, logs, toggleLogTaken } = useMedications()

  // Calculate date range: 7 days back to 7 days forward
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() - 7)
  startDate.setHours(0, 0, 0, 0)
  
  const endDate = new Date(today)
  endDate.setDate(endDate.getDate() + 7)
  endDate.setHours(23, 59, 59, 999)

  // Get checklist data
  const checklistData = getChecklistData(medications, logs, startDate, endDate)

  const handleToggle = async (medicationId, scheduledDate, scheduledTime, timeNumber) => {
    try {
      await toggleLogTaken(medicationId, scheduledDate, scheduledTime, timeNumber)
    } catch (error) {
      console.error('Failed to toggle log:', error)
      alert('Failed to update medication log: ' + error.message)
    }
  }

  const isTaken = (medicationId, scheduledDate, scheduledTime, timeNumber) => {
    const log = logs.find(l => 
      l.medicationId === medicationId &&
      l.scheduledDate === scheduledDate &&
      (scheduledTime ? l.scheduledTime === scheduledTime : l.timeNumber === timeNumber) &&
      l.takenAt
    )
    return !!log
  }

  const getMedicationsForSlot = (date, timeSlot) => {
    const schedules = checklistData.schedulesByDate[date] || []
    return schedules.filter(s => {
      const slotKey = s.scheduledTime || `#${s.timeNumber}`
      return slotKey === timeSlot
    })
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const checkDate = new Date(date)
    checkDate.setHours(0, 0, 0, 0)
    
    const isToday = checkDate.getTime() === today.getTime()
    const isPast = checkDate < today
    
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })
    const monthDay = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    
    return {
      display: `${dayName}, ${monthDay}`,
      isToday,
      isPast
    }
  }

  if (medications.length === 0) {
    return (
      <div className="text-center py-16 bg-gradient-to-br from-white to-gray-50 dark:from-slate-800 dark:to-slate-900 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 mb-4">
          <svg className="w-8 h-8 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        </div>
        <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">
          Add medications to see your checklist here.
        </p>
      </div>
    )
  }

  if (checklistData.dates.length === 0) {
    return (
      <div className="text-center py-16 bg-gradient-to-br from-white to-gray-50 dark:from-slate-800 dark:to-slate-900 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-100 dark:bg-yellow-900/30 mb-4">
          <svg className="w-8 h-8 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">
          No scheduled doses in this date range.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <div className="inline-block min-w-full align-middle">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
          <thead className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-slate-900 dark:to-slate-800">
            <tr>
              <th className="px-2 sm:px-4 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider sticky left-0 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-slate-900 dark:to-slate-800 z-10 min-w-[100px] sm:min-w-[120px] border-r border-gray-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Date
                </div>
              </th>
              {checklistData.timeSlots.map(timeSlot => (
                <th
                  key={timeSlot}
                  className="px-2 sm:px-4 py-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider min-w-[80px] sm:min-w-[100px]"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {formatTimeSlot(timeSlot)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
            {checklistData.dates.map(date => {
              const dateInfo = formatDate(date)
              return (
                <tr
                  key={date}
                  className={`
                    ${dateInfo.isToday ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}
                    ${dateInfo.isPast ? 'opacity-60' : ''}
                  `}
                >
                  <td className={`px-2 sm:px-4 py-4 whitespace-nowrap text-xs sm:text-sm font-semibold text-gray-900 dark:text-white sticky left-0 ${dateInfo.isToday ? 'bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30' : 'bg-white dark:bg-slate-800'} z-10 border-r border-gray-200 dark:border-slate-700`}>
                    <div className="flex flex-col">
                      <span className={dateInfo.isToday ? 'text-indigo-700 dark:text-indigo-300 font-bold' : ''}>{dateInfo.display.split(',')[0]}</span>
                      <span className={`text-xs ${dateInfo.isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400'}`}>{dateInfo.display.split(',')[1]?.trim()}</span>
                    </div>
                    {dateInfo.isToday && (
                      <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 text-[10px] font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full">
                        <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Today
                      </span>
                    )}
                  </td>
                  {checklistData.timeSlots.map(timeSlot => {
                    const schedules = getMedicationsForSlot(date, timeSlot)
                    if (schedules.length === 0) {
                      return (
                        <td key={timeSlot} className="px-2 sm:px-4 py-3 text-center">
                          {/* Empty cell */}
                        </td>
                      )
                    }

                    return (
                      <td key={timeSlot} className="px-2 sm:px-4 py-2 sm:py-3 text-center">
                        <div className="flex flex-col items-center gap-2">
                          {schedules.map(schedule => {
                            const taken = isTaken(schedule.medicationId, schedule.date, schedule.scheduledTime, schedule.timeNumber)
                            const medication = medications.find(m => m.id === schedule.medicationId)
                            if (!medication) return null

                            return (
                              <div key={`${schedule.medicationId}-${schedule.date}-${schedule.scheduledTime || schedule.timeNumber}`} className={`flex flex-col items-center p-2 rounded-lg transition-all duration-200 ${taken ? 'bg-green-50 dark:bg-green-900/20' : 'bg-gray-50 dark:bg-slate-700/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'}`}>
                                <label className="flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={taken}
                                    onChange={() => handleToggle(
                                      schedule.medicationId,
                                      schedule.date,
                                      schedule.scheduledTime,
                                      schedule.timeNumber
                                    )}
                                    className="w-5 h-5 text-indigo-600 border-gray-300 dark:border-slate-600 rounded focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 cursor-pointer transition-colors duration-200"
                                  />
                                </label>
                                <div className="mt-2 text-[10px] sm:text-xs text-center min-w-[60px]">
                                  <div className={`font-semibold break-words ${taken ? 'text-green-700 dark:text-green-400 line-through' : 'text-gray-800 dark:text-gray-200'}`}>
                                    {medication.name}
                                    {(schedule.numberToTake || medication.numberToTake) > 1 && (
                                      <span className={`ml-1 ${taken ? 'text-green-600 dark:text-green-500' : 'text-indigo-600 dark:text-indigo-400'}`}> ({(schedule.numberToTake || medication.numberToTake)})</span>
                                    )}
                                  </div>
                                  <div className={`text-[9px] sm:text-xs mt-0.5 ${taken ? 'text-green-600 dark:text-green-500' : 'text-gray-600 dark:text-gray-400'}`}>{medication.dosage}</div>
                                  {medication.withFood && (
                                    <div className="mt-1">
                                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-[10px]">🍽️</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

