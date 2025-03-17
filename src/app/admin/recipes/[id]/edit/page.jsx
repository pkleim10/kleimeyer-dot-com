import { supabase } from '@/utils/supabase'
import RecipeForm from '@/components/RecipeForm'
import { notFound } from 'next/navigation'

export default async function EditRecipePage(props) {
  const params = await props.params
  
  // Fetch the recipe to edit
  const { data: recipe, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!recipe) {
    notFound()
  }

  // Fetch categories for the dropdown
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .order('name')

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Edit Recipe: {recipe.name}</h1>
      <RecipeForm recipe={recipe} categories={categories} isEditing={true} />
    </div>
  )
} 