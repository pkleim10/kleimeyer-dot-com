'use client'

import { useState } from 'react'
import RecipeCard from './RecipeCard'
import AddRecipeButton from './AddRecipeButton'

export default function RecipesGrid({ recipes: initialRecipes, categories, currentCategoryId }) {
  const [recipes, setRecipes] = useState(initialRecipes)

  const handleRecipeUpdate = (updatedRecipe) => {
    setRecipes(prevRecipes => {
      // If we're on a category page and the recipe's category has changed, remove it
      if (currentCategoryId && updatedRecipe.category_id !== currentCategoryId) {
        return prevRecipes.filter(recipe => recipe.id !== updatedRecipe.id)
      }
      // Otherwise, update the recipe in the list
      return prevRecipes.map(recipe => 
        recipe.id === updatedRecipe.id ? updatedRecipe : recipe
      )
    })
  }

  const handleRecipeDelete = (recipeId) => {
    setRecipes(prevRecipes => 
      prevRecipes.filter(recipe => recipe.id !== recipeId)
    )
  }

  const handleRecipeCreate = (newRecipe) => {
    setRecipes(prevRecipes => 
      [newRecipe, ...prevRecipes]
    )
  }

  return (
    <div>
              <AddRecipeButton categories={categories} onRecipeCreate={handleRecipeCreate} currentCategoryId={currentCategoryId} />
      
      {recipes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 text-lg">No recipes found in this category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {recipes?.map((recipe) => (
            <RecipeCard 
              key={recipe.id} 
              recipe={recipe} 
              categories={categories}
              onRecipeUpdate={handleRecipeUpdate}
              onRecipeDelete={handleRecipeDelete}
              currentCategoryId={currentCategoryId}
            />
          ))}
        </div>
      )}
    </div>
  )
}
