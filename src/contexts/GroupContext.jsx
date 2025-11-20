'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'

const GroupContext = createContext({})

export const useGroups = () => useContext(GroupContext)

const GROUPS_STORAGE_KEY = 'medication_groups_data'
const SELECTED_GROUP_STORAGE_KEY = 'selected_medication_group_id'
const DEFAULT_GROUP_NAME = 'My Medications'

export function GroupProvider({ children }) {
  const { user } = useAuth()
  const [groups, setGroups] = useState([])
  const [selectedGroupId, setSelectedGroupIdState] = useState(null)
  const [loading, setLoading] = useState(true)

  // Load data from localStorage on mount
  useEffect(() => {
    if (user) {
      loadData()
    } else {
      setGroups([])
      setSelectedGroupIdState(null)
      setLoading(false)
    }
  }, [user])

  const loadData = useCallback(() => {
    try {
      const storedGroups = localStorage.getItem(GROUPS_STORAGE_KEY)
      const storedSelectedId = localStorage.getItem(SELECTED_GROUP_STORAGE_KEY)
      
      if (storedGroups) {
        const parsedGroups = JSON.parse(storedGroups)
        setGroups(parsedGroups)
        
        // Set selected group if stored, otherwise use first group
        if (storedSelectedId && parsedGroups.find(g => g.id === storedSelectedId)) {
          setSelectedGroupIdState(storedSelectedId)
        } else if (parsedGroups.length > 0) {
          setSelectedGroupIdState(parsedGroups[0].id)
          localStorage.setItem(SELECTED_GROUP_STORAGE_KEY, parsedGroups[0].id)
        }
      } else {
        // No groups exist - create default group
        const defaultGroup = {
          id: crypto.randomUUID(),
          name: DEFAULT_GROUP_NAME,
          accessibleBy: 'only_me',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        const initialGroups = [defaultGroup]
        setGroups(initialGroups)
        setSelectedGroupIdState(defaultGroup.id)
        localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(initialGroups))
        localStorage.setItem(SELECTED_GROUP_STORAGE_KEY, defaultGroup.id)
      }
    } catch (error) {
      console.error('Error loading group data:', error)
      // Create default group on error
      const defaultGroup = {
        id: crypto.randomUUID(),
        name: DEFAULT_GROUP_NAME,
        accessibleBy: 'only_me',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      setGroups([defaultGroup])
      setSelectedGroupIdState(defaultGroup.id)
    } finally {
      setLoading(false)
    }
  }, [])

  const saveGroups = useCallback((newGroups) => {
    try {
      localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(newGroups))
      setGroups(newGroups)
    } catch (error) {
      console.error('Error saving groups:', error)
    }
  }, [])

  const addGroup = useCallback((groupData) => {
    const newGroup = {
      id: crypto.randomUUID(),
      name: groupData.name.trim(),
      accessibleBy: groupData.accessibleBy || 'only_me',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    const updatedGroups = [...groups, newGroup]
    saveGroups(updatedGroups)
    
    // Auto-select newly created group
    setSelectedGroupIdState(newGroup.id)
    localStorage.setItem(SELECTED_GROUP_STORAGE_KEY, newGroup.id)
    
    return newGroup
  }, [groups, saveGroups])

  const updateGroup = useCallback((id, updates) => {
    const updatedGroups = groups.map(group => 
      group.id === id 
        ? { ...group, ...updates, name: updates.name?.trim() || group.name, updatedAt: new Date().toISOString() }
        : group
    )
    saveGroups(updatedGroups)
  }, [groups, saveGroups])

  const deleteGroup = useCallback((id) => {
    const updatedGroups = groups.filter(group => group.id !== id)
    saveGroups(updatedGroups)
    
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
  }, [groups, selectedGroupId, saveGroups])

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

