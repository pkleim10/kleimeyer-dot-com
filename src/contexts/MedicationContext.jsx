'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { useGroups } from './GroupContext'
import { supabase } from '@/utils/supabase'

const MedicationContext = createContext({})

export const useMedications = () => useContext(MedicationContext)

export function MedicationProvider({ children }) {
  const { user, loading: authLoading } = useAuth()
  const { selectedGroupId, groups, loading: groupsLoading } = useGroups()
  const [allMedications, setAllMedications] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Filter medications by selected group
  const medications = selectedGroupId 
    ? allMedications.filter(med => med.groupId === selectedGroupId)
    : []

  const getAuthHeaders = useCallback(async () => {
    // Retry logic to handle session not being ready
    let retries = 0
    const maxRetries = 3
    while (retries < maxRetries) {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) {
        retries++
        if (retries >= maxRetries) {
          throw new Error('Failed to get session')
        }
        await new Promise(resolve => setTimeout(resolve, 500 * retries))
        continue
      }
      if (session && session.access_token) {
        return {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      }
      retries++
      if (retries >= maxRetries) {
        throw new Error('No session')
      }
      await new Promise(resolve => setTimeout(resolve, 500 * retries))
    }
    throw new Error('No session')
  }, [])

  const loadData = useCallback(async () => {
    try {
      setLoading(true)

      const headers = await getAuthHeaders()

      // Fetch medications - fetch all, filtering happens client-side by selectedGroupId
      const medResponse = await fetch('/api/just-for-me/medication/medications', {
        headers
      })

      if (!medResponse.ok) {
        const errorData = await medResponse.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Failed to fetch medications:', medResponse.status, errorData)
        throw new Error(errorData.error || 'Failed to fetch medications')
      }

      const { medications: fetchedMedications } = await medResponse.json()
      
      // Normalize field names from snake_case to camelCase
      const normalizedMedications = (fetchedMedications || []).map(med => ({
        id: med.id,
        groupId: med.group_id,
        name: med.name,
        dosage: med.dosage,
        frequencyType: med.frequency_type,
        timesPerDay: med.times_per_day,
        specificTimes: med.specific_times,
        frequencyPattern: med.frequency_pattern,
        everyXDays: med.every_x_days,
        specificDays: med.specific_days,
        withFood: med.with_food,
        startDate: med.start_date,
        endDate: med.end_date,
        notes: med.notes,
        numberToTake: med.number_to_take,
        format: med.format,
        indication: med.indication,
        createdAt: med.created_at,
        updatedAt: med.updated_at
      }))
      
      setAllMedications(normalizedMedications)

      // Pre-load custom times from all existing medications into sessionStorage
      const CUSTOM_TIMES_STORAGE_KEY = 'medication_custom_times'
      const allCustomTimes = normalizedMedications
        .filter(med => med.frequencyType === 'specific_times' && med.specificTimes)
        .flatMap(med => med.specificTimes)
        .filter(time => time && time.match(/^\d{2}:\d{2}$/))
      
      if (allCustomTimes.length > 0) {
        // Get existing custom times from sessionStorage and merge
        try {
          const existing = sessionStorage.getItem(CUSTOM_TIMES_STORAGE_KEY)
          const existingTimes = existing ? JSON.parse(existing) : []
          const mergedTimes = [...new Set([...existingTimes, ...allCustomTimes])].sort()
          sessionStorage.setItem(CUSTOM_TIMES_STORAGE_KEY, JSON.stringify(mergedTimes))
        } catch (e) {
          console.error('Error saving custom times to sessionStorage:', e)
        }
      }

      // Fetch logs
      const logsResponse = await fetch('/api/just-for-me/medication/logs', {
        headers
      })

      if (logsResponse.ok) {
        const { logs: fetchedLogs } = await logsResponse.json()
        // Normalize field names from snake_case to camelCase
        const normalizedLogs = (fetchedLogs || []).map(log => ({
          id: log.id,
          medicationId: log.medication_id,
          scheduledDate: log.scheduled_date,
          scheduledTime: log.scheduled_time,
          timeNumber: log.time_number,
          takenAt: log.taken_at
        }))
        setLogs(normalizedLogs)
      }
    } catch (error) {
      console.error('Error loading medication data:', error)
    } finally {
      setLoading(false)
    }
  }, [getAuthHeaders])

  // Load data from Supabase on mount
  useEffect(() => {
    if (authLoading) {
      return
    }
    
    if (user && !groupsLoading && groups.length > 0) {
      // Load medications when groups are available, regardless of selectedGroupId
      loadData()
    } else if (!user) {
      setAllMedications([])
      setLogs([])
      setLoading(false)
    }
  }, [user, authLoading, groupsLoading, groups.length, loadData])

  const addMedication = useCallback(async (medicationData) => {
    try {
      const headers = await getAuthHeaders()

      const response = await fetch('/api/just-for-me/medication/medications', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          groupId: selectedGroupId || medicationData.groupId,
          name: medicationData.name,
          dosage: medicationData.dosage,
          frequencyType: medicationData.frequencyType,
          timesPerDay: medicationData.timesPerDay,
          specificTimes: medicationData.specificTimes,
          frequencyPattern: medicationData.frequencyPattern,
          everyXDays: medicationData.everyXDays,
          specificDays: medicationData.specificDays,
          withFood: medicationData.withFood,
          startDate: medicationData.startDate,
          endDate: medicationData.endDate,
          notes: medicationData.notes,
          numberToTake: medicationData.numberToTake,
          format: medicationData.format,
          indication: medicationData.indication
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create medication')
      }

      const { medication } = await response.json()
      
      // Normalize field names
      const normalizedMedication = {
        id: medication.id,
        groupId: medication.group_id,
        name: medication.name,
        dosage: medication.dosage,
        frequencyType: medication.frequency_type,
        timesPerDay: medication.times_per_day,
        specificTimes: medication.specific_times,
        frequencyPattern: medication.frequency_pattern,
        everyXDays: medication.every_x_days,
        specificDays: medication.specific_days,
        withFood: medication.with_food,
        startDate: medication.start_date,
        endDate: medication.end_date,
        notes: medication.notes,
        numberToTake: medication.number_to_take,
        format: medication.format,
        indication: medication.indication,
        createdAt: medication.created_at,
        updatedAt: medication.updated_at
      }
      
      // Update local state
      setAllMedications(prev => [...prev, normalizedMedication])
      
      return normalizedMedication
    } catch (error) {
      console.error('Error adding medication:', error)
      throw error
    }
  }, [selectedGroupId, getAuthHeaders])

  const updateMedication = useCallback(async (id, updates) => {
    try {
      const headers = await getAuthHeaders()

      const response = await fetch(`/api/just-for-me/medication/medications/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          groupId: updates.groupId,
          name: updates.name,
          dosage: updates.dosage,
          frequencyType: updates.frequencyType,
          timesPerDay: updates.timesPerDay,
          specificTimes: updates.specificTimes,
          frequencyPattern: updates.frequencyPattern,
          everyXDays: updates.everyXDays,
          specificDays: updates.specificDays,
          withFood: updates.withFood,
          startDate: updates.startDate,
          endDate: updates.endDate,
          notes: updates.notes,
          numberToTake: updates.numberToTake,
          format: updates.format,
          indication: updates.indication
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update medication')
      }

      const { medication } = await response.json()
      
      // Normalize field names
      const normalizedMedication = {
        id: medication.id,
        groupId: medication.group_id,
        name: medication.name,
        dosage: medication.dosage,
        frequencyType: medication.frequency_type,
        timesPerDay: medication.times_per_day,
        specificTimes: medication.specific_times,
        frequencyPattern: medication.frequency_pattern,
        everyXDays: medication.every_x_days,
        specificDays: medication.specific_days,
        withFood: medication.with_food,
        startDate: medication.start_date,
        endDate: medication.end_date,
        notes: medication.notes,
        numberToTake: medication.number_to_take,
        format: medication.format,
        indication: medication.indication,
        createdAt: medication.created_at,
        updatedAt: medication.updated_at
      }
      
      // Update local state
      setAllMedications(prev => prev.map(med => med.id === id ? normalizedMedication : med))
      
      return normalizedMedication
    } catch (error) {
      console.error('Error updating medication:', error)
      throw error
    }
  }, [getAuthHeaders])

  const deleteMedication = useCallback(async (id) => {
    try {
      const headers = await getAuthHeaders()

      const response = await fetch(`/api/just-for-me/medication/medications/${id}`, {
        method: 'DELETE',
        headers
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete medication')
      }

      // Update local state
      setAllMedications(prev => prev.filter(med => med.id !== id))
      
      // Also remove associated logs
      setLogs(prev => prev.filter(log => log.medicationId !== id))
    } catch (error) {
      console.error('Error deleting medication:', error)
      throw error
    }
  }, [getAuthHeaders])

  const toggleLogTaken = useCallback(async (medicationId, scheduledDate, scheduledTime, timeNumber) => {
    // Find existing log
    const existingLog = logs.find(log => 
      log.medicationId === medicationId &&
      log.scheduledDate === scheduledDate &&
      (scheduledTime ? log.scheduledTime === scheduledTime : log.timeNumber === timeNumber)
    )

    const newTakenAt = existingLog && existingLog.takenAt ? null : new Date().toISOString()
    
    // Optimistic UI update - update immediately for instant feedback
    const optimisticLog = existingLog 
      ? { ...existingLog, takenAt: newTakenAt }
      : {
          id: `temp-${Date.now()}`, // Temporary ID
          medicationId,
          scheduledDate,
          scheduledTime: scheduledTime || null,
          timeNumber: timeNumber || null,
          takenAt: newTakenAt
        }

    // Update local state immediately
    if (existingLog) {
      setLogs(prev => prev.map(log => 
        log.medicationId === medicationId &&
        log.scheduledDate === scheduledDate &&
        (scheduledTime ? log.scheduledTime === scheduledTime : log.timeNumber === timeNumber)
          ? optimisticLog
          : log
      ))
    } else {
      setLogs(prev => [...prev, optimisticLog])
    }

    // Then sync with server
    try {
      const headers = await getAuthHeaders()

      const response = await fetch('/api/just-for-me/medication/logs', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          medicationId,
          scheduledDate,
          scheduledTime: scheduledTime || null,
          timeNumber: timeNumber || null,
          takenAt: newTakenAt
        })
      })

      if (!response.ok) {
        // Revert optimistic update on error
        if (existingLog) {
          setLogs(prev => prev.map(log => 
            log.medicationId === medicationId &&
            log.scheduledDate === scheduledDate &&
            (scheduledTime ? log.scheduledTime === scheduledTime : log.timeNumber === timeNumber)
              ? existingLog
              : log
          ))
        } else {
          setLogs(prev => prev.filter(log => log.id !== optimisticLog.id))
        }
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update log')
      }

      const { log: updatedLog } = await response.json()
      
      // Normalize field names
      const normalizedLog = {
        id: updatedLog.id,
        medicationId: updatedLog.medication_id,
        scheduledDate: updatedLog.scheduled_date,
        scheduledTime: updatedLog.scheduled_time,
        timeNumber: updatedLog.time_number,
        takenAt: updatedLog.taken_at
      }

      // Update with server response (replace optimistic update)
      if (existingLog) {
        setLogs(prev => prev.map(log => 
          log.medicationId === medicationId &&
          log.scheduledDate === scheduledDate &&
          (scheduledTime ? log.scheduledTime === scheduledTime : log.timeNumber === timeNumber)
            ? normalizedLog
            : log
        ))
      } else {
        // Remove temporary log and add real one
        setLogs(prev => prev.filter(log => log.id !== optimisticLog.id).concat(normalizedLog))
      }
    } catch (error) {
      console.error('Error toggling log:', error)
      // Error handling already reverts the optimistic update above
      throw error
    }
  }, [logs, getAuthHeaders])

  const getLogsForDateRange = useCallback((startDate, endDate) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    return logs.filter(log => {
      const logDate = new Date(log.scheduledDate)
      return logDate >= start && logDate <= end
    })
  }, [logs])

  const value = {
    medications,
    allMedications,
    logs,
    loading,
    addMedication,
    updateMedication,
    deleteMedication,
    toggleLogTaken,
    getLogsForDateRange
  }

  return (
    <MedicationContext.Provider value={value}>
      {children}
    </MedicationContext.Provider>
  )
}
