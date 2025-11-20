'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { useGroups } from './GroupContext'

const MedicationContext = createContext({})

export const useMedications = () => useContext(MedicationContext)

const STORAGE_KEY = 'medications_data'
const LOGS_STORAGE_KEY = 'medication_logs_data'

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

  // Load data from localStorage on mount
  useEffect(() => {
    if (user && !groupsLoading) {
      loadData()
    } else if (!user) {
      setAllMedications([])
      setLogs([])
      setLoading(false)
    }
  }, [user, groupsLoading])

  const loadData = useCallback(() => {
    try {
      const storedMedications = localStorage.getItem(STORAGE_KEY)
      const storedLogs = localStorage.getItem(LOGS_STORAGE_KEY)
      
      let parsedMedications = []
      if (storedMedications) {
        parsedMedications = JSON.parse(storedMedications)
      }
      
      // Migration: Assign medications without groupId to default group
      if (groups.length > 0 && parsedMedications.length > 0) {
        const defaultGroup = groups[0] // First group is default
        let needsMigration = false
        
        const migratedMedications = parsedMedications.map(med => {
          if (!med.groupId) {
            needsMigration = true
            return { ...med, groupId: defaultGroup.id }
          }
          return med
        })
        
        if (needsMigration) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(migratedMedications))
          parsedMedications = migratedMedications
        }
      }
      
      setAllMedications(parsedMedications)
      
      if (storedLogs) {
        setLogs(JSON.parse(storedLogs))
      }
    } catch (error) {
      console.error('Error loading medication data:', error)
    } finally {
      setLoading(false)
    }
  }, [groups])

  const saveMedications = useCallback((newMedications) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newMedications))
      setAllMedications(newMedications)
    } catch (error) {
      console.error('Error saving medications:', error)
    }
  }, [])

  const saveLogs = useCallback((newLogs) => {
    try {
      localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(newLogs))
      setLogs(newLogs)
    } catch (error) {
      console.error('Error saving logs:', error)
    }
  }, [])

  const addMedication = useCallback((medicationData) => {
    const newMedication = {
      id: crypto.randomUUID(),
      ...medicationData,
      groupId: selectedGroupId || medicationData.groupId, // Auto-assign to selected group
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    const updatedMedications = [...allMedications, newMedication]
    saveMedications(updatedMedications)
    return newMedication
  }, [allMedications, selectedGroupId, saveMedications])

  const updateMedication = useCallback((id, updates) => {
    const updatedMedications = allMedications.map(med => 
      med.id === id 
        ? { ...med, ...updates, updatedAt: new Date().toISOString() }
        : med
    )
    saveMedications(updatedMedications)
  }, [allMedications, saveMedications])

  const deleteMedication = useCallback((id) => {
    const updatedMedications = allMedications.filter(med => med.id !== id)
    saveMedications(updatedMedications)
    
    // Also delete associated logs
    const updatedLogs = logs.filter(log => log.medicationId !== id)
    saveLogs(updatedLogs)
  }, [allMedications, logs, saveMedications, saveLogs])

  const toggleLogTaken = useCallback((medicationId, scheduledDate, scheduledTime, timeNumber) => {
    // Find existing log
    const logKey = `${medicationId}-${scheduledDate}-${scheduledTime || timeNumber}`
    const existingLog = logs.find(log => 
      log.medicationId === medicationId &&
      log.scheduledDate === scheduledDate &&
      (scheduledTime ? log.scheduledTime === scheduledTime : log.timeNumber === timeNumber)
    )

    let updatedLogs
    
    if (existingLog && existingLog.takenAt) {
      // Unmark as taken
      updatedLogs = logs.map(log => 
        log.id === existingLog.id 
          ? { ...log, takenAt: null }
          : log
      )
    } else if (existingLog) {
      // Mark as taken
      updatedLogs = logs.map(log => 
        log.id === existingLog.id 
          ? { ...log, takenAt: new Date().toISOString() }
          : log
      )
    } else {
      // Create new log entry
      const newLog = {
        id: crypto.randomUUID(),
        medicationId,
        scheduledDate,
        scheduledTime: scheduledTime || null,
        timeNumber: timeNumber || null,
        takenAt: new Date().toISOString()
      }
      updatedLogs = [...logs, newLog]
    }
    
    saveLogs(updatedLogs)
  }, [logs, saveLogs])

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

