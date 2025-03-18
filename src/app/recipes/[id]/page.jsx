import { supabase } from '@/utils/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { headers } from 'next/headers'

// Helper function to generate slug from name
function generateSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default async function RecipePage({ params }) {
  const { id } = params
  const headersList = headers()
  const referer = headersList.get('referer') || ''
  const isFromSearch = referer.includes('/search')
  
  const { data: recipe, error } = await supabase
    .from('recipes')
    .select(`
      *,
      categories (
        id,
        name
      )
    `)
    .eq('id', id)
    .single()

  if (error || !recipe) {
    notFound()
  }

  // Generate the category slug if we have a category
  const categorySlug = recipe.categories ? generateSlug(recipe.categories.name) : null

  // Determine back link text and URL
  const backLink = isFromSearch 
    ? { text: 'Search', url: '/search' }
    : recipe.categories 
      ? { text: recipe.categories.name, url: `/categories/${categorySlug}` }
      : { text: 'Search', url: '/search' }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-6">
        <Link
          href={backLink.url}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to {backLink.text}
        </Link>
      </div>
      <div className="bg-white dark:bg-slate-800 shadow overflow-hidden sm:rounded-lg border border-gray-200 dark:border-slate-700">
        {recipe.image && (
          <div className="relative h-96 w-full overflow-hidden">
            <img
              src={recipe.image}
              alt={recipe.name}
              className="h-full w-full object-cover"
            />
          </div>
        )}
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{recipe.name}</h1>
            {recipe.categories && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                {recipe.categories.name}
              </span>
            )}
          </div>

          <div className="mt-4 flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
            <span>Prep: {recipe.prep_time} min</span>
            <span>Cook: {recipe.cook_time} min</span>
            <span>Serves: {recipe.servings}</span>
          </div>

          {recipe.source && (
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              Source: {recipe.source}
            </p>
          )}

          <p className="mt-4 text-gray-600 dark:text-gray-300">{recipe.description}</p>

          {recipe.notes && (
            <div className="mt-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Notes</h2>
              <p className="mt-2 text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{recipe.notes}</p>
            </div>
          )}

          <div className="mt-8">
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Ingredients</h2>
            <ul className="mt-4 space-y-2">
              {recipe.ingredients.map((ingredient, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-gray-600 dark:text-gray-300">{ingredient}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-8">
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Instructions</h2>
            <ol className="mt-4 space-y-4">
              {recipe.instructions.map((instruction, index) => (
                <li key={index} className="flex">
                  <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 font-medium">
                    {index + 1}
                  </span>
                  <span className="ml-4 text-gray-600 dark:text-gray-300">{instruction}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
} 