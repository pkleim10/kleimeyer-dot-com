import Link from 'next/link'
import { supabase } from '@/utils/supabase'

// Helper function to generate slug from name
function generateSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default async function HomePage() {
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('name')

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
          {categories?.map((category) => (
            <div
              key={category.id}
              className="group relative rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden shadow-sm hover:border-gray-400 dark:hover:border-slate-600 transition-colors duration-200"
            >
              <Link
                href={`/categories/${generateSlug(category.name)}`}
                className="block"
              >
                {category.image && (
                  <div className="relative h-32 w-full">
                    <img
                      src={`/assets/${category.image}`}
                      alt={category.name}
                      className="h-full w-full object-cover opacity-40 group-hover:opacity-50 transition-opacity duration-200"
                    />
                  </div>
                )}
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-200">
                    {category.name}
                  </h2>
                  {category.description && (
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      {category.description}
                    </p>
                  )}
                </div>
              </Link>
            </div>
          ))}
        </div>

        {categories?.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 text-lg">No categories found.</p>
          </div>
        )}
      </div>
    </div>
  )
} 