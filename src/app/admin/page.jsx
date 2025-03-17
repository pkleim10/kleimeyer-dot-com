'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('recipes')
  const [recipes, setRecipes] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch recipes
        const { data: recipesData, error: recipesError } = await supabase
          .from('recipes')
          .select(`
            id,
            name,
            description,
            source,
            image,
            created_at,
            updated_at,
            categories (
              id,
              name
            )
          `)
          .order('created_at', { ascending: false })

        if (recipesError) throw recipesError

        // Fetch categories
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('categories')
          .select('*')
          .order('name')

        if (categoriesError) throw categoriesError

        setRecipes(recipesData)
        setCategories(categoriesData)
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Manage your recipes and categories</p>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 dark:border-slate-700 mb-8">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('recipes')}
              className={`${
                activeTab === 'recipes'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-slate-600'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Recipes
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`${
                activeTab === 'categories'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-slate-600'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Categories
            </button>
          </nav>
        </div>

        {/* Content Area */}
        <div className="space-y-8">
          {/* Recipes Section */}
          {activeTab === 'recipes' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Recipes</h2>
                <Link
                  href="/admin/recipes/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Add New Recipe
                </Link>
              </div>

              <div className="bg-white dark:bg-slate-800 shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200 dark:divide-slate-700">
                  {recipes.map((recipe) => (
                    <li key={recipe.id}>
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            {recipe.image && (
                              <div className="flex-shrink-0 h-16 w-16 mr-4">
                                <img
                                  className="h-16 w-16 rounded-lg object-cover"
                                  src={`/assets/${recipe.image}`}
                                  alt={recipe.name}
                                />
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400 truncate">
                                {recipe.name}
                              </p>
                              <div className="mt-1 flex items-center text-sm text-gray-500 dark:text-gray-400">
                                <span>{recipe.source}</span>
                                {recipe.categories && recipe.categories.length > 0 && (
                                  <>
                                    <span className="mx-2">•</span>
                                    <span>{recipe.categories.map(c => c.name).join(', ')}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <Link
                              href={`/admin/recipes/${recipe.id}/edit`}
                              className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300"
                            >
                              Edit
                            </Link>
                            <Link
                              href={`/admin/recipes/${recipe.id}/delete`}
                              className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                            >
                              Delete
                            </Link>
                          </div>
                        </div>
                        <div className="mt-2">
                          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                            {recipe.description}
                          </p>
                        </div>
                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                          Last updated: {new Date(recipe.updated_at).toLocaleDateString()}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Categories Section */}
          {activeTab === 'categories' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Categories</h2>
                <Link
                  href="/admin/categories/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Add New Category
                </Link>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className="bg-white dark:bg-slate-800 overflow-hidden shadow rounded-lg"
                  >
                    {category.image && (
                      <div className="relative h-48">
                        <img
                          src={`/assets/${category.image}`}
                          alt={category.name}
                          className="w-full h-full object-cover opacity-50"
                        />
                      </div>
                    )}
                    <div className="px-4 py-5 sm:p-6">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        {category.name}
                      </h3>
                      {category.description && (
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          {category.description}
                        </p>
                      )}
                      <div className="mt-4 flex space-x-4">
                        <Link
                          href={`/admin/categories/${category.id}/edit`}
                          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300"
                        >
                          Edit
                        </Link>
                        <Link
                          href={`/admin/categories/${category.id}/delete`}
                          className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                        >
                          Delete
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 