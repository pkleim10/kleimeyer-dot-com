import { render, screen, fireEvent } from '@testing-library/react'
import { AuthProvider } from '@/contexts/AuthContext'
import RecipeCard from '../RecipeCard'

// Mock the useAuth hook
jest.mock('@/contexts/AuthContext', () => ({
  ...jest.requireActual('@/contexts/AuthContext'),
  useAuth: jest.fn()
}))

// Mock RecipeEditModal
jest.mock('../RecipeEditModal', () => {
  return function MockRecipeEditModal({ isOpen, onClose, onSave, mode }) {
    if (!isOpen) return null
    return (
      <div data-testid="recipe-edit-modal">
        <div>Recipe Edit Modal (Mode: {mode})</div>
        <button onClick={() => onSave({ id: '1', name: 'Updated Recipe' })}>
          Save Recipe
        </button>
        <button onClick={onClose}>Close Modal</button>
      </div>
    )
  }
})

// Mock RecipeDeleteModal
jest.mock('../RecipeDeleteModal', () => {
  return function MockRecipeDeleteModal({ isOpen, onClose, onDelete }) {
    if (!isOpen) return null
    return (
      <div data-testid="recipe-delete-modal">
        <div>Recipe Delete Modal</div>
        <button onClick={() => onDelete('1')}>
          Delete Recipe
        </button>
        <button onClick={onClose}>Close Modal</button>
      </div>
    )
  }
})

const { useAuth } = require('@/contexts/AuthContext')

const mockRecipe = {
  id: '1',
  name: 'Test Recipe',
  description: 'A test recipe',
  source: 'Test Source',
  image: 'test-image.jpg',
  prep_time: 15,
  cook_time: 30,
  servings: 4,
  category_id: '1'
}

const mockCategories = [
  { id: '1', name: 'Breakfast' },
  { id: '2', name: 'Dinner' }
]

const renderWithAuth = (component, user = null) => {
  useAuth.mockReturnValue({ user })
  return render(component)
}

describe('RecipeCard', () => {
  it('should render recipe information', () => {
    renderWithAuth(<RecipeCard recipe={mockRecipe} categories={mockCategories} />, null)
    
    expect(screen.getByText('Test Recipe')).toBeInTheDocument()
    expect(screen.getByText('A test recipe')).toBeInTheDocument()
    expect(screen.getByText('Source: Test Source')).toBeInTheDocument()
    expect(screen.getByText('Prep: 15 min')).toBeInTheDocument()
    expect(screen.getByText('Cook: 30 min')).toBeInTheDocument()
    expect(screen.getByText('Serves: 4')).toBeInTheDocument()
  })

  it('should render recipe image when available', () => {
    renderWithAuth(<RecipeCard recipe={mockRecipe} categories={mockCategories} />, null)
    
    const image = screen.getByAltText('Test Recipe')
    expect(image).toBeInTheDocument()
    expect(image).toHaveAttribute('src', 'test-image.jpg')
  })

  it('should not show admin buttons when user is not authenticated', () => {
    renderWithAuth(<RecipeCard recipe={mockRecipe} categories={mockCategories} />, null)
    
    expect(screen.queryByText('Edit')).not.toBeInTheDocument()
    expect(screen.queryByText('Delete')).not.toBeInTheDocument()
  })

  it('should show admin buttons when user is authenticated', () => {
    const mockUser = { id: '1', email: 'admin@example.com' }
    renderWithAuth(<RecipeCard recipe={mockRecipe} categories={mockCategories} />, mockUser)
    
    // The buttons are hidden by default and only show on hover, but we can still test their presence
    expect(screen.getByText('Edit')).toBeInTheDocument()
    expect(screen.getByText('Delete')).toBeInTheDocument()
  })

  it('should open edit modal when edit button is clicked', () => {
    const mockUser = { id: '1', email: 'admin@example.com' }
    const mockOnRecipeUpdate = jest.fn()
    renderWithAuth(
      <RecipeCard 
        recipe={mockRecipe} 
        categories={mockCategories} 
        onRecipeUpdate={mockOnRecipeUpdate}
      />, 
      mockUser
    )
    
    const editButton = screen.getByText('Edit')
    fireEvent.click(editButton)
    
    expect(screen.getByTestId('recipe-edit-modal')).toBeInTheDocument()
    expect(screen.getByText('Recipe Edit Modal (Mode: edit)')).toBeInTheDocument()
  })

  it('should open delete modal when delete button is clicked', () => {
    const mockUser = { id: '1', email: 'admin@example.com' }
    const mockOnRecipeDelete = jest.fn()
    renderWithAuth(
      <RecipeCard 
        recipe={mockRecipe} 
        categories={mockCategories} 
        onRecipeDelete={mockOnRecipeDelete}
      />, 
      mockUser
    )
    
    const deleteButton = screen.getByText('Delete')
    fireEvent.click(deleteButton)
    
    expect(screen.getByTestId('recipe-delete-modal')).toBeInTheDocument()
    expect(screen.getByText('Recipe Delete Modal')).toBeInTheDocument()
  })

  it('should call onRecipeUpdate when recipe is saved in edit modal', () => {
    const mockUser = { id: '1', email: 'admin@example.com' }
    const mockOnRecipeUpdate = jest.fn()
    renderWithAuth(
      <RecipeCard 
        recipe={mockRecipe} 
        categories={mockCategories} 
        onRecipeUpdate={mockOnRecipeUpdate}
      />, 
      mockUser
    )
    
    const editButton = screen.getByText('Edit')
    fireEvent.click(editButton)
    
    const saveButton = screen.getByText('Save Recipe')
    fireEvent.click(saveButton)
    
    expect(mockOnRecipeUpdate).toHaveBeenCalledWith({ id: '1', name: 'Updated Recipe' })
  })

  it('should call onRecipeDelete when recipe is deleted', () => {
    const mockUser = { id: '1', email: 'admin@example.com' }
    const mockOnRecipeDelete = jest.fn()
    renderWithAuth(
      <RecipeCard 
        recipe={mockRecipe} 
        categories={mockCategories} 
        onRecipeDelete={mockOnRecipeDelete}
      />, 
      mockUser
    )
    
    const deleteButton = screen.getByText('Delete')
    fireEvent.click(deleteButton)
    
    const confirmDeleteButton = screen.getByText('Delete Recipe')
    fireEvent.click(confirmDeleteButton)
    
    expect(mockOnRecipeDelete).toHaveBeenCalledWith('1')
  })

  it('should have correct link to recipe detail page', () => {
    renderWithAuth(<RecipeCard recipe={mockRecipe} categories={mockCategories} />, null)
    
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/recipes/1')
  })
})
