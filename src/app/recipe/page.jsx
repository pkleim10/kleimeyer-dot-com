import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { CategoriesGrid } from '@/apps/recipes/components'

export const revalidate = 0 // Add revalidation

export const metadata = {
  title: "Mom's Family Favorites",
  description: 'A collection of cherished family recipes',
}

export default async function RecipeHomePage() {
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('name')

  // Fetch uncategorized recipes for admin display
  const { data: uncategorizedRecipes } = await supabase
    .from('recipes')
    .select('*')
    .is('category_id', null)
    .order('name')

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Hero Section with Side-by-Side Layout */}
      <div className="relative bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* Image Side */}
            <div className="relative h-[350px] lg:h-[400px] flex items-center justify-center">
              <div className="relative w-80 h-80 lg:w-96 lg:h-96">
                {/* Gradient oval frame */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-400 via-purple-500 to-pink-500 p-1 shadow-2xl">
                  <div className="w-full h-full rounded-full overflow-hidden">
                    <img
                      src="https://bqhwibhrukfryafwwwat.supabase.co/storage/v1/object/public/recipe-images/mom.jpeg"
                      alt="Mom's Kitchen"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                {/* Additional glow effect */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-400/20 via-purple-500/20 to-pink-500/20 blur-xl scale-110" />
              </div>
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
                  href="/recipe/search"
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
        <CategoriesGrid categories={categories} uncategorizedRecipes={uncategorizedRecipes} />
      </div>
    </main>
  )
}
