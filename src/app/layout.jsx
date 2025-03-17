import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import Navigation from '@/components/Navigation'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: "Mom's Recipe Collection",
  description: 'A collection of cherished family recipes',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full`}>
        <AuthProvider>
          <Navigation />
          <main className="min-h-screen bg-gray-50 dark:bg-slate-900">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  )
} 