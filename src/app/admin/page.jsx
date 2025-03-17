import { supabase } from '@/utils/supabase'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function AdminPage() {
  // In a real app, you would check if the user is authenticated and has admin privileges
  // For now, we'll just fetch all recipes
  const { data: recipes } = await supabase
    .from('recipes')
    .select(`
      id,
      name,
      description,
      created_at,
      updated_at,
      categories (
        id,
        name
      )
    `)
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Recipe Management</h1>
        <Link 
          href="/admin/recipes/new" 
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-900"
        >
          Add New Recipe
        </Link>
      </div>

      <div className="bg-white dark:bg-slate-800 shadow overflow-hidden sm:rounded-md border border-gray-200 dark:border-slate-700">
        <ul className="divide-y divide-gray-200 dark:divide-slate-700">
          {recipes?.map((recipe) => (
            <li key={recipe.id}>
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <p className="text-lg font-medium text-indigo-600 dark:text-indigo-400 truncate">{recipe.name}</p>
                    {recipe.categories && (
                      <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                        {recipe.categories.name}
                      </span>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Link
                      href={`/admin/recipes/${recipe.id}/edit`}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900 hover:bg-indigo-200 dark:hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-900"
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/admin/recipes/${recipe.id}/delete`}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900 hover:bg-red-200 dark:hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-slate-900"
                    >
                      Delete
                    </Link>
                  </div>
                </div>
                <div className="mt-2 sm:flex sm:justify-between">
                  <div className="sm:flex">
                    <p className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      {recipe.description?.substring(0, 100)}
                      {recipe.description?.length > 100 ? '...' : ''}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400 sm:mt-0">
                    <p>
                      Updated {new Date(recipe.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
} 