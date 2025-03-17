import { supabase } from '@/utils/supabase'
import RecipeForm from '@/components/RecipeForm'

export default async function NewRecipePage() {
  // Fetch categories for the dropdown
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .order('name')

  // Create an empty recipe object for the form
  const emptyRecipe = {
    name: '',
    description: '',
    ingredients: [''],
    instructions: [''],
    prep_time: '',
    cook_time: '',
    servings: '',
    category_id: ''
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8">Add New Recipe</h1>
      <RecipeForm recipe={emptyRecipe} categories={categories} />
    </div>
  )
} 