'use client'

import { useState, useEffect, useRef } from 'react'

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' }
]

export default function MedicationForm({ medication, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    dosage: '',
    wholeNumber: 1,
    addHalf: false,
    format: 'pill',
    indication: '',
    frequencyType: 'times_per_day',
    timesPerDay: 1,
    specificTimes: ['morning'],
    frequencyPattern: 'every_day',
    everyXDays: 1,
    specificDays: [],
    withFood: false,
    discontinued: false,
    startDate: '',
    endDate: '',
    specifyStartDate: false,
    specifyEndDate: false,
    notes: ''
  })
  
  // Track custom times added during this session - persist in sessionStorage
  const CUSTOM_TIMES_STORAGE_KEY = 'medication_custom_times'
  
  // Load custom times from sessionStorage on mount
  const loadCustomTimesFromStorage = () => {
    try {
      const stored = sessionStorage.getItem(CUSTOM_TIMES_STORAGE_KEY)
      if (stored) {
        return JSON.parse(stored)
      }
    } catch (e) {
      console.error('Error loading custom times from storage:', e)
    }
    return []
  }
  
  const [customTimes, setCustomTimes] = useState(loadCustomTimesFromStorage)
  // Ref to track latest specificTimes for onBlur handler
  const specificTimesRef = useRef(formData.specificTimes)
  
  // Save custom times to sessionStorage whenever they change
  const saveCustomTimesToStorage = (times) => {
    try {
      sessionStorage.setItem(CUSTOM_TIMES_STORAGE_KEY, JSON.stringify(times))
    } catch (e) {
      console.error('Error saving custom times to storage:', e)
    }
  }

  useEffect(() => {
    if (medication) {
      // Extract any custom times (HH:MM format) from existing medication
      const existingCustomTimes = (medication.specificTimes || [])
        .filter(time => time.match(/^\d{2}:\d{2}$/))
      
      // Merge with session custom times and save
      if (existingCustomTimes.length > 0) {
        const currentSessionTimes = loadCustomTimesFromStorage()
        const mergedTimes = [...new Set([...currentSessionTimes, ...existingCustomTimes])].sort()
        setCustomTimes(mergedTimes)
        saveCustomTimesToStorage(mergedTimes)
      }
      
      const initialSpecificTimes = medication.specificTimes || ['morning']
      specificTimesRef.current = initialSpecificTimes
      
      // Parse numberToTake into whole number and addHalf
      const numberToTake = medication.numberToTake ? parseFloat(medication.numberToTake) : 1.0
      const wholeNumber = Math.floor(numberToTake)
      const addHalf = Math.abs(numberToTake % 1 - 0.5) < 0.01
      
      setFormData({
        name: medication.name || '',
        dosage: medication.dosage || '',
        wholeNumber: wholeNumber || 1,
        addHalf: addHalf || false,
        format: medication.format || 'pill',
        indication: medication.indication || '',
        frequencyType: medication.frequencyType || 'times_per_day',
        timesPerDay: medication.timesPerDay || 1,
        specificTimes: initialSpecificTimes,
        frequencyPattern: medication.frequencyPattern || 'every_day',
        everyXDays: medication.everyXDays || 1,
        specificDays: medication.specificDays || [],
        withFood: medication.withFood || false,
        discontinued: medication.discontinued || false,
        startDate: medication.startDate || '',
        endDate: medication.endDate || '',
        specifyStartDate: !!medication.startDate,
        specifyEndDate: !!medication.endDate,
        notes: medication.notes || ''
      })
    }
  }, [medication])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSpecificTimeChange = (index, value) => {
    setFormData(prev => {
      const newTimes = [...prev.specificTimes]
      // Store the value as-is (could be "morning", "evening", "bedtime", or "HH:MM")
      newTimes[index] = value
      // Update ref with latest times
      specificTimesRef.current = newTimes
      return { ...prev, specificTimes: newTimes }
    })
  }
  
  const rebuildCustomTimes = (timesArray) => {
    // Extract all custom times (HH:MM format) from the provided times array
    const formCustomTimes = timesArray
      .filter(time => time.match(/^\d{2}:\d{2}$/))
    
    // Get current session custom times and merge with new ones from this form
    // This ensures times from previous medications are preserved
    const currentSessionTimes = loadCustomTimesFromStorage()
    const mergedTimes = [...new Set([...currentSessionTimes, ...formCustomTimes])].sort()
    
    setCustomTimes(mergedTimes)
    saveCustomTimesToStorage(mergedTimes)
  }

  const addSpecificTime = () => {
    setFormData(prev => ({
      ...prev,
      specificTimes: [...prev.specificTimes, 'morning'] // Default to "In the morning"
    }))
  }

  const removeSpecificTime = (index) => {
    setFormData(prev => {
      const newTimes = prev.specificTimes.filter((_, i) => i !== index)
      specificTimesRef.current = newTimes
      // Rebuild custom times after removing
      rebuildCustomTimes(newTimes)
      return { ...prev, specificTimes: newTimes }
    })
  }

  const handleDayToggle = (dayValue) => {
    setFormData(prev => ({
      ...prev,
      specificDays: prev.specificDays.includes(dayValue)
        ? prev.specificDays.filter(d => d !== dayValue)
        : [...prev.specificDays, dayValue]
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    // Validation
    if (!formData.name.trim()) {
      alert('Please fill in medication name')
      return
    }

    if (formData.frequencyType === 'times_per_day' && (!formData.timesPerDay || formData.timesPerDay < 1)) {
      alert('Please enter a valid number of times per day')
      return
    }

    if (formData.frequencyType === 'specific_times' && formData.specificTimes.length === 0) {
      alert('Please add at least one specific time')
      return
    }

    // For as_needed medications, frequency pattern doesn't apply
    if (formData.frequencyType === 'as_needed' && formData.frequencyPattern === 'specific_days' && formData.specificDays.length === 0) {
      // This shouldn't happen since frequency pattern is hidden, but just in case
      formData.frequencyPattern = 'every_day'
    }

    if (formData.frequencyPattern === 'specific_days' && formData.specificDays.length === 0) {
      alert('Please select at least one day of the week')
      return
    }

    // Prepare data for save
    // Combine wholeNumber and addHalf into numberToTake
    const numberToTake = formData.addHalf ? formData.wholeNumber + 0.5 : formData.wholeNumber
    
    const medicationData = {
      name: formData.name.trim(),
      dosage: formData.dosage.trim() || null,
      numberToTake: numberToTake,
      format: formData.format || 'pill',
      indication: formData.indication.trim() || null,
      frequencyType: formData.frequencyType,
      timesPerDay: formData.frequencyType === 'times_per_day' ? parseInt(formData.timesPerDay) : null,
      specificTimes: formData.frequencyType === 'specific_times' ? formData.specificTimes : null,
      frequencyPattern: formData.frequencyType === 'as_needed' ? 'every_day' : formData.frequencyPattern,
      everyXDays: formData.frequencyPattern === 'every_x_days' ? parseInt(formData.everyXDays) : null,
      specificDays: formData.frequencyPattern === 'specific_days' ? formData.specificDays : null,
      withFood: formData.withFood,
      discontinued: formData.discontinued,
      startDate: formData.discontinued ? null : (formData.specifyStartDate ? (formData.startDate || null) : null),
      endDate: formData.discontinued ? null : (formData.specifyEndDate ? (formData.endDate || null) : null),
      notes: formData.notes.trim() || null
    }

    onSave(medicationData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="name" className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
          Medication Name *
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className="mt-1 block w-full border-2 border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm px-4 py-2.5 transition-colors duration-200"
          required
        />
      </div>

      <div>
        <label htmlFor="dosage" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Dosage
        </label>
        <input
          type="text"
          id="dosage"
          name="dosage"
          value={formData.dosage}
          onChange={handleChange}
          placeholder="e.g., 10mg, 1 tablet"
          className="mt-1 block w-full border-2 border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm px-4 py-2.5 transition-colors duration-200"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="format" className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            Type *
          </label>
          <select
            id="format"
            name="format"
            value={formData.format}
            onChange={handleChange}
            className="mt-1 block w-full border-2 border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm px-4 py-2.5 transition-colors duration-200"
            required
          >
            <option value="pill">Pill</option>
            <option value="capsule">Capsule</option>
            <option value="chewable">Chewable</option>
            <option value="injection">Injection</option>
            <option value="patch">Patch</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label htmlFor="indication" className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Indication
          </label>
          <input
            type="text"
            id="indication"
            name="indication"
            value={formData.indication}
            onChange={handleChange}
            placeholder="e.g., acid indigestion"
            className="mt-1 block w-full border-2 border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm px-4 py-2.5 transition-colors duration-200"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Number to Take
        </label>
        <div className="flex gap-2 flex-wrap items-center mb-6">
          {[1, 2, 3, 4, 5, 6].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, wholeNumber: num }))}
              className={`
                min-w-[30px] max-w-[50px] aspect-square
                rounded-lg border-2 font-semibold text-sm
                transition-all duration-200 transform
                hover:scale-105 hover:shadow-md
                ${
                  formData.wholeNumber === num
                    ? 'bg-emerald-600 text-white border-emerald-700 dark:bg-emerald-500 dark:border-emerald-400 shadow-lg scale-105'
                    : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-slate-600 hover:border-emerald-400 dark:hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                }
              `}
            >
              {num}
            </button>
          ))}
          <div className="w-[30px]"></div>
          <button
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, addHalf: !prev.addHalf }))}
            className={`
              min-w-[30px] max-w-[50px] aspect-square
              rounded-lg border-2 font-semibold text-sm
              transition-all duration-200 transform
              hover:scale-105 hover:shadow-md
              ${
                formData.addHalf
                  ? 'bg-emerald-600 text-white border-emerald-700 dark:bg-emerald-500 dark:border-emerald-400 shadow-lg scale-105'
                  : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-slate-600 hover:border-emerald-400 dark:hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
              }
            `}
          >
            +½
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Frequency Type *
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, frequencyType: 'times_per_day' }))}
            className={`
              w-40 px-4 py-2 rounded-lg border-2 font-semibold text-sm
              transition-all duration-200 transform
              hover:scale-105 hover:shadow-md
              ${
                formData.frequencyType === 'times_per_day'
                  ? 'bg-indigo-600 text-white border-indigo-700 dark:bg-indigo-500 dark:border-indigo-400 shadow-lg scale-105'
                  : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
              }
            `}
          >
            Times per day
          </button>
          <button
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, frequencyType: 'specific_times' }))}
            className={`
              w-40 px-4 py-2 rounded-lg border-2 font-semibold text-sm
              transition-all duration-200 transform
              hover:scale-105 hover:shadow-md
              ${
                formData.frequencyType === 'specific_times'
                  ? 'bg-indigo-600 text-white border-indigo-700 dark:bg-indigo-500 dark:border-indigo-400 shadow-lg scale-105'
                  : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
              }
            `}
          >
            Specific times
          </button>
          <button
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, frequencyType: 'as_needed' }))}
            className={`
              w-40 px-4 py-2 rounded-lg border-2 font-semibold text-sm
              transition-all duration-200 transform
              hover:scale-105 hover:shadow-md
              ${
                formData.frequencyType === 'as_needed'
                  ? 'bg-indigo-600 text-white border-indigo-700 dark:bg-indigo-500 dark:border-indigo-400 shadow-lg scale-105'
                  : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
              }
            `}
          >
            As-needed
          </button>
        </div>
      </div>

      {formData.frequencyType === 'times_per_day' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Number of times per day *
          </label>
          <div className="flex gap-2 flex-wrap">
            {[1, 2, 3, 4, 5, 6].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, timesPerDay: num }))}
                className={`
                  min-w-[30px] max-w-[50px] aspect-square
                  rounded-lg border-2 font-semibold text-sm
                  transition-all duration-200 transform
                  hover:scale-105 hover:shadow-md
                  ${
                    formData.timesPerDay === num
                      ? 'bg-indigo-600 text-white border-indigo-700 dark:bg-indigo-500 dark:border-indigo-400 shadow-lg scale-105'
                      : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
                  }
                `}
              >
                {num}
              </button>
            ))}
          </div>
        </div>
      )}

      {formData.frequencyType === 'specific_times' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Specific Times *
          </label>
          {formData.specificTimes.map((time, index) => {
            // Determine if this is a predefined option or a specific time
            const isSpecificTime = time.match(/^\d{2}:\d{2}$/)
            const displayValue = isSpecificTime ? 'specific' : time
            
            // Format time for display (convert 24h to 12h with AM/PM)
            const formatTimeForDisplay = (timeStr) => {
              if (!timeStr.match(/^\d{2}:\d{2}$/)) return timeStr
              const [hours, minutes] = timeStr.split(':')
              const hour24 = parseInt(hours)
              const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
              const ampm = hour24 >= 12 ? 'PM' : 'AM'
              return `${hour12}:${minutes} ${ampm}`
            }
            
            return (
              <div key={index} className="flex items-center gap-2 mb-2">
                <select
                  value={displayValue}
                  onChange={(e) => {
                    const value = e.target.value
                    if (value === 'specific') {
                      // User selected "Specific time" - keep current time or default to 08:00
                      // Don't add to customTimes yet - wait for user to actually change the time
                      handleSpecificTimeChange(index, isSpecificTime ? time : '08:00', false)
                    } else {
                      // Predefined option selected (morning, evening, bedtime) or custom time
                      handleSpecificTimeChange(index, value, false)
                    }
                  }}
                  className="block border-2 border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm px-4 py-2.5 transition-colors duration-200"
                  required
                >
                  <option value="morning">In the morning</option>
                  <option value="evening">In the evening</option>
                  <option value="bedtime">Before bedtime</option>
                  {customTimes.map(customTime => (
                    <option key={customTime} value={customTime}>
                      {formatTimeForDisplay(customTime)}
                    </option>
                  ))}
                  <option value="specific">Specific time...</option>
                </select>
                {isSpecificTime && (
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => {
                      const newTime = e.target.value
                      // Update the value immediately for display
                      handleSpecificTimeChange(index, newTime)
                    }}
                    onBlur={() => {
                      // Rebuild custom times list from all current specific times
                      // Use ref to get the latest times immediately
                      rebuildCustomTimes(specificTimesRef.current)
                    }}
                    className="block border-2 border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm px-4 py-2.5 transition-colors duration-200"
                  />
                )}
                {formData.specificTimes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSpecificTime(index)}
                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 px-3 py-1 text-sm"
                  >
                    Remove
                  </button>
                )}
              </div>
            )
          })}
          <button
            type="button"
            onClick={addSpecificTime}
            className="text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            + Add Time
          </button>
        </div>
      )}

      {formData.frequencyType !== 'as_needed' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Interval *
          </label>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, frequencyPattern: 'every_day' }))}
                className={`
                  w-40 px-4 py-2 rounded-lg border-2 font-semibold text-sm
                  transition-all duration-200 transform
                  hover:scale-105 hover:shadow-md
                  ${
                    formData.frequencyPattern === 'every_day'
                      ? 'bg-indigo-600 text-white border-indigo-700 dark:bg-indigo-500 dark:border-indigo-400 shadow-lg scale-105'
                      : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
                  }
                `}
              >
                Every day
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, frequencyPattern: 'every_x_days' }))}
                  className={`
                    w-40 px-4 py-2 rounded-lg border-2 font-semibold text-sm
                    transition-all duration-200 transform
                    hover:scale-105 hover:shadow-md
                    ${
                      formData.frequencyPattern === 'every_x_days'
                        ? 'bg-indigo-600 text-white border-indigo-700 dark:bg-indigo-500 dark:border-indigo-400 shadow-lg scale-105'
                        : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
                    }
                  `}
                >
                  Every
                </button>
                {formData.frequencyPattern === 'every_x_days' && (
                  <>
                    <input
                      type="number"
                      name="everyXDays"
                      value={formData.everyXDays}
                      onChange={handleChange}
                      min="1"
                      className="w-20 border-2 border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm px-3 py-2"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">days</span>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, frequencyPattern: 'specific_days' }))}
                className={`
                  w-40 px-4 py-2 rounded-lg border-2 font-semibold text-sm
                  transition-all duration-200 transform
                  hover:scale-105 hover:shadow-md
                  ${
                    formData.frequencyPattern === 'specific_days'
                      ? 'bg-indigo-600 text-white border-indigo-700 dark:bg-indigo-500 dark:border-indigo-400 shadow-lg scale-105'
                      : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
                  }
                `}
              >
                Specific days
              </button>
            </div>
            {formData.frequencyPattern === 'specific_days' && (
              <div className="flex flex-wrap gap-2 mt-2">
                {DAYS_OF_WEEK.map(day => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => handleDayToggle(day.value)}
                    className={`
                      px-3 py-1.5 rounded-lg border-2 font-semibold text-sm
                      transition-all duration-200 transform
                      hover:scale-105 hover:shadow-md
                      ${
                        formData.specificDays.includes(day.value)
                          ? 'bg-emerald-600 text-white border-emerald-700 dark:bg-emerald-500 dark:border-emerald-400 shadow-lg scale-105'
                          : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-slate-600 hover:border-emerald-400 dark:hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                      }
                    `}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div>
        <button
          type="button"
          onClick={() => setFormData(prev => ({ ...prev, withFood: !prev.withFood }))}
          className={`
            w-40 px-4 py-2 rounded-lg border-2 font-semibold text-sm
            transition-all duration-200 transform
            hover:scale-105 hover:shadow-md
            ${
              formData.withFood
                ? 'bg-indigo-600 text-white border-indigo-700 dark:bg-indigo-500 dark:border-indigo-400 shadow-lg scale-105'
                : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
            }
          `}
        >
          Take with Food
        </button>
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Notes (optional)
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          value={formData.notes}
          onChange={handleChange}
          placeholder="Any additional notes about this medication..."
          className="mt-1 block w-full border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>

      <div>
        <button
          type="button"
          onClick={() => {
            setFormData(prev => ({
              ...prev,
              discontinued: !prev.discontinued,
              specifyStartDate: !prev.discontinued ? false : prev.specifyStartDate,
              specifyEndDate: !prev.discontinued ? false : prev.specifyEndDate,
              startDate: !prev.discontinued ? '' : prev.startDate,
              endDate: !prev.discontinued ? '' : prev.endDate
            }))
          }}
          className={`
            w-40 px-4 py-2 rounded-lg border-2 font-semibold text-sm
            transition-all duration-200 transform
            hover:scale-105 hover:shadow-md
            ${
              formData.discontinued
                ? 'bg-red-600 text-white border-red-700 dark:bg-red-500 dark:border-red-400 shadow-lg scale-105'
                : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-slate-600 hover:border-red-400 dark:hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
            }
          `}
        >
          Discontinued
        </button>
      </div>

      {!formData.discontinued && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setFormData(prev => ({
                  ...prev,
                  specifyStartDate: !prev.specifyStartDate,
                  startDate: !prev.specifyStartDate ? prev.startDate : ''
                }))
              }}
              className={`
                w-40 px-4 py-2 rounded-lg border-2 font-semibold text-sm
                transition-all duration-200 transform
                hover:scale-105 hover:shadow-md
                ${
                  formData.specifyStartDate
                    ? 'bg-indigo-600 text-white border-indigo-700 dark:bg-indigo-500 dark:border-indigo-400 shadow-lg scale-105'
                    : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
                }
              `}
            >
              Start Date
            </button>
            {formData.specifyStartDate && (
              <input
                type="date"
                id="startDate"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                className="border-2 border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm px-4 py-2"
              />
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setFormData(prev => ({
                  ...prev,
                  specifyEndDate: !prev.specifyEndDate,
                  endDate: !prev.specifyEndDate ? prev.endDate : ''
                }))
              }}
              className={`
                w-40 px-4 py-2 rounded-lg border-2 font-semibold text-sm
                transition-all duration-200 transform
                hover:scale-105 hover:shadow-md
                ${
                  formData.specifyEndDate
                    ? 'bg-indigo-600 text-white border-indigo-700 dark:bg-indigo-500 dark:border-indigo-400 shadow-lg scale-105'
                    : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
                }
              `}
            >
              End Date
            </button>
            {formData.specifyEndDate && (
              <input
                type="date"
                id="endDate"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                className="border-2 border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm px-4 py-2"
              />
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
        <button
          type="button"
          onClick={onCancel}
          className="w-full sm:w-auto px-4 py-2 border border-gray-300 dark:border-slate-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="w-full sm:w-auto px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
        >
          {medication ? 'Update' : 'Add'} Medication
        </button>
      </div>
    </form>
  )
}

