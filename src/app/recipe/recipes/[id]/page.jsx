import { supabase } from '@/utils/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { headers } from 'next/headers'
import ShareRecipeButton from '@/apps/recipes/components/ShareRecipeButton'

// Helper function to generate slug from name
function generateSlug(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

// Helper function to generate JSON-LD structured data for recipes
function generateRecipeJsonLd(recipe, recipeUrl) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: recipe.name,
    description: recipe.description || undefined,
    image: recipe.image || undefined,
    recipeYield: recipe.servings ? `${recipe.servings}` : undefined,
    recipeIngredient: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
    recipeInstructions: Array.isArray(recipe.instructions) 
      ? recipe.instructions.map((instruction, index) => ({
          '@type': 'HowToStep',
          position: index + 1,
          text: instruction
        }))
      : [],
    url: recipeUrl
  }

  // Add prep time if available (format: PT{minutes}M)
  if (recipe.prep_time) {
    jsonLd.prepTime = `PT${recipe.prep_time}M`
  }

  // Add cook time if available (format: PT{minutes}M)
  if (recipe.cook_time) {
    jsonLd.cookTime = `PT${recipe.cook_time}M`
  }

  // Add total time if both prep and cook times are available
  if (recipe.prep_time && recipe.cook_time) {
    const totalMinutes = parseInt(recipe.prep_time) + parseInt(recipe.cook_time)
    jsonLd.totalTime = `PT${totalMinutes}M`
  }

  // Add author/source if available
  if (recipe.source) {
    jsonLd.author = {
      '@type': 'Person',
      name: recipe.source
    }
  }

  // Add recipe category if available
  if (recipe.categories?.name) {
    jsonLd.recipeCategory = recipe.categories.name
    jsonLd.recipeCuisine = recipe.categories.name
  }

  // Remove undefined values
  return Object.fromEntries(
    Object.entries(jsonLd).filter(([_, value]) => value !== undefined)
  )
}

export default async function RecipePage({ params, searchParams }) {
  const { id } = await params
  const resolvedSearchParams = await searchParams
  const backUrl = resolvedSearchParams?.back ? decodeURIComponent(resolvedSearchParams.back) : null
  const headersList = await headers()
  const referer = headersList.get('referer') || ''
  const host = headersList.get('host') || ''
  const protocol = headersList.get('x-forwarded-proto') || 'https'
  const isFromSearch = referer.includes('/recipe/search')
  
  // First try to find recipe by ID (for backward compatibility)
  let { data: recipe, error } = await supabase
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

  // If not found by ID, try to find by slug (generated from name)
  if (error || !recipe) {
    const { data: recipes, error: recipesError } = await supabase
      .from('recipes')
      .select(`
        *,
        categories (
          id,
          name
        )
      `)
    
    if (recipesError) {
      notFound()
    }
    
    // Find recipe by matching the slug parameter with generated slug from name
    recipe = recipes.find(r => generateSlug(r.name) === id)
    
    if (!recipe) {
      notFound()
    }
  }

  // Generate the category slug if we have a category
  const categorySlug = recipe.categories ? generateSlug(recipe.categories.name) : null

  // Determine back link text and URL
  // Priority: 1. Query parameter (back), 2. Referer detection, 3. Category, 4. Default to search
  let backLink
  if (backUrl) {
    // Extract page name from URL for display
    if (backUrl.includes('/recipe/search')) {
      backLink = { text: 'Search', url: '/recipe/search' }
    } else if (backUrl.includes('/recipe/categories/')) {
      const categoryName = recipe.categories?.name || 'Category'
      backLink = { text: categoryName, url: backUrl }
    } else if (backUrl.includes('/recipe')) {
      backLink = { text: 'Recipes', url: '/recipe' }
    } else {
      backLink = { text: 'Back', url: backUrl }
    }
  } else if (isFromSearch) {
    backLink = { text: 'Search', url: '/recipe/search' }
  } else if (recipe.categories) {
    backLink = { text: recipe.categories.name, url: `/recipe/categories/${categorySlug}` }
  } else {
    backLink = { text: 'Recipes', url: '/recipe' }
  }

  // Generate recipe URL for JSON-LD (use slug for better SEO)
  const recipeSlug = generateSlug(recipe.name)
  const recipeUrl = host ? `${protocol}://${host}/recipe/recipes/${recipeSlug}` : undefined

  // Generate JSON-LD structured data
  const recipeJsonLd = generateRecipeJsonLd(recipe, recipeUrl)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(recipeJsonLd) }}
      />
      <main className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href={backLink.url}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to {backLink.text}
          </Link>
          <ShareRecipeButton recipeName={recipe.name} />
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
  </main>
    </>
  )
}
