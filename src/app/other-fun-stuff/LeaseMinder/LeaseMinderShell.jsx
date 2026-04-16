'use client'

import { useAuth } from '@/contexts/AuthContext'

export default function LeaseMinderShell({ children }) {
  const { user } = useAuth()

  const backgroundUrl =
    user?.user_metadata?.other_fun_stuff_background || user?.user_metadata?.just_for_me_background || null
  const transparency =
    user?.user_metadata?.other_fun_stuff_background_transparency ??
    user?.user_metadata?.just_for_me_background_transparency ??
    90
  const screenColor =
    user?.user_metadata?.other_fun_stuff_background_color ??
    user?.user_metadata?.just_for_me_background_color ??
    '#f9fafb'

  return (
    <div
      className="relative min-h-screen"
      style={
        backgroundUrl
          ? {
              backgroundImage: `url(${backgroundUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundAttachment: 'fixed',
            }
          : {
              backgroundColor: '#f9fafb',
            }
      }
    >
      {backgroundUrl && (
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: screenColor,
            opacity: transparency / 100,
          }}
        />
      )}
      <div className="relative z-10 min-h-screen bg-gray-50 dark:bg-slate-900 bg-opacity-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20">{children}</div>
      </div>
    </div>
  )
}
