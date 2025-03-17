import Link from 'next/link'
import { supabase } from '@/utils/supabase'

// Helper function to generate slug from name
function generateSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function getAllCategories() {
  const { data: categories, error } = await supabase
    .from('categories')
    .select('*')
    .order('name')
  
  if (error) {
    console.error('Error fetching categories:', error)
    return []
  }
  
  return categories
}

export default async function Home() {
  const categories = await getAllCategories()

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 sm:text-5xl md:text-6xl">
          Welcome to Mom's Recipe Collection
        </h1>
        <p className="mt-3 max-w-md mx-auto text-base text-gray-500 dark:text-gray-400 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
          Discover a treasure trove of cherished family recipes, carefully curated and passed down through generations.
        </p>
        <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
          <Link
            href="/search"
            className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 md:py-4 md:text-lg md:px-10"
          >
            Search Recipes
          </Link>
        </div>
      </div>

      <div className="mt-16">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-8">Recipe Categories</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
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
    </div>
  )
} 