'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase'

export default function RecipeViewModal({ recipeId, isOpen, onClose }) {
  const [recipe, setRecipe] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showShareMessage, setShowShareMessage] = useState(false)

  // Helper function to generate slug from name
  const generateSlug = (name) => {
    return name.toLowerCase().replace(/\s+/g, '-');
  }

  // Helper function to share recipe
  const handleShareRecipe = async () => {
    if (!recipe) return
    
    const slug = generateSlug(recipe.name)
    const shareUrl = `${window.location.origin}/recipe/recipes/${slug}`
    
    try {
      await navigator.clipboard.writeText(shareUrl)
      setShowShareMessage(true)
      setTimeout(() => setShowShareMessage(false), 3000)
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
    }
  }

  useEffect(() => {
    if (isOpen && recipeId) {
      fetchRecipe()
    }
  }, [isOpen, recipeId])

  const fetchRecipe = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select(`
          *,
          categories (
            id,
            name
          )
        `)
        .eq('id', recipeId)
        .single()

      if (error) throw error
      setRecipe(data)
    } catch (err) {
      setError(err.message || 'Failed to load recipe')
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
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Share message popup */}
      {showShareMessage && (
        <div className="fixed top-4 right-4 z-60 bg-green-500 text-white px-4 py-2 rounded-md shadow-lg">
          The url of this recipe has been copied to the clipboard
        </div>
      )}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" 
        onClick={handleClose}
        data-testid="recipe-view-modal-backdrop"
      />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-4xl bg-white dark:bg-slate-800 rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Recipe Details
            </h3>
            <div className="flex items-center space-x-3">
              {recipe && (
                <button
                  onClick={handleShareRecipe}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 dark:text-indigo-300 dark:bg-indigo-900 dark:hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                >
                  Share this Recipe
                </button>
              )}
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                aria-label="Close"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {loading && (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            )}

            {error && (
              <div className="text-center py-8">
                <p className="text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {recipe && (
              <div>
                {recipe.image && (
                  <div className="relative h-64 w-full overflow-hidden rounded-lg mb-6">
                    <img
                      src={recipe.image}
                      alt={recipe.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between mb-4">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{recipe.name}</h1>
                  {recipe.categories && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                      {recipe.categories.name}
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
                  {recipe.prep_time && <span>Prep: {recipe.prep_time} min</span>}
                  {recipe.cook_time && <span>Cook: {recipe.cook_time} min</span>}
                  {recipe.servings && <span>Serves: {recipe.servings}</span>}
                </div>

                {recipe.source && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Source: {recipe.source}
                  </p>
                )}

                {recipe.description && (
                  <p className="text-gray-600 dark:text-gray-300 mb-6">{recipe.description}</p>
                )}

                {recipe.notes && (
                  <div className="mb-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Notes</h2>
                    <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{recipe.notes}</p>
                  </div>
                )}

                <div className="mb-6">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">Ingredients</h2>
                  <ul className="space-y-2">
                    {recipe.ingredients.map((ingredient, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-gray-600 dark:text-gray-300">{ingredient}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">Instructions</h2>
                  <ol className="space-y-3">
                    {recipe.instructions.map((instruction, index) => (
                      <li key={index} className="flex">
                        <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 font-medium text-sm">
                          {index + 1}
                        </span>
                        <span className="ml-3 text-gray-600 dark:text-gray-300">{instruction}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
