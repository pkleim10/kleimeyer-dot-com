'use client'

import { useState } from 'react'

export default function ShareRecipeButton({ recipeName }) {
  const [showMessage, setShowMessage] = useState(false)

  // Helper function to generate slug from name
  const generateSlug = (name) => {
    return name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  }

  // Helper function to share recipe
  const handleShareRecipe = async () => {
    if (!recipeName) return
    
    const slug = generateSlug(recipeName)
    const shareUrl = `${window.location.origin}/recipe/recipes/${slug}`
    
    try {
      await navigator.clipboard.writeText(shareUrl)
      setShowMessage(true)
      setTimeout(() => setShowMessage(false), 3000)
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
    }
  }

  return (
    <>
      <button
        onClick={handleShareRecipe}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 dark:text-indigo-300 dark:bg-indigo-900 dark:hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
      >
        Share this Recipe
      </button>
      
      {/* Share message popup */}
      {showMessage && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-4 py-2 rounded-md shadow-lg">
          The url of this recipe has been copied to the clipboard
        </div>
      )}
    </>
  )
}
