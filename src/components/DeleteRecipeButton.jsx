'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase'

export default function DeleteRecipeButton({ recipeId }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleDelete = async () => {
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase
        .from('recipes')
        .delete()
        .eq('id', recipeId)

      if (error) {
        throw error
      }

      // Redirect to admin page on success
      router.push('/admin')
      router.refresh()
    } catch (err) {
      console.error('Error deleting recipe:', err)
      setError(err.message || 'An error occurred while deleting the recipe')
      setLoading(false)
    }
  }

  return (
    <>
      {error && (
        <div className="rounded-md bg-red-50 p-4 mb-4">
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
      <button
        type="button"
        onClick={handleDelete}
        disabled={loading}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
      >
        {loading ? 'Deleting...' : 'Delete Recipe'}
      </button>
    </>
  )
} 