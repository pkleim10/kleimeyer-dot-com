import { render, screen, fireEvent } from '@testing-library/react'
import { AuthProvider } from '@/contexts/AuthContext'
import RecipeCard from '../RecipeCard'

// Mock next/navigation
const mockPush = jest.fn()
const mockPathname = '/recipe/search'
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname
}))

// Mock the supabase utilities first (before AuthContext is loaded)
jest.mock('@/utils/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: null }, unsubscribe: jest.fn() }))
    },
    from: jest.fn(() => ({
      select: jest.fn(() => Promise.resolve({ data: [], error: null }))
    }))
  },
  uploadImage: jest.fn(() => Promise.resolve('https://example.com/image.jpg'))
}))

// Mock the useAuth hook
jest.mock('@/contexts/AuthContext', () => ({
  ...jest.requireActual('@/contexts/AuthContext'),
  useAuth: jest.fn()
}))

// Mock usePermissions hook
jest.mock('@/hooks/usePermissions', () => ({
  usePermissions: jest.fn()
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
const { usePermissions } = require('@/hooks/usePermissions')

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
  // Mock permissions: canEditRecipe/canDeleteRecipe are true for family/admin users
  const isFamilyOrAdmin = user && (user.email?.includes('admin') || user.email?.includes('family'))
  usePermissions.mockReturnValue({
    canCreateRecipe: isFamilyOrAdmin || false,
    canEditRecipe: isFamilyOrAdmin || false,
    canDeleteRecipe: isFamilyOrAdmin || false,
    loading: false
  })
  return render(component)
}

describe('RecipeCard', () => {
  it('should render recipe information', () => {
    renderWithAuth(<RecipeCard recipe={mockRecipe} categories={mockCategories} />, null)
    
    expect(screen.getByText('Test Recipe')).toBeInTheDocument()
    expect(screen.getByText('A test recipe')).toBeInTheDocument()
    expect(screen.getByText('Source: Test Source')).toBeInTheDocument()
    expect(screen.getByText('Prep: 15 min')).toBeInTheDocument()
    // Cook and Serves are no longer displayed on the card
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
    
    // Admin buttons are always visible when user is authenticated
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

  it('should navigate to recipe page when card is clicked', () => {
    mockPush.mockClear()
    renderWithAuth(<RecipeCard recipe={mockRecipe} categories={mockCategories} />, null)
    
    const card = screen.getByText('Test Recipe').closest('div[class*="cursor-pointer"]')
    expect(card).toBeInTheDocument()
    
    fireEvent.click(card)
    
    // Should navigate to recipe page with slug and back parameter
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/recipe/recipes/test-recipe'))
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('back='))
  })
})
