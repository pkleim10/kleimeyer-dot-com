'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { MedicationProvider } from '@/contexts/MedicationContext'
import { useGroups } from '@/contexts/GroupContext'
import { useAuth } from '@/contexts/AuthContext'
import MedicationList from '../../components/MedicationList'
import MedicationChecklist from '../../components/MedicationChecklist'

function GroupDetailContent() {
  const params = useParams()
  const router = useRouter()
  const { groups, setSelectedGroup, selectedGroup } = useGroups()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('medications')
  
  // Use single background field for all Other Fun Stuff pages, with fallback to old field names for backward compatibility
  // Handle case where background might not be set
  const backgroundUrl = user?.user_metadata?.other_fun_stuff_background || 
                        user?.user_metadata?.just_for_me_background || 
                        null
  const transparency = user?.user_metadata?.other_fun_stuff_background_transparency ?? 
                       user?.user_metadata?.just_for_me_background_transparency ?? 90
  const screenColor = user?.user_metadata?.other_fun_stuff_background_color ?? 
                      user?.user_metadata?.just_for_me_background_color ?? '#f9fafb'

  useEffect(() => {
    const groupId = params.groupId
    if (groupId && groups.length > 0) {
      const group = groups.find(g => g.id === groupId)
      if (group) {
        setSelectedGroup(groupId)
      } else {
        // Group not found, redirect to main page
        router.push('/other-fun-stuff/medication')
      }
    }
  }, [params.groupId, groups, setSelectedGroup, router])

  if (!selectedGroup) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Loading group...</p>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="relative min-h-screen"
      style={backgroundUrl ? {
        backgroundImage: `url(${backgroundUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      } : {
        backgroundColor: '#f9fafb'
      }}
    >
      {/* Overlay for readability */}
      {backgroundUrl && (
        <div 
          className="absolute inset-0" 
          style={{
            backgroundColor: screenColor,
            opacity: transparency / 100
          }}
        />
      )}
      <div className="relative z-10 min-h-screen bg-gray-50 dark:bg-slate-900 bg-opacity-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push('/other-fun-stuff/medication')}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            title="Back to groups"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-600 flex items-center justify-center shadow-lg">
            <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent dark:from-indigo-400 dark:to-purple-400">
              {selectedGroup.name}
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                selectedGroup.accessibleBy === 'shared' 
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
              }`}>
                {selectedGroup.accessibleBy === 'shared' ? 'Shared' : 'Only Me'}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b-2 border-gray-200 dark:border-slate-700 mb-8">
          <nav className="-mb-0.5 flex space-x-4 sm:space-x-8 overflow-x-auto">
            <button
              onClick={() => setActiveTab('medications')}
              className={`
                py-4 px-1 border-b-2 font-semibold text-sm whitespace-nowrap transition-colors duration-200
                ${
                  activeTab === 'medications'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }
              `}
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Medications
              </span>
            </button>
            <button
              onClick={() => setActiveTab('checklist')}
              className={`
                py-4 px-1 border-b-2 font-semibold text-sm whitespace-nowrap transition-colors duration-200
                ${
                  activeTab === 'checklist'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }
              `}
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                Checklist
              </span>
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'medications' && (
          <div>
            <MedicationList />
          </div>
        )}

        {activeTab === 'checklist' && (
          <div>
            <MedicationChecklist />
          </div>
        )}
      </div>
      </div>
    </div>
  )
}

export default function GroupDetailPage() {
  return (
    <MedicationProvider>
      <GroupDetailContent />
    </MedicationProvider>
  )
}

