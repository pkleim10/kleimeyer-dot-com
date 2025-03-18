import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export const metadata = {
  title: "Mom's Family Favorites",
  description: 'A collection of cherished family recipes',
}

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
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Hero Section with Side-by-Side Layout */}
      <div className="relative bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* Image Side */}
            <div className="relative h-[350px] lg:h-[400px]">
              <img
                src="https://bqhwibhrukfryafwwwat.supabase.co/storage/v1/object/public/recipe-images/mom.jpeg"
                alt="Mom's Kitchen"
                className="w-full h-full object-contain bg-gray-900"
              />
              <div className="absolute inset-0 bg-gray-900/40 dark:bg-gray-900/50" />
            </div>
            
            {/* Content Side */}
            <div className="relative flex items-center px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
              <div className="max-w-xl mx-auto">
                <h1 className="text-4xl font-bold text-white mb-4 sm:text-5xl md:text-6xl">
                  Mom's Family Favorites
                </h1>
                <p className="text-lg text-gray-100 mb-8">
                  Discover our collection of cherished family recipes, lovingly passed down through generations
                </p>
                <Link
                  href="/search"
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-indigo-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white"
                >
                  Search Recipes
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Categories Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {categories?.map((category) => (
            <Link
              key={category.id}
              href={`/categories/${generateSlug(category.name)}`}
              className="group relative rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden shadow-sm hover:border-gray-400 dark:hover:border-slate-600 transition-colors duration-200"
            >
              {category.image && (
                <div className="relative h-32 w-full">
                  <img
                    src={category.image}
                    alt={category.name}
                    className="h-full w-full object-cover opacity-40 group-hover:opacity-50 transition-opacity duration-200"
                  />
                </div>
              )}
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  {category.name}
                </h3>
                {category.description && (
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {category.description}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
} 