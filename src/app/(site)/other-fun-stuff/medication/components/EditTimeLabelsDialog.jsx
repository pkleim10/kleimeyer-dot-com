'use client'

import { useState, useEffect } from 'react'
import { useGroups } from '@/contexts/GroupContext'
import { sortTimesByDayBoundary } from '@/utils/medicationScheduler'

export default function EditTimeLabelsDialog({ isOpen, onClose, group, medications }) {
  const { updateGroup } = useGroups()
  const [timeLabels, setTimeLabels] = useState({})
  const [uniqueTimes, setUniqueTimes] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Format time for display
  const formatTimeForDisplay = (timeKey) => {
    if (timeKey.match(/^\d{2}:\d{2}$/)) {
      // Specific time format HH:MM - convert to 12-hour format
      const [h, m] = timeKey.split(':')
      const hour = parseInt(h)
      const minutes = parseInt(m)
      const ampm = hour >= 12 ? 'pm' : 'am'
      const displayHour = hour % 12 || 12
      
      if (minutes === 0) {
        return `${displayHour}${ampm}`
      } else {
        return `${displayHour}:${m}${ampm}`
      }
    }
    
    // Named times
    if (timeKey === 'morning') return 'In the morning'
    if (timeKey === 'evening') return 'In the evening'
    if (timeKey === 'bedtime') return 'At bedtime'
    
    return timeKey
  }

  // Collect unique times from medications
  useEffect(() => {
    if (!isOpen || !medications || medications.length === 0) {
      setUniqueTimes([])
      return
    }

    const timesSet = new Set()
    
    // Extract all specific times from medications
    medications.forEach(medication => {
      if (medication.frequencyType === 'specific_times' && medication.specificTimes) {
        medication.specificTimes.forEach(time => {
          timesSet.add(time)
        })
      }
    })

    // Convert to array and sort
    const timesArray = Array.from(timesSet)
    const dayStartTime = group?.dayStartTime ? group.dayStartTime.substring(0, 5) : '06:00'
    const dayEndTime = group?.dayEndTime ? group.dayEndTime.substring(0, 5) : '23:59'
    const sortedTimes = sortTimesByDayBoundary(timesArray, dayStartTime, dayEndTime)
    
    setUniqueTimes(sortedTimes)
  }, [isOpen, medications, group])

  // Load existing labels when dialog opens
  useEffect(() => {
    if (isOpen && group) {
      setTimeLabels(group.timeLabels || {})
      setError('')
    }
  }, [isOpen, group])

  const handleLabelChange = (timeKey, label) => {
    setTimeLabels(prev => {
      const updated = { ...prev }
      if (label === '') {
        // Remove label if empty
        delete updated[timeKey]
      } else {
        // Update label (max 50 characters) - don't trim during typing to allow spaces
        updated[timeKey] = label.substring(0, 50)
      }
      return updated
    })
  }

  const handleSave = async () => {
    try {
      setLoading(true)
      setError('')

      // Trim labels before saving (but allow spaces within labels)
      const trimmedLabels = {}
      Object.keys(timeLabels).forEach(key => {
        const trimmed = timeLabels[key].trim()
        if (trimmed !== '') {
          trimmedLabels[key] = trimmed
        }
      })

      await updateGroup(group.id, {
        timeLabels: trimmedLabels
      })

      onClose()
    } catch (err) {
      setError(err.message || 'Failed to save time labels')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setTimeLabels({})
    setError('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Semi-transparent backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleCancel}
        data-testid="modal-backdrop"
      />
      
      {/* Modal content */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Edit Time Labels
            </h3>
            <button
              onClick={handleCancel}
              disabled={loading}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {uniqueTimes.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-400">
                No medications with specific times found in this group.
              </p>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Add labels to identify time slots (e.g., &quot;Slot 1&quot;, &quot;Slot 2&quot;) for automatic pill dispensers.
                </p>
                
                {uniqueTimes.map(timeKey => {
                  const displayTime = formatTimeForDisplay(timeKey)
                  if (!displayTime) return null // Skip numbered times
                  
                  return (
                    <div key={timeKey} className="flex items-center gap-3">
                      <label className="flex-shrink-0 w-24 text-sm font-medium text-gray-700 dark:text-gray-300">
                        {displayTime}:
                      </label>
                      <input
                        type="text"
                        value={timeLabels[timeKey] || ''}
                        onChange={(e) => handleLabelChange(timeKey, e.target.value)}
                        placeholder="Enter label (e.g., Slot 1)"
                        maxLength={50}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        disabled={loading}
                      />
                    </div>
                  )
                })}
              </div>
            )}

            {error && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-slate-700">
            <button
              onClick={handleCancel}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading || uniqueTimes.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

