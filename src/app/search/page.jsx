'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

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

  // Search recipes when query or category changes
  useEffect(() => {
    async function searchRecipes() {
      setLoading(true)
      let query = supabase
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
      if (category) {
        query = query.eq('category_id', category)
      }

      // Apply search query if present
      if (searchParams.get('q')) {
        query = query.ilike('name', `%${searchParams.get('q')}%`)
      }

      const { data, error } = await query

      if (!error) {
        setRecipes(data)
      }
      setLoading(false)
    }

    searchRecipes()
  }, [searchParams, category])

  // Handle search form submission
  const handleSearch = (e) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (category) params.set('category', category)
    router.push(`/search?${params.toString()}`)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8">Search Recipes</h1>
      
      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search recipes..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm 
                focus:ring-indigo-500 focus:border-indigo-500 
                bg-white dark:bg-slate-800 
                text-gray-900 dark:text-gray-100
                placeholder-gray-500 dark:placeholder-gray-400"
            />
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
          
          <button
            type="submit"
            className="px-6 py-2 bg-indigo-600 dark:bg-indigo-500 text-white font-medium rounded-md 
              hover:bg-indigo-700 dark:hover:bg-indigo-600 
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
              dark:focus:ring-offset-slate-900"
          >
            Search
          </button>
        </div>
      </form>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 dark:border-indigo-400 border-r-transparent"></div>
        </div>
      ) : recipes.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe) => (
            <Link
              key={recipe.id}
              href={`/recipes/${recipe.id}`}
              className="group relative rounded-lg border border-gray-300 dark:border-slate-700 
                bg-white dark:bg-slate-800 p-6 
                shadow-sm hover:border-gray-400 dark:hover:border-slate-600 
                transition-colors duration-200"
            >
              <div className="flex items-start space-x-4">
                {recipe.image && (
                  <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg">
                    <img
                      src={`/assets/${recipe.image}`}
                      alt={recipe.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 
                    group-hover:text-indigo-600 dark:group-hover:text-indigo-400 
                    transition-colors duration-200"
                  >
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
                  <div className="mt-4 flex items-center text-sm text-gray-500 dark:text-gray-400 space-x-4">
                    {recipe.prep_time && (
                      <span>Prep: {recipe.prep_time} min</span>
                    )}
                    {recipe.cook_time && (
                      <span>Cook: {recipe.cook_time} min</span>
                    )}
                    {recipe.servings && (
                      <span>Serves: {recipe.servings}</span>
                    )}
                  </div>
                  {recipe.categories && (
                    <div className="mt-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                        bg-indigo-100 dark:bg-indigo-900 
                        text-indigo-800 dark:text-indigo-200"
                      >
                        {recipe.categories.name}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 text-lg">No recipes found</p>
        </div>
      )}
    </div>
  )
} 