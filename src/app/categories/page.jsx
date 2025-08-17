import { supabase } from '@/utils/supabase'
import CategoriesGrid from '@/components/CategoriesGrid'

// Helper function to generate slug from name
function generateSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default async function CategoriesPage() {
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('name')

  const { data: uncategorizedRecipes } = await supabase
    .from('recipes')
    .select('*')
    .is('category_id', null)
    .order('name')

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8">Categories</h1>
      <CategoriesGrid categories={categories} uncategorizedRecipes={uncategorizedRecipes} />
    </div>
  )
} 