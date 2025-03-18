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
  const [isEditingInstructions, setIsEditingInstructions] = useState(false)
  const [isEditingIngredients, setIsEditingIngredients] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(null)
  const [isDragging, setIsDragging] = useState(false)

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

  const moveInstruction = (index, direction) => {
    if (
      (direction === 'up' && index > 0) ||
      (direction === 'down' && index < formData.instructions.length - 1)
    ) {
      const newInstructions = [...formData.instructions]
      const newIndex = direction === 'up' ? index - 1 : index + 1
      const temp = newInstructions[index]
      newInstructions[index] = newInstructions[newIndex]
      newInstructions[newIndex] = temp
      setFormData(prev => ({
        ...prev,
        instructions: newInstructions
      }))
    }
  }

  const insertInstruction = (index) => {
    const newInstructions = [...formData.instructions]
    newInstructions.splice(index + 1, 0, '')
    setFormData(prev => ({
      ...prev,
      instructions: newInstructions
    }))
    // Set focus to the new textarea after it's rendered
    setTimeout(() => {
      const textareas = document.querySelectorAll('.instruction-textarea')
      textareas[index + 1]?.focus()
      setFocusedIndex(index + 1)
    }, 0)
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setImageFile(file)
      // Create a preview URL
      const previewUrl = URL.createObjectURL(file)
      setFormData(prev => ({
        ...prev,
        image: previewUrl
      }))
    }
  }

  const handlePaste = (e) => {
    const items = e.clipboardData.items
    for (let item of items) {
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile()
        setImageFile(file)
        // Create a preview URL
        const previewUrl = URL.createObjectURL(file)
        setFormData(prev => ({
          ...prev,
          image: previewUrl
        }))
        break
      }
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      setImageFile(file)
      // Create a preview URL
      const previewUrl = URL.createObjectURL(file)
      setFormData(prev => ({
        ...prev,
        image: previewUrl
      }))
    }
  }

  const moveIngredient = (index, direction) => {
    if (
      (direction === 'up' && index > 0) ||
      (direction === 'down' && index < formData.ingredients.length - 1)
    ) {
      const newIngredients = [...formData.ingredients]
      const newIndex = direction === 'up' ? index - 1 : index + 1
      const temp = newIngredients[index]
      newIngredients[index] = newIngredients[newIndex]
      newIngredients[newIndex] = temp
      setFormData(prev => ({
        ...prev,
        ingredients: newIngredients
      }))
    }
  }

  const insertIngredient = (index) => {
    const newIngredients = [...formData.ingredients]
    newIngredients.splice(index + 1, 0, '')
    setFormData(prev => ({
      ...prev,
      ingredients: newIngredients
    }))
    // Set focus to the new input after it's rendered
    setTimeout(() => {
      const inputs = document.querySelectorAll('.ingredient-input')
      inputs[index + 1]?.focus()
      setFocusedIndex(index + 1)
    }, 0)
  }

  const handleKeyDown = (e, index, type) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (focusedIndex === index) {
        // If the current input is focused, blur it
        e.target.blur()
        setFocusedIndex(null)
      } else {
        // If no input is focused, submit the form
        handleSubmit(e)
      }
    }
  }

  const handleFocus = (index) => {
    setFocusedIndex(index)
  }

  const handleBlur = () => {
    setFocusedIndex(null)
  }

  // Clean up object URLs when component unmounts or image changes
  useEffect(() => {
    return () => {
      if (imageFile) {
        URL.revokeObjectURL(URL.createObjectURL(imageFile))
      }
    }
  }, [imageFile])

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
    <form 
      onSubmit={handleSubmit} 
      onPaste={handlePaste}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="space-y-8 divide-y divide-gray-200 dark:divide-slate-700 bg-white dark:bg-slate-800 p-6 rounded-lg shadow"
    >
      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                {error}
              </h3>
            </div>
          </div>
        </div>
      )}

      {isDragging && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg">
            <p className="text-lg text-gray-900 dark:text-gray-100">Drop your image here</p>
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
                  onKeyDown={(e) => handleKeyDown(e, 0, 'name')}
                  onFocus={() => handleFocus(0)}
                  onBlur={handleBlur}
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
                  onKeyDown={(e) => handleKeyDown(e, 1, 'source')}
                  onFocus={() => handleFocus(1)}
                  onBlur={handleBlur}
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
                  onKeyDown={(e) => handleKeyDown(e, 2, 'description')}
                  onFocus={() => handleFocus(2)}
                  onBlur={handleBlur}
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
                  onKeyDown={(e) => handleKeyDown(e, 3, 'servings')}
                  onFocus={() => handleFocus(3)}
                  onBlur={handleBlur}
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
                  onKeyDown={(e) => handleKeyDown(e, 4, 'prep_time')}
                  onFocus={() => handleFocus(4)}
                  onBlur={handleBlur}
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
                  onKeyDown={(e) => handleKeyDown(e, 5, 'cook_time')}
                  onFocus={() => handleFocus(5)}
                  onBlur={handleBlur}
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
                  onKeyDown={(e) => handleKeyDown(e, 6, 'category_id')}
                  onFocus={() => handleFocus(6)}
                  onBlur={handleBlur}
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
                <div className="flex items-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-md"
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  You can also paste an image from your clipboard or drag and drop an image file here.
                </p>
              </div>
            </div>

            <div className="sm:col-span-2">
              <div className="mt-8">
                {(imageFile || formData.image) && (
                  <div className="relative">
                    <img
                      src={imageFile ? URL.createObjectURL(imageFile) : formData.image}
                      alt="Preview"
                      className="h-32 w-32 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null)
                        setFormData(prev => ({
                          ...prev,
                          image: ''
                        }))
                      }}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      title="Remove image"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
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
                onKeyDown={(e) => handleKeyDown(e, 8, 'notes')}
                onFocus={() => handleFocus(8)}
                onBlur={handleBlur}
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-md"
                placeholder="Any additional notes or tips about the recipe..."
              />
            </div>
          </div>
        </div>

        <div className="pt-8">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">Ingredients</h3>
              <button
                type="button"
                onClick={() => setIsEditingIngredients(!isEditingIngredients)}
                onKeyDown={(e) => handleKeyDown(e, 9, 'ingredients')}
                onFocus={() => handleFocus(9)}
                onBlur={handleBlur}
                className={`p-1.5 border rounded-md transition-colors duration-200 ${
                  isEditingIngredients 
                    ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700' 
                    : 'text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 border-gray-200 dark:border-slate-600'
                }`}
                title={isEditingIngredients ? "Done reordering" : "Reorder ingredients"}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">List all ingredients needed for the recipe.</p>
          </div>
          <div className="mt-6 space-y-4">
            {formData.ingredients.map((ingredient, index) => (
              <div key={index} className="flex items-center space-x-2">
                <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 font-medium">
                  {index + 1}
                </span>
                <div className="flex-grow">
                  <input
                    type="text"
                    value={ingredient}
                    onChange={(e) => handleIngredientChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, index, 'ingredient')}
                    onFocus={() => handleFocus(index)}
                    onBlur={handleBlur}
                    placeholder="e.g. 2 cups flour"
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-md ingredient-input"
                    required
                  />
                </div>
                <div className="flex items-center space-x-1">
                  {isEditingIngredients && (
                    <div className="flex items-center space-x-1">
                      <div className="flex flex-col space-y-1">
                        <button
                          type="button"
                          onClick={() => moveIngredient(index, 'up')}
                          disabled={index === 0}
                          className="p-1 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Move up"
                        >
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => moveIngredient(index, 'down')}
                          disabled={index === formData.ingredients.length - 1}
                          className="p-1 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Move down"
                        >
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => insertIngredient(index)}
                      className="p-1 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                      title="Insert ingredient"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeIngredient(index)}
                      disabled={formData.ingredients.length === 1}
                      className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Remove ingredient"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-8">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">Instructions</h3>
              <button
                type="button"
                onClick={() => setIsEditingInstructions(!isEditingInstructions)}
                onKeyDown={(e) => handleKeyDown(e, 10, 'instructions')}
                onFocus={() => handleFocus(10)}
                onBlur={handleBlur}
                className={`p-1.5 border rounded-md transition-colors duration-200 ${
                  isEditingInstructions 
                    ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700' 
                    : 'text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 border-gray-200 dark:border-slate-600'
                }`}
                title={isEditingInstructions ? "Done reordering" : "Reorder instructions"}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Step-by-step instructions for preparing the recipe.</p>
          </div>
          <div className="mt-8">
            <ol className="mt-4 space-y-4">
              {formData.instructions.map((instruction, index) => (
                <li key={index} className="flex items-center space-x-2">
                  <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 font-medium">
                    {index + 1}
                  </span>
                  <div className="flex-grow">
                    <textarea
                      value={instruction}
                      onChange={(e) => handleInstructionChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, index, 'instruction')}
                      onFocus={() => handleFocus(index)}
                      onBlur={handleBlur}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-md instruction-textarea"
                      rows={2}
                      placeholder={`Step ${index + 1}`}
                    />
                  </div>
                  <div className="flex items-center space-x-1">
                    {isEditingInstructions && (
                      <div className="flex items-center space-x-1">
                        <div className="flex flex-col space-y-1">
                          <button
                            type="button"
                            onClick={() => moveInstruction(index, 'up')}
                            disabled={index === 0}
                            className="p-1 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Move up"
                          >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => moveInstruction(index, 'down')}
                            disabled={index === formData.instructions.length - 1}
                            className="p-1 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Move down"
                          >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={() => insertInstruction(index)}
                        className="p-1 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                        title="Insert step"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeInstruction(index)}
                        disabled={formData.instructions.length === 1}
                        className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Remove step"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
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