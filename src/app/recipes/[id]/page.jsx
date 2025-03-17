import { supabase } from '@/utils/supabase'
import { notFound } from 'next/navigation'

export default async function RecipePage(props) {
  const params = await props.params
  console.log('Recipe ID:', params.id)
  
  const { data: recipe, error } = await supabase
    .from('recipes')
    .select(`
      *,
      categories (
        id,
        name
      )
    `)
    .eq('id', params.id)
    .single()

  console.log('Recipe data:', recipe)
  console.log('Error if any:', error)

  if (!recipe) {
    console.log('No recipe found, calling notFound()')
    notFound()
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <article className="bg-white shadow rounded-lg overflow-hidden">        
        <div className="px-6 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{recipe.name}</h1>
          
          {recipe.categories && (
            <div className="flex gap-2 mb-6">
              <span
                className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800"
              >
                {recipe.categories.name}
              </span>
            </div>
          )}
          
          {recipe.description && (
            <p className="text-gray-600 mb-8">{recipe.description}</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Ingredients</h2>
              <ul className="list-disc list-inside space-y-2">
                {recipe.ingredients?.map((ingredient, index) => (
                  <li key={index} className="text-gray-600">
                    {typeof ingredient === 'string' 
                      ? ingredient 
                      : `${ingredient.amount} ${ingredient.unit} ${ingredient.item}`
                    }
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Instructions</h2>
              <ol className="list-decimal list-inside space-y-4">
                {recipe.instructions?.map((step, index) => (
                  <li key={index} className="text-gray-600">{step}</li>
                ))}
              </ol>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <div>Prep time: {recipe.prep_time || 'N/A'} min</div>
              <div>Cook time: {recipe.cook_time || 'N/A'} min</div>
              <div>Servings: {recipe.servings || 'N/A'}</div>
            </div>
          </div>
        </div>
      </article>
    </div>
  )
} 