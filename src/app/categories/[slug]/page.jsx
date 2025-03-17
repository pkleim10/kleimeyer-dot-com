import { supabase } from '@/utils/supabase'
import Link from 'next/link'
import { notFound } from 'next/navigation'

// Helper function to generate slug from name
function generateSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function getCategoryWithRecipes(urlSlug) {
  // First get all categories and find the matching one by comparing slugs
  const { data: categories, error: categoryError } = await supabase
    .from('categories')
    .select('*')

  if (categoryError) {
    console.error('Error fetching categories:', categoryError)
    return null
  }

  // Find the category whose name generates the matching slug
  const category = categories.find(cat => generateSlug(cat.name) === urlSlug)

  if (!category) {
    return null
  }

  // Then get all recipes in this category using the category's ID
  const { data: recipes, error: recipesError } = await supabase
    .from('recipes')
    .select(`
      id,
      name,
      description,
      source,
      image,
      prep_time,
      cook_time,
      servings
    `)
    .eq('category_id', category.id)
    .order('name')

  if (recipesError) {
    console.error('Error fetching recipes:', recipesError)
    return { ...category, recipes: [] }
  }

  return { ...category, recipes: recipes || [] }
}

// Generate static params for known categories
export async function generateStaticParams() {
  const { data: categories } = await supabase
    .from('categories')
    .select('name')

  return (categories || []).map((category) => ({
    slug: generateSlug(category.name),
  }))
}

export const dynamic = 'force-dynamic'

export default async function CategoryPage(props) {
  const params = await props.params
  const category = await getCategoryWithRecipes(params.slug)

  if (!category) {
    notFound()
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{category.name}</h1>
      {category.description && (
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">{category.description}</p>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {category.recipes.map((recipe) => (
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
              </div>
            </div>
          </Link>
        ))}
      </div>

      {category.recipes.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 text-lg">No recipes found in this category.</p>
        </div>
      )}
    </div>
  )
} 