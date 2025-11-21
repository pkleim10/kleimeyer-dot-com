'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { useGroups } from './GroupContext'
import { supabase } from '@/utils/supabase'

const MedicationContext = createContext({})

export const useMedications = () => useContext(MedicationContext)

const MIGRATION_FLAG_KEY = 'medications_migrated_to_supabase'

export function MedicationProvider({ children }) {
  const { user } = useAuth()
  const { selectedGroupId, groups, loading: groupsLoading } = useGroups()
  const [allMedications, setAllMedications] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Filter medications by selected group
  const medications = selectedGroupId 
    ? allMedications.filter(med => med.groupId === selectedGroupId)
    : []

  // Load data from Supabase on mount
  useEffect(() => {
    if (user && !groupsLoading) {
      loadData()
    } else if (!user) {
      setAllMedications([])
      setLogs([])
      setLoading(false)
    }
  }, [user, groupsLoading, selectedGroupId])

  const getAuthHeaders = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      throw new Error('No session')
    }
    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    }
  }, [])

  const migrateFromLocalStorage = useCallback(async () => {
    try {
      const storedMedications = localStorage.getItem('medications_data')
      const storedLogs = localStorage.getItem('medication_logs_data')
      
      if (!storedMedications && !storedLogs) {
        return false
      }

      const headers = await getAuthHeaders()
      let migrated = false

      // Migrate medications
      if (storedMedications) {
        const parsedMedications = JSON.parse(storedMedications)
        if (parsedMedications && parsedMedications.length > 0) {
          for (const med of parsedMedications) {
            try {
              // Map localStorage structure to API structure
              await fetch('/api/just-for-me/medication/medications', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                  groupId: med.groupId,
                  name: med.name,
                  dosage: med.dosage,
                  frequencyType: med.frequencyType,
                  timesPerDay: med.timesPerDay,
                  specificTimes: med.specificTimes,
                  frequencyPattern: med.frequencyPattern,
                  everyXDays: med.everyXDays,
                  specificDays: med.specificDays,
                  withFood: med.withFood,
                  startDate: med.startDate,
                  endDate: med.endDate,
                  notes: med.notes,
                  numberToTake: med.numberToTake,
                  format: med.format,
                  indication: med.indication
                })
              })
              migrated = true
            } catch (error) {
              console.error('Error migrating medication:', error)
            }
          }
        }
      }

      // Migrate logs (after medications are migrated)
      if (storedLogs && migrated) {
        const parsedLogs = JSON.parse(storedLogs)
        if (parsedLogs && parsedLogs.length > 0) {
          // Note: Logs will need medication IDs from Supabase, so we'll skip for now
          // They'll be recreated as users interact with the checklist
        }
      }

      if (migrated) {
        localStorage.setItem(MIGRATION_FLAG_KEY, 'true')
        localStorage.removeItem('medications_data')
        localStorage.removeItem('medication_logs_data')
      }

      return migrated
    } catch (error) {
      console.error('Error migrating medications from localStorage:', error)
      return false
    }
  }, [getAuthHeaders])

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
      console.log('Fetched medications from Supabase:', fetchedMedications?.length || 0)
      console.log('Current selectedGroupId:', selectedGroupId)
      
      // Normalize field names from snake_case to camelCase
      const normalizedMedications = (fetchedMedications || []).map(med => ({
        ...med,
        groupId: med.group_id,
        frequencyType: med.frequency_type,
        timesPerDay: med.times_per_day,
        specificTimes: med.specific_times,
        frequencyPattern: med.frequency_pattern,
        everyXDays: med.every_x_days,
        specificDays: med.specific_days,
        withFood: med.with_food,
        startDate: med.start_date,
        endDate: med.end_date,
        numberToTake: med.number_to_take
      }))
      
      console.log('Normalized medications:', normalizedMedications.length)
      console.log('Medications by group:', normalizedMedications.reduce((acc, med) => {
        acc[med.groupId] = (acc[med.groupId] || 0) + 1
        return acc
      }, {}))
      
      setAllMedications(normalizedMedications)

      // Fetch logs
      const logsResponse = await fetch('/api/just-for-me/medication/logs', {
        headers
      })

      if (logsResponse.ok) {
        const { logs: fetchedLogs } = await logsResponse.json()
        // Normalize field names from snake_case to camelCase
        const normalizedLogs = (fetchedLogs || []).map(log => ({
          ...log,
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
  }, [getAuthHeaders, migrateFromLocalStorage])

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
        ...medication,
        groupId: medication.group_id,
        frequencyType: medication.frequency_type,
        timesPerDay: medication.times_per_day,
        specificTimes: medication.specific_times,
        frequencyPattern: medication.frequency_pattern,
        everyXDays: medication.every_x_days,
        specificDays: medication.specific_days,
        withFood: medication.with_food,
        startDate: medication.start_date,
        endDate: medication.end_date,
        numberToTake: medication.number_to_take
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
          indication: updates.indication,
          groupId: updates.groupId
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update medication')
      }

      const { medication } = await response.json()
      
      // Normalize field names
      const normalizedMedication = {
        ...medication,
        groupId: medication.group_id,
        frequencyType: medication.frequency_type,
        timesPerDay: medication.times_per_day,
        specificTimes: medication.specific_times,
        frequencyPattern: medication.frequency_pattern,
        everyXDays: medication.every_x_days,
        specificDays: medication.specific_days,
        withFood: medication.with_food,
        startDate: medication.start_date,
        endDate: medication.end_date,
        numberToTake: medication.number_to_take
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
      
      // Also remove associated logs from local state
      setLogs(prev => prev.filter(log => log.medication_id !== id))
    } catch (error) {
      console.error('Error deleting medication:', error)
      throw error
    }
  }, [getAuthHeaders])

  const toggleLogTaken = useCallback(async (medicationId, scheduledDate, scheduledTime, timeNumber) => {
    try {
      const headers = await getAuthHeaders()

      // Find existing log
      const existingLog = logs.find(log => 
        log.medication_id === medicationId &&
        log.scheduled_date === scheduledDate &&
        (scheduledTime ? log.scheduled_time === scheduledTime : log.time_number === timeNumber)
      )

      const takenAt = existingLog && existingLog.taken_at ? null : new Date().toISOString()

      const response = await fetch('/api/just-for-me/medication/logs', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          medicationId,
          scheduledDate,
          scheduledTime: scheduledTime || null,
          timeNumber: timeNumber || null,
          takenAt
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update log')
      }

      const { log: updatedLog } = await response.json()
      
      // Normalize field names
      const normalizedLog = {
        ...updatedLog,
        medicationId: updatedLog.medication_id,
        scheduledDate: updatedLog.scheduled_date,
        scheduledTime: updatedLog.scheduled_time,
        timeNumber: updatedLog.time_number,
        takenAt: updatedLog.taken_at
      }
      
      // Update local state
      if (existingLog) {
        setLogs(prev => prev.map(l => l.id === existingLog.id ? normalizedLog : l))
      } else {
        setLogs(prev => [...prev, normalizedLog])
      }
    } catch (error) {
      console.error('Error toggling log:', error)
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
    allMedications, // All medications (not filtered by group) for counting purposes
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
