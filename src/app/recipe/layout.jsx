import { Navigation } from '@/apps/shared/components'

export const metadata = {
  title: "Mom's Recipe Collection",
  description: 'A collection of cherished family recipes',
}

export default function RecipeLayout({ children }) {
  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-gray-50 dark:bg-slate-900">
        {children}
      </main>
    </>
  )
}
