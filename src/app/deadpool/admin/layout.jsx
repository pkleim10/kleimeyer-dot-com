import { AuthProvider } from '@/contexts/AuthContext'

// Scopes the site's real Supabase Auth context to just /deadpool/admin/* —
// every other deadpool page stays provider-free per src/app/deadpool/layout.jsx.
export default function DeadpoolAdminLayout({ children }) {
  return <AuthProvider>{children}</AuthProvider>
}
