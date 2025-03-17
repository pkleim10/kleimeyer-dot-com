import { supabase } from '@/utils/supabase'
import Link from 'next/link'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Helper function to generate slug from name
function generateSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default async function CategoriesPage() {
  const cookieStore = cookies()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get: async (name) => {
          const cookie = await cookieStore.get(name)
          return cookie?.value
        },
        set: async (name, value, options) => {
          cookieStore.set({ name, value, ...options })
        },
        remove: async (name, options) => {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('name')

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Categories</h1>
        {session && (
          <Link 
            href="/admin/categories/new" 
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-900"
          >
            Add New Category
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {categories?.map((category) => (
          <div
            key={category.id}
            className="group relative rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden shadow-sm hover:border-gray-400 dark:hover:border-slate-600 transition-colors duration-200"
          >
            <Link
              href={`/categories/${generateSlug(category.name)}`}
              className="block"
            >
              {category.image && (
                <div className="relative h-32 w-full">
                  <img
                    src={`/assets/${category.image}`}
                    alt={category.name}
                    className="h-full w-full object-cover opacity-40 group-hover:opacity-50 transition-opacity duration-200"
                  />
                </div>
              )}
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-200">
                  {category.name}
                </h2>
                {category.description && (
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    {category.description}
                  </p>
                )}
              </div>
            </Link>
            {session && (
              <div className="absolute bottom-4 right-4 flex space-x-2">
                <Link
                  href={`/admin/categories/${category.id}/edit`}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900 hover:bg-indigo-200 dark:hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-900"
                >
                  Edit
                </Link>
                <Link
                  href={`/admin/categories/${category.id}/delete`}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900 hover:bg-red-200 dark:hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-slate-900"
                >
                  Delete
                </Link>
              </div>
            )}
          </div>
        ))}
      </div>

      {categories?.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 text-lg">No categories found.</p>
        </div>
      )}
    </div>
  )
} 