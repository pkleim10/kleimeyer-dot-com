import { supabase } from '@/utils/supabase'
import Link from 'next/link'

// Helper function to generate slug from name
function generateSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default async function CategoriesPage() {
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('name')

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8">Recipe Categories</h1>
      
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {categories?.map((category) => (
          <Link
            key={category.id}
            href={`/categories/${generateSlug(category.name)}`}
            className="relative rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 dark:hover:border-slate-600 transition-colors duration-200"
          >
            <div className="flex-1 min-w-0">
              <span className="absolute inset-0" aria-hidden="true" />
              <p className="text-lg font-medium text-gray-900 dark:text-gray-100">{category.name}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {category.description || 'Explore recipes in this category'}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
} 