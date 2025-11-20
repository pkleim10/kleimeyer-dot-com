'use client'

import { useState, useEffect } from 'react'

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
    numberToTake: 1,
    format: 'pill',
    indication: '',
    frequencyType: 'times_per_day',
    timesPerDay: 1,
    specificTimes: ['morning'],
    frequencyPattern: 'every_day',
    everyXDays: 1,
    specificDays: [],
    withFood: false,
    startDate: '',
    endDate: '',
    specifyStartDate: false,
    specifyEndDate: false,
    notes: ''
  })

  useEffect(() => {
    if (medication) {
      setFormData({
        name: medication.name || '',
        dosage: medication.dosage || '',
        numberToTake: medication.numberToTake || 1,
        format: medication.format || 'pill',
        indication: medication.indication || '',
        frequencyType: medication.frequencyType || 'times_per_day',
        timesPerDay: medication.timesPerDay || 1,
        specificTimes: medication.specificTimes || ['morning'],
        frequencyPattern: medication.frequencyPattern || 'every_day',
        everyXDays: medication.everyXDays || 1,
        specificDays: medication.specificDays || [],
        withFood: medication.withFood || false,
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
    const newTimes = [...formData.specificTimes]
    // Store the value as-is (could be "morning", "evening", "bedtime", or "HH:MM")
    newTimes[index] = value
    setFormData(prev => ({ ...prev, specificTimes: newTimes }))
  }

  const addSpecificTime = () => {
    setFormData(prev => ({
      ...prev,
      specificTimes: [...prev.specificTimes, 'morning'] // Default to "In the morning"
    }))
  }

  const removeSpecificTime = (index) => {
    setFormData(prev => ({
      ...prev,
      specificTimes: prev.specificTimes.filter((_, i) => i !== index)
    }))
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
    if (!formData.name.trim() || !formData.dosage.trim()) {
      alert('Please fill in medication name and dosage')
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
    const medicationData = {
      name: formData.name.trim(),
      dosage: formData.dosage.trim(),
      numberToTake: parseInt(formData.numberToTake) || 1,
      format: formData.format || 'pill',
      indication: formData.indication.trim() || null,
      frequencyType: formData.frequencyType,
      timesPerDay: formData.frequencyType === 'times_per_day' ? parseInt(formData.timesPerDay) : null,
      specificTimes: formData.frequencyType === 'specific_times' ? formData.specificTimes : null,
      frequencyPattern: formData.frequencyType === 'as_needed' ? 'every_day' : formData.frequencyPattern,
      everyXDays: formData.frequencyPattern === 'every_x_days' ? parseInt(formData.everyXDays) : null,
      specificDays: formData.frequencyPattern === 'specific_days' ? formData.specificDays : null,
      withFood: formData.withFood,
      startDate: formData.specifyStartDate ? (formData.startDate || null) : null,
      endDate: formData.specifyEndDate ? (formData.endDate || null) : null,
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="dosage" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Dosage *
          </label>
          <input
            type="text"
            id="dosage"
            name="dosage"
            value={formData.dosage}
            onChange={handleChange}
            placeholder="e.g., 10mg, 1 tablet"
            className="mt-1 block w-full border-2 border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm px-4 py-2.5 transition-colors duration-200"
            required
          />
        </div>
        <div>
          <label htmlFor="numberToTake" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Number to Take
          </label>
          <input
            type="number"
            id="numberToTake"
            name="numberToTake"
            value={formData.numberToTake}
            onChange={handleChange}
            min="1"
            className="mt-1 block w-full border-2 border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm px-4 py-2.5 transition-colors duration-200"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="format" className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            Format *
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
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Frequency Type *
        </label>
        <div className="flex flex-col sm:flex-row gap-4">
          <label className="flex items-center">
            <input
              type="radio"
              name="frequencyType"
              value="times_per_day"
              checked={formData.frequencyType === 'times_per_day'}
              onChange={handleChange}
              className="mr-2"
            />
            Times per day
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="frequencyType"
              value="specific_times"
              checked={formData.frequencyType === 'specific_times'}
              onChange={handleChange}
              className="mr-2"
            />
            Specific times
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="frequencyType"
              value="as_needed"
              checked={formData.frequencyType === 'as_needed'}
              onChange={handleChange}
              className="mr-2"
            />
            As-needed
          </label>
        </div>
      </div>

      {formData.frequencyType === 'times_per_day' && (
        <div>
          <label htmlFor="timesPerDay" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Number of times per day *
          </label>
          <input
            type="number"
            id="timesPerDay"
            name="timesPerDay"
            value={formData.timesPerDay}
            onChange={handleChange}
            min="1"
            max="10"
            className="mt-1 block w-full border-2 border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm px-4 py-2.5 transition-colors duration-200"
            required
          />
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
            
            return (
              <div key={index} className="flex items-center gap-2 mb-2">
                <select
                  value={displayValue}
                  onChange={(e) => {
                    const value = e.target.value
                    if (value === 'specific') {
                      // User selected "Specific time" - keep current time or default to 08:00
                      handleSpecificTimeChange(index, isSpecificTime ? time : '08:00')
                    } else {
                      // Predefined option selected (morning, evening, bedtime)
                      handleSpecificTimeChange(index, value)
                    }
                  }}
                  className="block border-2 border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm px-4 py-2.5 transition-colors duration-200"
                  required
                >
                  <option value="morning">In the morning</option>
                  <option value="evening">In the evening</option>
                  <option value="bedtime">Before bedtime</option>
                  <option value="specific">Specific time...</option>
                </select>
                {isSpecificTime && (
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => handleSpecificTimeChange(index, e.target.value)}
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
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Frequency Pattern *
          </label>
          <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="radio"
              name="frequencyPattern"
              value="every_day"
              checked={formData.frequencyPattern === 'every_day'}
              onChange={handleChange}
              className="mr-2"
            />
            Every day
          </label>
          <div className="flex items-center">
            <label className="flex items-center">
              <input
                type="radio"
                name="frequencyPattern"
                value="every_x_days"
                checked={formData.frequencyPattern === 'every_x_days'}
                onChange={handleChange}
                className="mr-2"
              />
              Every
            </label>
            {formData.frequencyPattern === 'every_x_days' && (
              <input
                type="number"
                name="everyXDays"
                value={formData.everyXDays}
                onChange={handleChange}
                min="1"
                className="ml-2 w-20 border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            )}
            <span className="ml-2">days</span>
          </div>
          <div>
            <label className="flex items-center mb-2">
              <input
                type="radio"
                name="frequencyPattern"
                value="specific_days"
                checked={formData.frequencyPattern === 'specific_days'}
                onChange={handleChange}
                className="mr-2"
              />
              Specific days of week
            </label>
            {formData.frequencyPattern === 'specific_days' && (
              <div className="ml-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {DAYS_OF_WEEK.map(day => (
                  <label key={day.value} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.specificDays.includes(day.value)}
                      onChange={() => handleDayToggle(day.value)}
                      className="mr-2"
                    />
                    {day.label}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      <div>
        <label className="flex items-center">
          <input
            type="checkbox"
            name="withFood"
            checked={formData.withFood}
            onChange={handleChange}
            className="mr-2"
          />
          Take with food
        </label>
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

      <div className="space-y-4">
        <div>
          <label className="flex items-center mb-2">
            <input
              type="checkbox"
              name="specifyStartDate"
              checked={formData.specifyStartDate}
              onChange={(e) => {
                setFormData(prev => ({
                  ...prev,
                  specifyStartDate: e.target.checked,
                  startDate: e.target.checked ? prev.startDate : ''
                }))
              }}
              className="mr-2"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Specify Start Date
            </span>
          </label>
          {formData.specifyStartDate && (
            <input
              type="date"
              id="startDate"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              className="mt-1 block w-48 border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          )}
        </div>

        <div>
          <label className="flex items-center mb-2">
            <input
              type="checkbox"
              name="specifyEndDate"
              checked={formData.specifyEndDate}
              onChange={(e) => {
                setFormData(prev => ({
                  ...prev,
                  specifyEndDate: e.target.checked,
                  endDate: e.target.checked ? prev.endDate : ''
                }))
              }}
              className="mr-2"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Specify End Date
            </span>
          </label>
          {formData.specifyEndDate && (
            <input
              type="date"
              id="endDate"
              name="endDate"
              value={formData.endDate}
              onChange={handleChange}
              className="mt-1 block w-48 border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          )}
        </div>
      </div>

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

