'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/utils/supabase'
import { uploadImage } from '@/utils/supabase'
import { useAuth } from '@/contexts/AuthContext'

export default function RecipeEditModal({ recipe, categories, isOpen, onClose, onSave, mode = 'edit', presetCategoryId }) {
  const { user } = useAuth()
  const isCreateMode = mode === 'create'
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    source: '',
    notes: '',
    image: '',
    ingredients: [''],
    instructions: [''],
    prep_time: '',
    cook_time: '',
    servings: '',
    category_id: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [isEditingInstructions, setIsEditingInstructions] = useState(false)
  const [isEditingIngredients, setIsEditingIngredients] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  
  // Refs for focusing on newly added items
  const ingredientRefs = useRef({})
  const instructionRefs = useRef({})
  
  // Track previous lengths to detect new items
  const prevIngredientCount = useRef(0)
  const prevInstructionCount = useRef(0)
  
  // Drag and drop state
  const [draggedItem, setDraggedItem] = useState(null)
  const [dragType, setDragType] = useState(null) // 'ingredient' or 'instruction'

  // Update form data when recipe changes (for edit mode) or when modal opens/closes
  useEffect(() => {
    if (isCreateMode) {
      // Always reset form for create mode, regardless of recipe prop
      setFormData({
        name: '',
        description: '',
        source: '',
        notes: '',
        image: '',
        ingredients: [''],
        instructions: [''],
        prep_time: '',
        cook_time: '',
        servings: '',
        category_id: presetCategoryId || ''
      })
    } else if (recipe) {
      // Process ingredients for edit mode
      let processedIngredients = ['']
      if (recipe.ingredients && recipe.ingredients.length > 0) {
        processedIngredients = recipe.ingredients.map(ingredient => {
          if (typeof ingredient === 'string') {
            return ingredient
          } else if (typeof ingredient === 'object') {
            return `${ingredient.amount} ${ingredient.unit} ${ingredient.item}`
          }
          return ''
        })
      }

      setFormData({
        name: recipe.name || '',
        description: recipe.description || '',
        source: recipe.source || '',
        notes: recipe.notes || '',
        image: recipe.image || '',
        ingredients: processedIngredients,
        instructions: recipe.instructions || [''],
        prep_time: recipe.prep_time || '',
        cook_time: recipe.cook_time || '',
        servings: recipe.servings || '',
        category_id: presetCategoryId || (recipe.category_id === null ? '' : recipe.category_id) || ''
      })
    }
    setImageFile(null)
    setError(null)
  }, [isCreateMode, presetCategoryId, recipe])

  // Focus on new ingredients when added
  useEffect(() => {
    if (formData.ingredients.length > prevIngredientCount.current) {
      const newIndex = formData.ingredients.length - 1
      setTimeout(() => {
        if (ingredientRefs.current[newIndex]) {
          ingredientRefs.current[newIndex].focus()
        }
      }, 10)
    }
    prevIngredientCount.current = formData.ingredients.length
  }, [formData.ingredients.length])

  // Focus on new instructions when added
  useEffect(() => {
    if (formData.instructions.length > prevInstructionCount.current) {
      const newIndex = formData.instructions.length - 1
      setTimeout(() => {
        if (instructionRefs.current[newIndex]) {
          instructionRefs.current[newIndex].focus()
        }
      }, 10)
    }
    prevInstructionCount.current = formData.instructions.length
  }, [formData.instructions.length])

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

  const insertIngredient = (index) => {
    const newIngredients = [...formData.ingredients]
    newIngredients.splice(index + 1, 0, '')
    setFormData(prev => ({
      ...prev,
      ingredients: newIngredients
    }))
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

  const insertInstruction = (index) => {
    const newInstructions = [...formData.instructions]
    newInstructions.splice(index + 1, 0, '')
    setFormData(prev => ({
      ...prev,
      instructions: newInstructions
    }))
  }

  // Drag and drop functions
  const handleDragStart = (e, index, type) => {
    setDraggedItem(index)
    setDragType(type)
    e.dataTransfer.effectAllowed = 'move'
    e.target.style.opacity = '0.5'
  }

  const handleDragEnd = (e) => {
    setDraggedItem(null)
    setDragType(null)
    e.target.style.opacity = '1'
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e, dropIndex, type) => {
    e.preventDefault()
    
    if (draggedItem === null || dragType !== type) return
    
    const sourceIndex = draggedItem
    const targetIndex = dropIndex
    
    if (sourceIndex === targetIndex) return
    
    if (type === 'ingredient') {
      const newIngredients = [...formData.ingredients]
      const [movedItem] = newIngredients.splice(sourceIndex, 1)
      newIngredients.splice(targetIndex, 0, movedItem)
      setFormData(prev => ({
        ...prev,
        ingredients: newIngredients
      }))
    } else if (type === 'instruction') {
      const newInstructions = [...formData.instructions]
      const [movedItem] = newInstructions.splice(sourceIndex, 1)
      newInstructions.splice(targetIndex, 0, movedItem)
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
      const previewUrl = URL.createObjectURL(file)
      setFormData(prev => ({
        ...prev,
        image: previewUrl
      }))
    }
  }

  const handlePaste = (e) => {
    const items = e.clipboardData?.items
    if (!items) return

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile()
        if (file) {
          setImageFile(file)
          const previewUrl = URL.createObjectURL(file)
          setFormData(prev => ({
            ...prev,
            image: previewUrl
          }))
        }
        break
      }
    }
  }

  const startSpeechRecognition = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser. Please use Chrome for this feature.')
      return
    }

    const recognition = new webkitSpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onstart = () => {
      setIsRecording(true)
    }

    recognition.onend = () => {
      setIsRecording(false)
    }

    recognition.onresult = (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript
      
      const processedText = transcript
        .replace(/ period/gi, '.')
        .replace(/ comma/gi, ',')
        .replace(/ exclamation( point)?/gi, '!')
        .replace(/ question( mark)?/gi, '?')
        .replace(/ new line/gi, '\n')
        .replace(/ new paragraph/gi, '\n\n')
        .replace(/ semicolon/gi, ';')
        .replace(/ colon/gi, ':')
        .replace(/ dash/gi, '-')
        .replace(/ hyphen/gi, '-')
        .trim()
        .replace(/^([a-z])/, (match) => match.toUpperCase())
        .replace(/\.\s+([a-z])/g, (match, letter) => `. ${letter.toUpperCase()}`)

      setFormData(prev => ({
        ...prev,
        notes: prev.notes ? `${prev.notes} ${processedText}` : processedText
      }))
    }

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error)
      setIsRecording(false)
    }

    recognition.start()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validate form data and collect missing fields
      const missingFields = []
      
      if (!formData.name || formData.name.trim() === '') {
        missingFields.push('Recipe Name')
      }
      
      if (!formData.category_id || formData.category_id === '') {
        missingFields.push('Category')
      }
      
      if (!formData.ingredients || formData.ingredients.length === 0 || formData.ingredients.every(i => !i || i.trim() === '')) {
        missingFields.push('At least one Ingredient')
      }
      
      if (!formData.instructions || formData.instructions.length === 0 || formData.instructions.every(i => !i || i.trim() === '')) {
        missingFields.push('At least one Instruction')
      }
      
      if (missingFields.length > 0) {
        throw new Error(`Please fill in the following required fields: ${missingFields.join(', ')}`)
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
      if (isCreateMode) {
        // Create new recipe
        result = await supabase
          .from('recipes')
          .insert([recipeData])
          .select()
      } else {
        // Update existing recipe
        result = await supabase
          .from('recipes')
          .update(recipeData)
          .eq('id', recipe.id)
          .select()
      }

      if (result.error) {
        console.error('Supabase error details:', result.error)
        throw new Error(`Database error: ${result.error.message}`)
      }

      // Call the onSave callback with the recipe data
      const savedRecipe = isCreateMode ? result.data[0] : { ...recipe, ...recipeData }
      onSave(savedRecipe)
      onClose()
    } catch (err) {
      console.error('Error saving recipe:', err)
      setError(err.message || 'An error occurred while saving the recipe')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto"
      onPaste={handlePaste}
      tabIndex={-1}
    >
      {/* Semi-transparent backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
        data-testid="modal-backdrop"
      />
      
      {/* Modal content */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-4xl bg-white dark:bg-slate-800 rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              {isCreateMode ? 'Add New Recipe' : 'Edit Recipe'}
            </h3>
            <button
              onClick={handleClose}
              disabled={loading}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
                <div className="text-sm text-red-700 dark:text-red-400">
                  {error}
                </div>
              </div>
            )}

            {/* Basic Information */}
            <div className="space-y-4">
              <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">Basic Information</h4>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Recipe Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    id="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="mt-1 block w-full border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="category_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Category *
                  </label>
                  {isCreateMode && presetCategoryId ? (
                    <input
                      type="text"
                      id="category_id"
                      name="category_id"
                      value={categories?.find(cat => cat.id === presetCategoryId)?.name || ''}
                      className="mt-1 block w-full border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-md shadow-sm bg-gray-100 dark:bg-slate-600 sm:text-sm"
                      readOnly
                    />
                  ) : (
                    <select
                      id="category_id"
                      name="category_id"
                      value={formData.category_id}
                      onChange={handleChange}
                      className="mt-1 block w-full border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      required
                    >
                      <option value="">Select a category</option>
                      {categories?.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label htmlFor="source" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Source
                  </label>
                  <input
                    type="text"
                    name="source"
                    id="source"
                    value={formData.source}
                    onChange={handleChange}
                    placeholder="e.g., Grandma's Cookbook"
                    className="mt-1 block w-full border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="servings" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Servings
                  </label>
                  <input
                    type="number"
                    name="servings"
                    id="servings"
                    value={formData.servings}
                    onChange={handleChange}
                    min="1"
                    className="mt-1 block w-full border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="prep_time" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Prep Time (minutes)
                  </label>
                  <input
                    type="number"
                    name="prep_time"
                    id="prep_time"
                    min="0"
                    value={formData.prep_time}
                    onChange={handleChange}
                    className="mt-1 block w-full border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="cook_time" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Cook Time (minutes)
                  </label>
                  <input
                    type="number"
                    name="cook_time"
                    id="cook_time"
                    min="0"
                    value={formData.cook_time}
                    onChange={handleChange}
                    className="mt-1 block w-full border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  value={formData.description}
                  onChange={handleChange}
                  className="mt-1 block w-full border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="image" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Recipe Image
                </label>
                <input
                  type="file"
                  name="image"
                  id="image"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="mt-1 block w-full border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  You can also paste an image from your clipboard (Ctrl+V / Cmd+V)
                </p>
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

              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Notes
                </label>
                <div className="mt-1 relative">
                  <textarea
                    id="notes"
                    name="notes"
                    rows={3}
                    value={formData.notes}
                    onChange={handleChange}
                    className="block w-full border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Any additional notes or tips..."
                  />
                  <button
                    type="button"
                    onClick={startSpeechRecognition}
                    className={`absolute right-2 top-2 p-1.5 rounded-full ${
                      isRecording 
                        ? 'text-red-500 bg-red-100 dark:bg-red-900/30 animate-pulse' 
                        : 'text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-300'
                    }`}
                    title={isRecording ? 'Recording... Click to stop' : 'Click to start voice input'}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Ingredients */}
            <div className="space-y-4">
              <div>
                <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">Ingredients *</h4>
              </div>
              
              <div className="space-y-2">
                {formData.ingredients.map((ingredient, index) => (
                  <div 
                    key={index} 
                    className="flex items-center space-x-2 p-2 rounded-lg border-2 border-transparent hover:border-gray-200 dark:hover:border-slate-600 transition-colors cursor-move"
                    draggable
                    onDragStart={(e) => handleDragStart(e, index, 'ingredient')}
                    onDragEnd={handleDragEnd}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index, 'ingredient')}
                  >
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 font-medium text-xs flex items-center justify-center">
                      {index + 1}
                    </span>
                    <input
                      type="text"
                      value={ingredient}
                      onChange={(e) => handleIngredientChange(index, e.target.value)}
                      placeholder="e.g. 2 cups flour"
                      className="flex-1 border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      required
                      ref={(el) => ingredientRefs.current[index] = el}
                    />
                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={() => insertIngredient(index)}
                        className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                        title="Insert ingredient"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeIngredient(index)}
                        className="text-red-500 hover:text-red-700"
                        title="Remove ingredient"
                        disabled={formData.ingredients.length === 1}
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Instructions */}
            <div className="space-y-4">
              <div>
                <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">Instructions *</h4>
              </div>
              
              <div className="space-y-2">
                {formData.instructions.map((instruction, index) => (
                  <div 
                    key={index} 
                    className="flex items-start space-x-2 p-2 rounded-lg border-2 border-transparent hover:border-gray-200 dark:hover:border-slate-600 transition-colors cursor-move"
                    draggable
                    onDragStart={(e) => handleDragStart(e, index, 'instruction')}
                    onDragEnd={handleDragEnd}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index, 'instruction')}
                  >
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 font-medium text-xs flex items-center justify-center mt-1">
                      {index + 1}
                    </span>
                    <textarea
                      value={instruction}
                      onChange={(e) => handleInstructionChange(index, e.target.value)}
                      placeholder={`Step ${index + 1}`}
                      rows={2}
                      className="flex-1 border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      required
                      ref={(el) => instructionRefs.current[index] = el}
                    />
                    <div className="flex items-center space-x-1 mt-1">
                      <button
                        type="button"
                        onClick={() => insertInstruction(index)}
                        className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                        title="Insert step"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeInstruction(index)}
                        className="text-red-500 hover:text-red-700"
                        title="Remove step"
                        disabled={formData.instructions.length === 1}
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-slate-700">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-slate-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-900 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : (isCreateMode ? 'Create Recipe' : 'Update Recipe')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
