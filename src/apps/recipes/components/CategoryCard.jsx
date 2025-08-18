'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions } from '@/hooks/usePermissions'
import CategoryEditModal from './CategoryEditModal'
import CategoryDeleteModal from './CategoryDeleteModal'

// Helper function to generate slug from name
function generateSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function CategoryCard({ category, onCategoryUpdate, onCategoryDelete }) {
  const { user } = useAuth()
  const { isAdmin } = usePermissions()
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

  return (
    <div className="group relative rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden shadow-sm hover:border-gray-400 dark:hover:border-slate-600 transition-colors duration-200">
      <Link
        href={`/recipe/categories/${generateSlug(category.name)}`}
        className="block"
      >
        {category.image && (
          <div className="relative h-32 w-full">
            <img
              src={category.image}
              alt={category.name}
              className="h-full w-full object-cover"
            />
          </div>
        )}
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            {category.name}
          </h3>
          {category.description && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {category.description}
            </p>
          )}
        </div>
      </Link>
      
              {/* Admin buttons - only visible to admins */}
        {isAdmin && (
        <div className="absolute bottom-4 right-4 flex space-x-4">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-900 transition-colors duration-200"
          >
            Edit
          </button>
          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-slate-900 transition-colors duration-200"
          >
            Delete
          </button>
        </div>
      )}

      {/* Category Edit Modal */}
      <CategoryEditModal
        category={category}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={(updatedCategory) => {
          if (onCategoryUpdate) {
            onCategoryUpdate(updatedCategory)
          }
        }}
      />

      {/* Category Delete Modal */}
      <CategoryDeleteModal
        category={category}
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onDelete={(categoryId) => {
          if (onCategoryDelete) {
            onCategoryDelete(categoryId)
          }
        }}
      />
    </div>
  )
}
