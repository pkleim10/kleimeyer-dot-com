'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase'
import { uploadImage } from '@/utils/supabase'
import Link from 'next/link'

export default function CategoryForm({ category, isEditing = false, fromAdmin = false }) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: category?.name || '',
    description: category?.description || '',
    image: category?.image || ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [imageFile, setImageFile] = useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
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
      if (!formData.name) {
        throw new Error('Please fill in all required fields')
      }

      // Upload image if a new one was selected
      let imageUrl = formData.image
      if (imageFile) {
        imageUrl = await uploadImage(imageFile, 'categories')
      }

      // Prepare data for submission
      const categoryData = {
        name: formData.name,
        description: formData.description,
        image: imageUrl
      }

      let result

      if (isEditing) {
        // Update existing category
        result = await supabase
          .from('categories')
          .update(categoryData)
          .eq('id', category.id)
      } else {
        // Create new category
        result = await supabase
          .from('categories')
          .insert([categoryData])
      }

      if (result.error) {
        console.error('Supabase error details:', result.error)
        throw new Error(`Database error: ${result.error.message}`)
      }

      // Redirect based on where the form was used
      router.push(fromAdmin ? '/admin?tab=categories' : '/categories')
      router.refresh()
    } catch (err) {
      console.error('Error saving category:', err)
      setError(err.message || 'An error occurred while saving the category')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 divide-y divide-gray-200 dark:divide-slate-700">
      <div className="space-y-6 pt-8 sm:pt-10">
        <div>
          <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">Category Information</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Basic information about the category
          </p>
        </div>

        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
          <div className="sm:col-span-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Name *
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
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-md"
              />
            </div>
          </div>

          <div className="sm:col-span-4">
            <label htmlFor="image" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Category Image file
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
      </div>

      <div className="pt-5">
        <div className="flex justify-end space-x-3">
          <Link
            href={fromAdmin ? '/admin?tab=categories' : '/categories'}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-slate-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-900"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : isEditing ? 'Update Category' : 'Create Category'}
          </button>
        </div>
      </div>
    </form>
  )
} 