'use client'

import { useState, useEffect } from 'react'
import { useGroups } from '@/contexts/GroupContext'
import { usePermissions } from '@/hooks/usePermissions'

export default function GroupForm({ group, onSave, onCancel }) {
  const { addGroup, updateGroup } = useGroups()
  const { canCreateSharedMedicationGroups } = usePermissions()
  const [name, setName] = useState('')
  const [accessibleBy, setAccessibleBy] = useState('only_me')
  const [dayStartTime, setDayStartTime] = useState('06:00')
  const [dayEndTime, setDayEndTime] = useState('23:59')
  const [error, setError] = useState('')

  useEffect(() => {
    if (group) {
      setName(group.name || '')
      setAccessibleBy(group.accessibleBy || 'only_me')
      // Convert TIME format (HH:MM:SS) to HTML5 time input format (HH:MM)
      if (group.dayStartTime) {
        const timeStr = group.dayStartTime.substring(0, 5) // Extract HH:MM from HH:MM:SS
        setDayStartTime(timeStr)
      }
      if (group.dayEndTime) {
        const timeStr = group.dayEndTime.substring(0, 5) // Extract HH:MM from HH:MM:SS
        setDayEndTime(timeStr)
      }
    }
  }, [group])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Group name is required')
      return
    }

    if (accessibleBy === 'shared' && !canCreateSharedMedicationGroups) {
      setError('You do not have permission to create shared groups')
      return
    }

    try {
      if (group) {
        if (!group.id) {
          setError('Group ID is missing. Please refresh the page and try again.')
          return
        }
        console.log('Updating group with ID:', group.id)
        await updateGroup(group.id, { 
          name: name.trim(), 
          accessibleBy,
          dayStartTime: dayStartTime || '06:00',
          dayEndTime: dayEndTime || '23:59'
        })
      } else {
        await addGroup({ 
          name: name.trim(), 
          accessibleBy,
          dayStartTime: dayStartTime || '06:00',
          dayEndTime: dayEndTime || '23:59'
        })
      }
      onSave()
    } catch (err) {
      setError(err.message || 'Failed to save group')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-3">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      <div>
        <label htmlFor="group-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Group Name <span className="text-red-500">*</span>
        </label>
        <input
          id="group-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-700 dark:text-white"
          placeholder="e.g., My Medications, Mom's Medications"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Accessible by
        </label>
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="radio"
              value="only_me"
              checked={accessibleBy === 'only_me'}
              onChange={(e) => setAccessibleBy(e.target.value)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Only Me</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="shared"
              checked={accessibleBy === 'shared'}
              onChange={(e) => setAccessibleBy(e.target.value)}
              disabled={!canCreateSharedMedicationGroups}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Shared
              {!canCreateSharedMedicationGroups && (
                <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">(Permission required)</span>
              )}
            </span>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="day-start-time" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Day Start Time
          </label>
          <input
            id="day-start-time"
            type="time"
            value={dayStartTime}
            onChange={(e) => setDayStartTime(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-700 dark:text-white"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            When the medication day starts (for time sorting)
          </p>
        </div>
        <div>
          <label htmlFor="day-end-time" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Day End Time
          </label>
          <input
            id="day-end-time"
            type="time"
            value={dayEndTime}
            onChange={(e) => setDayEndTime(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-700 dark:text-white"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            When the medication day ends (for time sorting)
          </p>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md hover:bg-gray-50 dark:hover:bg-slate-600"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          {group ? 'Update' : 'Create'} Group
        </button>
      </div>
    </form>
  )
}

