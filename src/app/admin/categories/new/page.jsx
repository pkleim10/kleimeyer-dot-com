'use client'

import CategoryForm from '@/components/CategoryForm'

export default function NewCategoryPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create New Category</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Add a new category to organize your recipes</p>
        </div>

        <div className="bg-white dark:bg-slate-800 shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <CategoryForm fromAdmin={true} />
          </div>
        </div>
      </div>
    </div>
  )
} 