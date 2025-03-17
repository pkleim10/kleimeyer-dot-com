import { supabase } from '@/utils/supabase'
import Link from 'next/link'

export default async function RecipesPage() {
  const { data: recipes } = await supabase
    .from('recipes')
    .select(`
      id,
      name,
      description,
      source,
      image,
      prep_time,
      cook_time,
      servings,
      categories (
        id,
        name
      )
    `)
    .order('name')

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8">All Recipes</h1>
      
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {recipes?.map((recipe) => (
          <Link
            key={recipe.id}
            href={`/recipes/${recipe.id}`}
            className="group relative rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm hover:border-gray-400 dark:hover:border-slate-600 transition-colors duration-200"
          >
            <div className="flex items-start space-x-4">
              {recipe.image && (
                <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg">
                  <img
                    src={`/assets/${recipe.image}`}
                    alt={recipe.name}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-200">
                  {recipe.name}
                </h2>
                {recipe.description && (
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                    {recipe.description}
                  </p>
                )}
                {recipe.source && (
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Source: {recipe.source}
                  </p>
                )}
                <div className="mt-4 flex items-center text-sm text-gray-500 dark:text-gray-400 space-x-4">
                  {recipe.prep_time && (
                    <span>Prep: {recipe.prep_time} min</span>
                  )}
                  {recipe.cook_time && (
                    <span>Cook: {recipe.cook_time} min</span>
                  )}
                  {recipe.servings && (
                    <span>Serves: {recipe.servings}</span>
                  )}
                </div>
                {recipe.categories && (
                  <div className="mt-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200">
                      {recipe.categories.name}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
      
      {recipes?.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 text-lg">No recipes found.</p>
        </div>
      )}
    </div>
  )
} 