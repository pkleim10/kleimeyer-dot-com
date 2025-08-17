'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase'
import { uploadImage } from '@/utils/supabase'

export default function CategoryEditModal({ category, isOpen, onClose, onSave, mode = 'edit' }) {
  const isCreateMode = mode === 'create'
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [imageFile, setImageFile] = useState(null)

  // Update form data when category changes (for edit mode)
  useEffect(() => {
    if (category && !isCreateMode) {
      setFormData({
        name: category.name || '',
        description: category.description || '',
        image: category.image || ''
      })
    } else if (isCreateMode) {
      // Reset form for create mode
      setFormData({
        name: '',
        description: '',
        image: ''
      })
    }
    setImageFile(null)
    setError(null)
  }, [category, isCreateMode])

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

  const handlePaste = (e) => {
    const items = e.clipboardData?.items
    if (!items) return

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile()
        if (file) {
          setImageFile(file)
          // Show a preview of the pasted image
          const reader = new FileReader()
          reader.onloadend = () => {
            setFormData(prev => ({
              ...prev,
              image: reader.result
            }))
          }
          reader.readAsDataURL(file)
        }
        break
      }
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
      if (isCreateMode) {
        // Create new category
        result = await supabase
          .from('categories')
          .insert([categoryData])
          .select()
      } else {
        // Update existing category
        result = await supabase
          .from('categories')
          .update(categoryData)
          .eq('id', category.id)
          .select()
      }

      if (result.error) {
        console.error('Supabase error details:', result.error)
        throw new Error(`Database error: ${result.error.message}`)
      }

      // Call the onSave callback with the category data
      const savedCategory = isCreateMode ? result.data[0] : { ...category, ...categoryData }
      onSave(savedCategory)
      onClose()
    } catch (err) {
      console.error('Error saving category:', err)
      setError(err.message || 'An error occurred while saving the category')
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
        <div className="relative w-full max-w-2xl bg-white dark:bg-slate-800 rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              {isCreateMode ? 'Add New Category' : 'Edit Category'}
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
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Name *
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
                Category Image
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

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
                <div className="text-sm text-red-700 dark:text-red-400">
                  {error}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex justify-end space-x-3 pt-4">
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
                {loading ? 'Saving...' : (isCreateMode ? 'Create Category' : 'Update Category')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
