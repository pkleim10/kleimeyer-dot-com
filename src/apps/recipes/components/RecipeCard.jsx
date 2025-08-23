'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions } from '@/hooks/usePermissions'
import RecipeEditModal from './RecipeEditModal'
import RecipeDeleteModal from './RecipeDeleteModal'
import RecipeViewModal from './RecipeViewModal'

export default function RecipeCard({ recipe, categories, onRecipeUpdate, onRecipeDelete, currentCategoryId }) {
  const { user } = useAuth()
  const { canEditRecipe, canDeleteRecipe } = usePermissions()
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)

  const handleEditClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsEditModalOpen(true)
  }

  const handleDeleteClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDeleteModalOpen(true)
  }

  const handleCardClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsViewModalOpen(true)
  }

  const handleRecipeUpdate = (updatedRecipe) => {
    if (onRecipeUpdate) {
      onRecipeUpdate(updatedRecipe)
    }
    setIsEditModalOpen(false)
  }

  const handleRecipeDelete = (recipeId) => {
    if (onRecipeDelete) {
      onRecipeDelete(recipeId)
    }
    setIsDeleteModalOpen(false)
  }

  return (
    <>
      <div
        onClick={handleCardClick}
        className="group relative rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm hover:border-gray-400 dark:hover:border-slate-600 transition-colors duration-200 cursor-pointer"
      >
        <div className="flex items-start space-x-4">
          {recipe.image && (
            <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg">
              <img
                src={recipe.image}
                alt={recipe.name}
                className="h-full w-full object-cover"
              />
            </div>
          )}
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-200">
              {recipe.name}
            </h2>
            {recipe.description && (
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                {recipe.description}
              </p>
            )}
            {recipe.source && (
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Source: {recipe.source}
              </p>
            )}
            <div className="mt-4 flex items-center text-sm text-gray-500 dark:text-gray-400">
              {(recipe.prep_time && recipe.prep_time > 0 && recipe.prep_time !== '0') ? (
                <span>Prep: {recipe.prep_time} min</span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Action buttons - only visible to users with appropriate permissions */}
        {(canEditRecipe || canDeleteRecipe) && (
          <div className="absolute bottom-4 right-4 flex space-x-4">
            {canEditRecipe && (
              <button
                onClick={handleEditClick}
                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 text-sm font-medium"
              >
                Edit
              </button>
            )}
            {canDeleteRecipe && (
              <button
                onClick={handleDeleteClick}
                className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 text-sm font-medium"
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <RecipeEditModal
        recipe={recipe}
        categories={categories}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleRecipeUpdate}
        mode="edit"
        presetCategoryId={currentCategoryId}
      />

      {/* Delete Modal */}
      <RecipeDeleteModal
        recipe={recipe}
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onDelete={handleRecipeDelete}
      />

      {/* View Modal */}
      <RecipeViewModal
        recipeId={recipe.id}
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
      />
    </>
  )
} 