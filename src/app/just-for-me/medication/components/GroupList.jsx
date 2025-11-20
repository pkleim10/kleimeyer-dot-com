'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useGroups } from '@/contexts/GroupContext'
import { useMedications } from '@/contexts/MedicationContext'
import { usePermissions } from '@/hooks/usePermissions'
import GroupForm from './GroupForm'

export default function GroupList() {
  const router = useRouter()
  const { groups, deleteGroup } = useGroups()
  const { medications: allMedications } = useMedications()
  const { 
    canViewSharedMedicationGroups, 
    canEditSharedMedicationGroups, 
    canDeleteSharedMedicationGroups 
  } = usePermissions()
  const [editingGroup, setEditingGroup] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [deletingGroupId, setDeletingGroupId] = useState(null)

  // Filter groups based on permissions
  const visibleGroups = groups.filter(group => {
    if (group.accessibleBy === 'only_me') {
      return true // Always show "Only Me" groups
    }
    // For shared groups, check view permission
    return canViewSharedMedicationGroups
  })

  const getMedicationCount = (groupId) => {
    return allMedications.filter(med => med.groupId === groupId).length
  }

  const handleGroupClick = (groupId) => {
    router.push(`/just-for-me/medication/group/${groupId}`)
  }

  const handleEdit = (e, group) => {
    e.stopPropagation()
    setEditingGroup(group)
    setShowForm(true)
  }

  const handleDelete = async (e, group) => {
    e.stopPropagation()
    
    if (group.accessibleBy === 'shared' && !canDeleteSharedMedicationGroups) {
      alert('You do not have permission to delete shared groups')
      return
    }

    const medicationCount = getMedicationCount(group.id)
    if (medicationCount > 0) {
      const confirmDelete = confirm(
        `This group has ${medicationCount} medication(s). Deleting it will also delete all associated medications. Are you sure?`
      )
      if (!confirmDelete) return
    }

    setDeletingGroupId(group.id)
    try {
      deleteGroup(group.id)
    } catch (error) {
      alert('Failed to delete group')
    } finally {
      setDeletingGroupId(null)
    }
  }

  const handleFormSave = () => {
    setShowForm(false)
    setEditingGroup(null)
  }

  const handleFormCancel = () => {
    setShowForm(false)
    setEditingGroup(null)
  }

  const canEditGroup = (group) => {
    if (group.accessibleBy === 'only_me') return true
    return canEditSharedMedicationGroups
  }

  const canDeleteGroup = (group) => {
    if (group.accessibleBy === 'only_me') return true
    return canDeleteSharedMedicationGroups
  }

  if (showForm) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
          {editingGroup ? 'Edit Group' : 'Create New Group'}
        </h2>
        <GroupForm 
          group={editingGroup} 
          onSave={handleFormSave} 
          onCancel={handleFormCancel}
        />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {visibleGroups.map((group) => {
        const medicationCount = getMedicationCount(group.id)
        const isDeleting = deletingGroupId === group.id
        
        return (
          <div
            key={group.id}
            onClick={() => handleGroupClick(group.id)}
            className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow border border-gray-200 dark:border-slate-700"
          >
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex-1">
                {group.name}
              </h3>
              <div className="flex items-center gap-2">
                {canEditGroup(group) && (
                  <button
                    onClick={(e) => handleEdit(e, group)}
                    className="p-1 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                    title="Edit group"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                )}
                {canDeleteGroup(group) && (
                  <button
                    onClick={(e) => handleDelete(e, group)}
                    disabled={isDeleting}
                    className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                    title="Delete group"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2 mb-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                group.accessibleBy === 'shared' 
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
              }`}>
                {group.accessibleBy === 'shared' ? 'Shared' : 'Only Me'}
              </span>
            </div>
            
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {medicationCount === 0 
                ? 'No medications' 
                : `${medicationCount} medication${medicationCount === 1 ? '' : 's'}`
              }
            </div>
          </div>
        )
      })}
      
      <div
        onClick={() => setShowForm(true)}
        className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow border-2 border-dashed border-gray-300 dark:border-slate-600 flex flex-col items-center justify-center min-h-[200px] text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
      >
        <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <span className="text-sm font-medium">Create New Group</span>
      </div>
    </div>
  )
}

