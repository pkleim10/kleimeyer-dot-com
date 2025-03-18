'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import { uploadImage } from '@/utils/supabase'

export default function RecipeForm({ recipe, categories, isEditing = false }) {
  const router = useRouter()
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    name: recipe.name || '',
    description: recipe.description || '',
    source: recipe.source || '',
    notes: recipe.notes || '',
    image: recipe.image || '',
    ingredients: [],
    instructions: recipe.instructions || [''],
    prep_time: recipe.prep_time || '',
    cook_time: recipe.cook_time || '',
    servings: recipe.servings || '',
    category_id: recipe.category_id || ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [imageFile, setImageFile] = useState(null)

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

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setImageFile(file)
      // Show a preview of the selected image
      const reader = new FileReader()
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          image: reader.result
        }))
      }
      reader.readAsDataURL(file)
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

      if (!user) {
        throw new Error('You must be logged in to save a recipe')
      }

      // Clean up empty values
      const cleanedIngredients = formData.ingredients.filter(i => i.trim())
      const cleanedInstructions = formData.instructions.filter(i => i.trim())

      // Upload image if a new one was selected
      let imageUrl = formData.image
      if (imageFile) {
        imageUrl = await uploadImage(imageFile, 'recipes')
      }

      // Prepare data for submission
      const recipeData = {
        name: formData.name,
        description: formData.description,
        source: formData.source,
        notes: formData.notes,
        image: imageUrl,
        ingredients: cleanedIngredients,
        instructions: cleanedInstructions,
        prep_time: parseInt(formData.prep_time) || 0,
        cook_time: parseInt(formData.cook_time) || 0,
        servings: parseInt(formData.servings) || 0,
        category_id: formData.category_id,
        user_id: user.id,
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
        console.error('Supabase error details:', result.error)
        throw new Error(`Database error: ${result.error.message}`)
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
    <form onSubmit={handleSubmit} className="space-y-8 divide-y divide-gray-200 dark:divide-slate-700 bg-white dark:bg-slate-800 p-6 rounded-lg shadow">
      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-4 mb-6">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Error</h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-400">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-8 divide-y divide-gray-200 dark:divide-slate-700">
        <div className="pt-8">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">Recipe Information</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Basic information about the recipe.</p>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            <div className="sm:col-span-4">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Recipe Name *
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="name"
                  id="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-md"
                  required
                />
              </div>
            </div>

            <div className="sm:col-span-4">
              <label htmlFor="source" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Source
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="source"
                  id="source"
                  value={formData.source}
                  onChange={handleChange}
                  placeholder="e.g., Grandma's Cookbook, Food Network, etc."
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-md"
                />
              </div>
            </div>

            <div className="sm:col-span-6">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Description
              </label>
              <div className="mt-1">
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  value={formData.description}
                  onChange={handleChange}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-md"
                />
              </div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Brief description of the recipe.</p>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="servings" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Servings
              </label>
              <div className="mt-1">
                <input
                  type="number"
                  name="servings"
                  id="servings"
                  value={formData.servings}
                  onChange={handleChange}
                  min="1"
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-md"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="prep_time" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
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
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-md"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="cook_time" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
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
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-md"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="category_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Category *
              </label>
              <div className="mt-1">
                <select
                  id="category_id"
                  name="category_id"
                  value={formData.category_id}
                  onChange={handleChange}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-md"
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
              <label htmlFor="image" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Recipe Image
              </label>
              <div className="mt-1">
                <input
                  type="file"
                  name="image"
                  id="image"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-md"
                />
              </div>
              {formData.image && (
                <div className="mt-2">
                  <img
                    src={formData.image}
                    alt="Preview"
                    className="h-32 w-32 object-cover rounded-md"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="mt-6">
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Notes
            </label>
            <div className="mt-1">
              <textarea
                id="notes"
                name="notes"
                rows={4}
                value={formData.notes}
                onChange={handleChange}
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-md"
                placeholder="Any additional notes or tips about the recipe..."
              />
            </div>
          </div>
        </div>

        <div className="pt-8">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">Ingredients</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">List all ingredients needed for the recipe.</p>
          </div>
          <div className="mt-6 space-y-4">
            {formData.ingredients.map((ingredient, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div className="flex-grow">
                  <input
                    type="text"
                    value={ingredient}
                    onChange={(e) => handleIngredientChange(index, e.target.value)}
                    placeholder="e.g. 2 cups flour"
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-md"
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeIngredient(index)}
                  disabled={formData.ingredients.length <= 1}
                  className={`inline-flex items-center p-1 border border-transparent rounded-full shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${
                    formData.ingredients.length <= 1 ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
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
              className="mt-2 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-900"
            >
              Add Ingredient
            </button>
          </div>
        </div>

        <div className="pt-8">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">Instructions</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Step-by-step instructions for preparing the recipe.</p>
          </div>
          <div className="mt-6 space-y-4">
            {formData.instructions.map((instruction, index) => (
              <div key={index} className="flex items-start space-x-2">
                <div className="mt-1 flex-shrink-0">
                  <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-indigo-500 dark:bg-indigo-600 text-white text-sm font-medium">
                    {index + 1}
                  </span>
                </div>
                <div className="flex-grow">
                  <textarea
                    value={instruction}
                    onChange={(e) => handleInstructionChange(index, e.target.value)}
                    rows={2}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-md"
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeInstruction(index)}
                  disabled={formData.instructions.length <= 1}
                  className={`inline-flex items-center p-1 border border-transparent rounded-full shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${
                    formData.instructions.length <= 1 ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addInstruction}
              className="mt-2 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-900"
            >
              Add Step
            </button>
          </div>
        </div>
      </div>

      <div className="pt-5">
        <div className="flex justify-end space-x-3">
          <Link
            href="/admin"
            className="inline-flex justify-center py-2 px-4 border border-gray-300 dark:border-slate-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-900"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className={`inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-900 ${
              loading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              'Save Recipe'
            )}
          </button>
        </div>
      </div>
    </form>
  )
} 