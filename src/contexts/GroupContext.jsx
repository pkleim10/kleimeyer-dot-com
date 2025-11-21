'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { supabase } from '@/utils/supabase'

const GroupContext = createContext({})

export const useGroups = () => useContext(GroupContext)

const SELECTED_GROUP_STORAGE_KEY = 'selected_medication_group_id'
const DEFAULT_GROUP_NAME = 'My Medications'

export function GroupProvider({ children }) {
  const { user, loading: authLoading } = useAuth()
  const [groups, setGroups] = useState([])
  const [selectedGroupId, setSelectedGroupIdState] = useState(null)
  const [loading, setLoading] = useState(true)

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

      const response = await fetch('/api/just-for-me/medication/groups', {
        headers
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Failed to fetch groups:', response.status, errorData)
        throw new Error(errorData.error || 'Failed to fetch groups')
      }

      const { groups: fetchedGroups } = await response.json()

      if (fetchedGroups && fetchedGroups.length > 0) {
        setGroups(fetchedGroups)
        
        // Set selected group from localStorage or use first group
        const storedSelectedId = localStorage.getItem(SELECTED_GROUP_STORAGE_KEY)
        const matchingGroup = fetchedGroups.find(g => g.id === storedSelectedId)
        
        if (matchingGroup) {
          setSelectedGroupIdState(storedSelectedId)
        } else {
          setSelectedGroupIdState(fetchedGroups[0].id)
          localStorage.setItem(SELECTED_GROUP_STORAGE_KEY, fetchedGroups[0].id)
        }
      } else {
        // No groups exist - create default group
        const defaultGroup = await createDefaultGroup(headers)
        if (defaultGroup) {
          setGroups([defaultGroup])
          setSelectedGroupIdState(defaultGroup.id)
          localStorage.setItem(SELECTED_GROUP_STORAGE_KEY, defaultGroup.id)
        }
      }
    } catch (error) {
      console.error('Error loading group data:', error)
      // Fallback: try to create default group
      try {
        const headers = await getAuthHeaders()
        const defaultGroup = await createDefaultGroup(headers)
        if (defaultGroup) {
          setGroups([defaultGroup])
          setSelectedGroupIdState(defaultGroup.id)
        }
      } catch (fallbackError) {
        console.error('Error creating default group:', fallbackError)
      }
    } finally {
      setLoading(false)
    }
  }, [getAuthHeaders])

  const createDefaultGroup = useCallback(async (headers) => {
    try {
      const response = await fetch('/api/just-for-me/medication/groups', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: DEFAULT_GROUP_NAME,
          accessibleBy: 'only_me'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create default group')
      }

      const { group } = await response.json()
      return group
    } catch (error) {
      console.error('Error creating default group:', error)
      return null
    }
  }, [])

  // Load data from Supabase on mount
  useEffect(() => {
    if (authLoading) {
      return
    }
    
    if (user) {
      // Small delay to ensure session is ready
      const timer = setTimeout(() => {
        loadData().catch(error => {
          console.error('Error in loadData:', error)
          setLoading(false)
        })
      }, 100)
      return () => clearTimeout(timer)
    } else {
      setGroups([])
      setSelectedGroupIdState(null)
      setLoading(false)
    }
  }, [user, authLoading, loadData])

  const addGroup = useCallback(async (groupData) => {
    try {
      const headers = await getAuthHeaders()

      const response = await fetch('/api/just-for-me/medication/groups', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: groupData.name.trim(),
          accessibleBy: groupData.accessibleBy || 'only_me',
          dayStartTime: groupData.dayStartTime,
          dayEndTime: groupData.dayEndTime
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create group')
      }

      const { group } = await response.json()
      
      // Update local state
      setGroups(prev => [...prev, group])
      
      // Auto-select newly created group
      setSelectedGroupIdState(group.id)
      localStorage.setItem(SELECTED_GROUP_STORAGE_KEY, group.id)
      
      return group
    } catch (error) {
      console.error('Error adding group:', error)
      throw error
    }
  }, [getAuthHeaders])

  const updateGroup = useCallback(async (id, updates) => {
    try {
      const headers = await getAuthHeaders()

      const response = await fetch(`/api/just-for-me/medication/groups/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          name: updates.name?.trim(),
          accessibleBy: updates.accessibleBy,
          dayStartTime: updates.dayStartTime,
          dayEndTime: updates.dayEndTime
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update group')
      }

      const { group } = await response.json()
      
      // Update local state
      setGroups(prev => prev.map(g => g.id === id ? group : g))
      
      return group
    } catch (error) {
      console.error('Error updating group:', error)
      throw error
    }
  }, [getAuthHeaders])

  const deleteGroup = useCallback(async (id) => {
    try {
      const headers = await getAuthHeaders()

      const response = await fetch(`/api/just-for-me/medication/groups/${id}`, {
        method: 'DELETE',
        headers
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete group')
      }

      // Update local state
      const updatedGroups = groups.filter(group => group.id !== id)
      setGroups(updatedGroups)
      
      // If deleted group was selected, select first remaining group or null
      if (selectedGroupId === id) {
        if (updatedGroups.length > 0) {
          setSelectedGroupIdState(updatedGroups[0].id)
          localStorage.setItem(SELECTED_GROUP_STORAGE_KEY, updatedGroups[0].id)
        } else {
          setSelectedGroupIdState(null)
          localStorage.removeItem(SELECTED_GROUP_STORAGE_KEY)
        }
      }
    } catch (error) {
      console.error('Error deleting group:', error)
      throw error
    }
  }, [groups, selectedGroupId, getAuthHeaders])

  const setSelectedGroup = useCallback((groupId) => {
    if (groups.find(g => g.id === groupId)) {
      setSelectedGroupIdState(groupId)
      localStorage.setItem(SELECTED_GROUP_STORAGE_KEY, groupId)
    }
  }, [groups])

  const getSelectedGroup = useCallback(() => {
    return groups.find(g => g.id === selectedGroupId) || null
  }, [groups, selectedGroupId])

  const value = {
    groups,
    selectedGroupId,
    selectedGroup: getSelectedGroup(),
    loading,
    addGroup,
    updateGroup,
    deleteGroup,
    setSelectedGroup,
    getSelectedGroup
  }

  return (
    <GroupContext.Provider value={value}>
      {children}
    </GroupContext.Provider>
  )
}
