import { supabase } from '@/utils/supabase'
import { notFound } from 'next/navigation'
import RecipesGrid from '@/components/RecipesGrid'

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
      servings,
      ingredients,
      instructions,
      notes,
      category_id
    `)
    .eq('category_id', category.id)
    .order('name')

  if (recipesError) {
    console.error('Error fetching recipes:', recipesError)
    return { ...category, recipes: [], allCategories: categories }
  }

  return { ...category, recipes: recipes || [], allCategories: categories }
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

export default async function CategoryPage({ params }) {
  const { slug } = await params
  const categoryData = await getCategoryWithRecipes(slug)

  if (!categoryData) {
    notFound()
  }

  const { recipes, allCategories, ...category } = categoryData

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{category.name}</h1>
      {category.description && (
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">{category.description}</p>
      )}

      <RecipesGrid recipes={recipes} categories={allCategories} currentCategoryId={category.id} />
    </div>
  )
} 