'use client'

import { useState } from 'react'
import { useMedications } from '@/contexts/MedicationContext'
import { useGroups } from '@/contexts/GroupContext'
import MedicationForm from './MedicationForm'
import { generateMedicationPDF } from '@/utils/generateMedicationPDF'

// Helper function to format date string without timezone issues
function formatDateString(dateString) {
  if (!dateString) return ''
  // If it's already in YYYY-MM-DD format, parse as local date
  if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dateString.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return date.toLocaleDateString()
  }
  // Otherwise, parse normally
  return new Date(dateString).toLocaleDateString()
}

export default function MedicationList() {
  const { medications, addMedication, updateMedication, deleteMedication } = useMedications()
  const { selectedGroup } = useGroups()
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)

  const handleEdit = (medication) => {
    setEditingId(medication.id)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this medication?')) {
      try {
        await deleteMedication(id)
      } catch (error) {
        alert('Failed to delete medication: ' + error.message)
      }
    }
  }

  const handleSave = async (medicationData) => {
    try {
      if (editingId) {
        await updateMedication(editingId, medicationData)
        setEditingId(null)
      } else {
        await addMedication(medicationData)
      }
      setShowForm(false)
    } catch (error) {
      alert('Failed to save medication: ' + error.message)
    }
  }

  const handleCancel = () => {
    setEditingId(null)
    setShowForm(false)
  }

  const getFrequencyDescription = (medication) => {
    if (medication.frequencyType === 'as_needed') {
      return 'As-needed'
    }
    
    let desc = ''
    
    if (medication.frequencyType === 'times_per_day') {
      desc = `${medication.timesPerDay} time${medication.timesPerDay > 1 ? 's' : ''} per day`
    } else {
      const times = medication.specificTimes.map(t => {
        // Check if it's a predefined time option
        if (t === 'morning') {
          return 'morning'
        } else if (t === 'evening') {
          return 'evening'
        } else if (t === 'bedtime') {
          return 'bedtime'
        } else if (t.match(/^\d{2}:\d{2}$/)) {
          // Specific time format HH:MM
          const [h, m] = t.split(':')
          const hour = parseInt(h)
          const ampm = hour >= 12 ? 'PM' : 'AM'
          const displayHour = hour % 12 || 12
          return `${displayHour}:${m} ${ampm}`
        }
        return t
      }).join(', ')
      desc = `At ${times}`
    }
    
    if (medication.frequencyPattern === 'every_day') {
      desc += ', every day'
    } else if (medication.frequencyPattern === 'every_x_days') {
      desc += `, every ${medication.everyXDays} days`
    } else if (medication.frequencyPattern === 'specific_days') {
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const days = medication.specificDays.map(d => dayNames[d]).join(', ')
      desc += `, on ${days}`
    }
    
    return desc
  }

  const getStatusBadge = (medication) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    if (medication.startDate) {
      const start = new Date(medication.startDate)
      start.setHours(0, 0, 0, 0)
      if (start > today) {
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-gradient-to-r from-blue-100 to-blue-50 text-blue-800 dark:from-blue-900 dark:to-blue-800 dark:text-blue-200 rounded-full border border-blue-200 dark:border-blue-700">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            Upcoming
          </span>
        )
      }
    }
    
    if (medication.endDate) {
      const end = new Date(medication.endDate)
      end.setHours(0, 0, 0, 0)
      if (end < today) {
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-gradient-to-r from-gray-100 to-gray-50 text-gray-800 dark:from-gray-700 dark:to-gray-600 dark:text-gray-200 rounded-full border border-gray-200 dark:border-gray-600">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            Ended
          </span>
        )
      }
    }
    
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-gradient-to-r from-green-100 to-emerald-50 text-green-800 dark:from-green-900 dark:to-emerald-800 dark:text-green-200 rounded-full border border-green-200 dark:border-green-700">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        Active
      </span>
    )
  }

  if (showForm) {
    const medicationToEdit = editingId ? medications.find(m => m.id === editingId) : null
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {editingId ? 'Edit Medication' : 'Add New Medication'}
          </h2>
        </div>
        <MedicationForm
          medication={medicationToEdit}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Medications</h2>
        </div>
        <div className="flex gap-2">
          {medications.length > 0 && (
            <button
              onClick={() => generateMedicationPDF(medications, selectedGroup?.name)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-700 text-white rounded-lg hover:from-green-700 hover:to-emerald-800 text-sm font-semibold shadow-md hover:shadow-lg transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download PDF
            </button>
          )}
          <button
            onClick={() => setShowForm(true)}
            className="w-full sm:w-auto inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg hover:from-indigo-700 hover:to-indigo-800 text-sm font-semibold shadow-md hover:shadow-lg transition-all duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Medication
          </button>
        </div>
      </div>

      {medications.length === 0 ? (
        <div className="text-center py-16 bg-gradient-to-br from-white to-gray-50 dark:from-slate-800 dark:to-slate-900 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 mb-4">
            <svg className="w-8 h-8 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-lg font-medium mb-2">No medications added yet</p>
          <p className="text-gray-500 dark:text-gray-500 text-sm mb-6">Get started by adding your first medication</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg hover:from-indigo-700 hover:to-indigo-800 text-sm font-semibold shadow-md hover:shadow-lg transition-all duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Your First Medication
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {medications.map(medication => (
            <div
              key={medication.id}
              className="group bg-white dark:bg-slate-800 rounded-xl shadow-md hover:shadow-xl border border-gray-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 p-6 transition-all duration-300"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-200">
                        {medication.name}
                      </h3>
                    </div>
                    {getStatusBadge(medication)}
                    {medication.withFood && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-gradient-to-r from-yellow-100 to-amber-50 text-yellow-800 dark:from-yellow-900 dark:to-amber-800 dark:text-yellow-200 rounded-full border border-yellow-200 dark:border-yellow-700">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
                        </svg>
                        With Food
                      </span>
                    )}
                  </div>
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                      <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="font-semibold">Dosage:</span>
                      <span>{medication.dosage}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{getFrequencyDescription(medication)}</span>
                    </div>
                  </div>
                  {(medication.startDate || medication.endDate || (!medication.startDate && !medication.endDate)) && (
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400 mt-3 pt-3 border-t border-gray-200 dark:border-slate-700">
                      {medication.startDate && (
                        <div className="flex items-center gap-1.5">
                          <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span><strong>Start:</strong> {formatDateString(medication.startDate)}</span>
                        </div>
                      )}
                      {medication.endDate && (
                        <div className="flex items-center gap-1.5">
                          <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span><strong>End:</strong> {formatDateString(medication.endDate)}</span>
                        </div>
                      )}
                      {!medication.endDate && (
                        <div className="flex items-center gap-1.5">
                          <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="font-medium italic">Ongoing</span>
                        </div>
                      )}
                    </div>
                  )}
                  {medication.notes && (
                    <div className="mt-3 p-3 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-800 rounded-lg border border-gray-200 dark:border-slate-600">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <strong className="text-gray-700 dark:text-gray-300 text-sm">Notes</strong>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{medication.notes}</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 sm:ml-4 w-full sm:w-auto">
                  <button
                    onClick={() => handleEdit(medication)}
                    className="flex-1 sm:flex-none inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-all duration-200"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(medication.id)}
                    className="flex-1 sm:flex-none inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-all duration-200"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

