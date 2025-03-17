import Link from 'next/link'

export default function RecipeCard({ recipe }) {
  return (
    <Link href={`/recipes/${recipe.id}`} className="group">
      <div className="bg-white dark:bg-slate-800 shadow overflow-hidden sm:rounded-lg border border-gray-200 dark:border-slate-700">
        {recipe.image && (
          <div className="relative h-48 w-full overflow-hidden">
            <img
              src={`/assets/${recipe.image}`}
              alt={recipe.name}
              className="h-full w-full object-cover"
            />
          </div>
        )}
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
            {recipe.name}
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {recipe.description?.substring(0, 100)}
            {recipe.description?.length > 100 ? '...' : ''}
          </p>
          {recipe.source && (
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Source: {recipe.source}
            </p>
          )}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Prep: {recipe.prep_time} min
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Cook: {recipe.cook_time} min
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Serves: {recipe.servings}
              </span>
            </div>
            {recipe.categories && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                {recipe.categories.name}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
} 