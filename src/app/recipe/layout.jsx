import { Navigation } from '@/apps/shared/components'

export const metadata = {
  title: "Mom's Recipe Collection",
  description: 'A collection of cherished family recipes',
}

export default function RecipeLayout({ children }) {
  return (
    <>
      <Navigation />
      {children}
    </>
  )
}
