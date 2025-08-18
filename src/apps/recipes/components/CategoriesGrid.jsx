'use client'

import { useState } from 'react'
import CategoryCard from './CategoryCard'
import AddCategoryButton from './AddCategoryButton'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions } from '@/hooks/usePermissions'
import RecipesGrid from './RecipesGrid'
import RecipeCard from './RecipeCard'
import { supabase } from '@/utils/supabase'

export default function CategoriesGrid({ categories: initialCategories, uncategorizedRecipes }) {
  const { user } = useAuth()
  const { isAdmin } = usePermissions()
  const [categories, setCategories] = useState(initialCategories)
  const [recipes, setRecipes] = useState(uncategorizedRecipes || [])

  const handleCategoryUpdate = (updatedCategory) => {
    setCategories(prevCategories => 
      prevCategories.map(cat => 
        cat.id === updatedCategory.id ? updatedCategory : cat
      )
    )
  }

  const handleCategoryDelete = (categoryId) => {
    setCategories(prevCategories => 
      prevCategories.filter(cat => cat.id !== categoryId)
    )
    
    // When a category is deleted, we need to fetch the recipes that were in that category
    // and add them to the uncategorized recipes list
    const fetchOrphanedRecipes = async () => {
      try {
        const { data: orphanedRecipes } = await supabase
          .from('recipes')
          .select('*')
          .is('category_id', null)
          .order('name')
        
        if (orphanedRecipes) {
          setRecipes(prevRecipes => {
            // Combine existing uncategorized recipes with newly orphaned ones
            const existingIds = new Set(prevRecipes.map(r => r.id))
            const newOrphaned = orphanedRecipes.filter(r => !existingIds.has(r.id))
            return [...prevRecipes, ...newOrphaned].sort((a, b) => a.name.localeCompare(b.name))
          })
        }
      } catch (error) {
        console.error('Error fetching orphaned recipes:', error)
      }
    }
    
    fetchOrphanedRecipes()
  }

  const handleCategoryCreate = (newCategory) => {
    setCategories(prevCategories => 
      [newCategory, ...prevCategories]
    )
  }

  const handleRecipeUpdate = (updatedRecipe) => {
    setRecipes(prevRecipes => {
      // If the recipe now has a category_id, remove it from uncategorized list
      if (updatedRecipe.category_id) {
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
      {/* Uncategorized Recipes Section - Only visible to admin users */}
      {isAdmin && recipes && recipes.length > 0 && (
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
            Uncategorized Recipes
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            These recipes need to be assigned to a category. Edit them to assign a category.
          </p>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {recipes?.map((recipe) => (
              <RecipeCard 
                key={recipe.id} 
                recipe={recipe} 
                categories={categories}
                onRecipeUpdate={handleRecipeUpdate}
                onRecipeDelete={handleRecipeDelete}
                currentCategoryId={null}
              />
            ))}
          </div>
        </div>
      )}

      {/* Add New Category Button - Only visible to admin users */}
      {isAdmin && (
        <div className="mb-12">
                          <AddCategoryButton onCategoryCreate={handleCategoryCreate} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {categories?.map((category) => (
          <CategoryCard 
            key={category.id} 
            category={category} 
            onCategoryUpdate={handleCategoryUpdate}
            onCategoryDelete={handleCategoryDelete}
          />
        ))}
      </div>
    </div>
  )
}
