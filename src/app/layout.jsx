import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { GroupProvider } from '@/contexts/GroupContext'
import { SpotifyProvider } from '@/contexts/SpotifyContext'
import { Navigation } from '@/apps/shared/components'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: "Kleimeyer.com",
  description: 'Your digital hub for family favorites and more',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full`}>
        <AuthProvider>
          <GroupProvider>
            <SpotifyProvider>
              <Navigation />
              <main className="bg-gray-50 dark:bg-slate-900">
                {children}
              </main>
              {/* Copyright Footer */}
              <footer className="bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700">
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                  <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                    © 2023-{new Date().getFullYear()} kleimeyer-dot-com. All rights reserved.
                </p>
              </div>
            </footer>
            </SpotifyProvider>
          </GroupProvider>
        </AuthProvider>
      </body>
    </html>
  )
} 