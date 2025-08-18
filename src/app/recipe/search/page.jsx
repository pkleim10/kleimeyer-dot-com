'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import { RecipeCard } from '@/apps/recipes/components'

export default function SearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [category, setCategory] = useState(searchParams.get('category') || '')
  const [categories, setCategories] = useState([])
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)

  // Fetch categories on mount
  useEffect(() => {
    async function fetchCategories() {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name')
      
      if (!error) {
        setCategories(data)
      }
    }
    
    fetchCategories()
  }, [])

  // Update URL when search parameters change
  useEffect(() => {
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (category) params.set('category', category)
    
    // Use replace instead of push to avoid adding to browser history for every keystroke
    const newUrl = `/recipe/search?${params.toString()}`
    router.replace(newUrl)
  }, [query, category, router])

  // Search recipes when query or category changes
  useEffect(() => {
    async function searchRecipes() {
      setLoading(true)
      try {
        let searchQuery = supabase
          .from('recipes')
          .select(`
            id,
            name,
            description,
            source,
            image,
            prep_time,
            cook_time,
            servings,
            categories (
              id,
              name
            )
          `)
          .order('name')

        // Apply category filter if selected
        if (category && category.trim() !== '') {
          searchQuery = searchQuery.eq('category_id', category)
        }

        // Apply search query if present
        if (query && query.trim() !== '') {
          searchQuery = searchQuery.ilike('name', `%${query.trim()}%`)
        }

        const { data, error } = await searchQuery

        if (error) {
          console.error('Search error:', error)
          setRecipes([])
        } else {
          setRecipes(data || [])
        }
      } catch (err) {
        console.error('Search error:', err)
        setRecipes([])
      } finally {
        setLoading(false)
      }
    }

    searchRecipes()
  }, [query, category])

  const handleRecipeUpdate = (updatedRecipe) => {
    setRecipes(prevRecipes => 
      prevRecipes.map(recipe => 
        recipe.id === updatedRecipe.id ? updatedRecipe : recipe
      )
    )
  }

  const handleRecipeDelete = (recipeId) => {
    setRecipes(prevRecipes => 
      prevRecipes.filter(recipe => recipe.id !== recipeId)
    )
  }

  const handleClearSearch = () => {
    setQuery('')
    setCategory('')
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8">Search Recipes</h1>
      
      <div className="mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search recipes..."
              className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm 
                focus:ring-indigo-500 focus:border-indigo-500 
                bg-white dark:bg-slate-800 
                text-gray-900 dark:text-gray-100
                placeholder-gray-500 dark:placeholder-gray-400"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
                aria-label="Clear search"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          
          <div className="w-full md:w-48">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm 
                focus:ring-indigo-500 focus:border-indigo-500
                bg-white dark:bg-slate-800 
                text-gray-900 dark:text-gray-100"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {(query || category) && (
            <div className="w-full md:w-auto">
              <button
                onClick={handleClearSearch}
                className="w-full md:w-auto px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm 
                  bg-white dark:bg-slate-800 
                  text-gray-700 dark:text-gray-300 
                  hover:bg-gray-50 dark:hover:bg-slate-700 
                  focus:ring-indigo-500 focus:border-indigo-500 
                  transition-colors duration-200"
              >
                Clear Search
              </button>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 dark:border-indigo-400 border-r-transparent"></div>
        </div>
      ) : recipes.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              categories={categories}
              onRecipeUpdate={handleRecipeUpdate}
              onRecipeDelete={handleRecipeDelete}
              currentCategoryId={recipe.categories?.id || null}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 text-lg">No recipes found</p>
        </div>
      )}
      </div>
    </main>
  )
}
