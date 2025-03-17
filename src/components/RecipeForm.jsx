'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase'
import Link from 'next/link'

export default function RecipeForm({ recipe, categories, isEditing = false }) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: recipe.name || '',
    description: recipe.description || '',
    ingredients: [],
    instructions: recipe.instructions || [''],
    prep_time: recipe.prep_time || '',
    cook_time: recipe.cook_time || '',
    servings: recipe.servings || '',
    category_id: recipe.category_id || ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Process ingredients when component mounts
  useEffect(() => {
    let processedIngredients = ['']
    
    if (recipe.ingredients && recipe.ingredients.length > 0) {
      processedIngredients = recipe.ingredients.map(ingredient => {
        if (typeof ingredient === 'string') {
          return ingredient
        } else if (typeof ingredient === 'object') {
          // Format complex ingredient objects as strings
          return `${ingredient.amount} ${ingredient.unit} ${ingredient.item}`
        }
        return ''
      })
    }
    
    setFormData(prev => ({
      ...prev,
      ingredients: processedIngredients
    }))
  }, [recipe.ingredients])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleIngredientChange = (index, value) => {
    const newIngredients = [...formData.ingredients]
    newIngredients[index] = value
    setFormData(prev => ({
      ...prev,
      ingredients: newIngredients
    }))
  }

  const addIngredient = () => {
    setFormData(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, '']
    }))
  }

  const removeIngredient = (index) => {
    if (formData.ingredients.length > 1) {
      const newIngredients = [...formData.ingredients]
      newIngredients.splice(index, 1)
      setFormData(prev => ({
        ...prev,
        ingredients: newIngredients
      }))
    }
  }

  const handleInstructionChange = (index, value) => {
    const newInstructions = [...formData.instructions]
    newInstructions[index] = value
    setFormData(prev => ({
      ...prev,
      instructions: newInstructions
    }))
  }

  const addInstruction = () => {
    setFormData(prev => ({
      ...prev,
      instructions: [...prev.instructions, '']
    }))
  }

  const removeInstruction = (index) => {
    if (formData.instructions.length > 1) {
      const newInstructions = [...formData.instructions]
      newInstructions.splice(index, 1)
      setFormData(prev => ({
        ...prev,
        instructions: newInstructions
      }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validate form data
      if (!formData.name || !formData.category_id || formData.ingredients.some(i => !i) || formData.instructions.some(i => !i)) {
        throw new Error('Please fill in all required fields')
      }

      // Clean up empty values
      const cleanedIngredients = formData.ingredients.filter(i => i.trim())
      const cleanedInstructions = formData.instructions.filter(i => i.trim())

      // Prepare data for submission
      const recipeData = {
        name: formData.name,
        description: formData.description,
        ingredients: cleanedIngredients,
        instructions: cleanedInstructions,
        prep_time: parseInt(formData.prep_time) || 0,
        cook_time: parseInt(formData.cook_time) || 0,
        servings: parseInt(formData.servings) || 0,
        category_id: formData.category_id,
        updated_at: new Date().toISOString()
      }

      let result

      if (isEditing) {
        // Update existing recipe
        result = await supabase
          .from('recipes')
          .update(recipeData)
          .eq('id', recipe.id)
      } else {
        // Create new recipe
        result = await supabase
          .from('recipes')
          .insert([recipeData])
      }

      if (result.error) {
        throw result.error
      }

      // Redirect to admin page on success
      router.push('/admin')
      router.refresh()
    } catch (err) {
      console.error('Error saving recipe:', err)
      setError(err.message || 'An error occurred while saving the recipe')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 divide-y divide-gray-200 bg-white p-6 rounded-lg shadow">
      {error && (
        <div className="rounded-md bg-red-50 p-4 mb-6">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-8 divide-y divide-gray-200">
        <div className="pt-8">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">Recipe Information</h3>
            <p className="mt-1 text-sm text-gray-500">Basic information about the recipe.</p>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            <div className="sm:col-span-4">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Recipe Name *
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="name"
                  id="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  required
                />
              </div>
            </div>

            <div className="sm:col-span-6">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <div className="mt-1">
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  value={formData.description}
                  onChange={handleChange}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border border-gray-300 rounded-md"
                />
              </div>
              <p className="mt-2 text-sm text-gray-500">Brief description of the recipe.</p>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="category_id" className="block text-sm font-medium text-gray-700">
                Category *
              </label>
              <div className="mt-1">
                <select
                  id="category_id"
                  name="category_id"
                  value={formData.category_id}
                  onChange={handleChange}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  required
                >
                  <option value="">Select a category</option>
                  {categories?.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="prep_time" className="block text-sm font-medium text-gray-700">
                Prep Time (minutes)
              </label>
              <div className="mt-1">
                <input
                  type="number"
                  name="prep_time"
                  id="prep_time"
                  min="0"
                  value={formData.prep_time}
                  onChange={handleChange}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="cook_time" className="block text-sm font-medium text-gray-700">
                Cook Time (minutes)
              </label>
              <div className="mt-1">
                <input
                  type="number"
                  name="cook_time"
                  id="cook_time"
                  min="0"
                  value={formData.cook_time}
                  onChange={handleChange}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="servings" className="block text-sm font-medium text-gray-700">
                Servings
              </label>
              <div className="mt-1">
                <input
                  type="number"
                  name="servings"
                  id="servings"
                  min="1"
                  value={formData.servings}
                  onChange={handleChange}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="pt-8">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">Ingredients</h3>
            <p className="mt-1 text-sm text-gray-500">List all ingredients needed for the recipe.</p>
          </div>
          <div className="mt-6 space-y-4">
            {formData.ingredients.map((ingredient, index) => (
              <div key={index} className="flex items-center">
                <div className="flex-grow">
                  <input
                    type="text"
                    value={ingredient}
                    onChange={(e) => handleIngredientChange(index, e.target.value)}
                    placeholder={`Ingredient ${index + 1}`}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeIngredient(index)}
                  className="ml-2 inline-flex items-center p-1 border border-transparent rounded-full shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  disabled={formData.ingredients.length <= 1}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addIngredient}
              className="mt-2 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Add Ingredient
            </button>
          </div>
        </div>

        <div className="pt-8">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">Instructions</h3>
            <p className="mt-1 text-sm text-gray-500">Step-by-step instructions for preparing the recipe.</p>
          </div>
          <div className="mt-6 space-y-4">
            {formData.instructions.map((instruction, index) => (
              <div key={index} className="flex items-center">
                <div className="w-8 flex-shrink-0 text-right">
                  <span className="text-gray-500 font-medium">{index + 1}.</span>
                </div>
                <div className="flex-grow mx-2">
                  <textarea
                    value={instruction}
                    onChange={(e) => handleInstructionChange(index, e.target.value)}
                    placeholder={`Step ${index + 1}`}
                    rows={2}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    required
                  />
                </div>
                <div className="flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => removeInstruction(index)}
                    className="inline-flex items-center p-1 border border-transparent rounded-full shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    disabled={formData.instructions.length <= 1}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addInstruction}
              className="mt-2 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Add Step
            </button>
          </div>
        </div>
      </div>

      <div className="pt-5">
        <div className="flex justify-end">
          <Link
            href="/admin"
            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {loading ? 'Saving...' : isEditing ? 'Update Recipe' : 'Create Recipe'}
          </button>
        </div>
      </div>
    </form>
  )
} 