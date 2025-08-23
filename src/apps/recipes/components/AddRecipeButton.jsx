'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions } from '@/hooks/usePermissions'
import RecipeEditModal from './RecipeEditModal'

export default function AddRecipeButton({ categories, onRecipeCreate, currentCategoryId }) {
  const { user } = useAuth()
  const { canCreateRecipe } = usePermissions()
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Only show the button if user can create recipes
  if (!canCreateRecipe) {
    return null
  }

  const handleOpenModal = () => {
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
  }

  const handleSaveRecipe = (newRecipe) => {
    if (onRecipeCreate) {
      onRecipeCreate(newRecipe)
    }
  }

  return (
    <>
      <div className="flex justify-center mb-8">
        <button
          onClick={handleOpenModal}
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          Add New Recipe
        </button>
      </div>

      <RecipeEditModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveRecipe}
        categories={categories}
        mode="create"
        presetCategoryId={currentCategoryId}
      />
    </>
  )
}
