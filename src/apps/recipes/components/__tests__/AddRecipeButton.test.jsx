import { render, screen, fireEvent } from '@testing-library/react'
import { AuthProvider } from '@/contexts/AuthContext'
import AddRecipeButton from '../AddRecipeButton'

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
        <button onClick={() => onSave({ id: 'new-1', name: 'Test Recipe' })}>
          Save Recipe
        </button>
        <button onClick={onClose}>Close Modal</button>
      </div>
    )
  }
})

const { useAuth } = require('@/contexts/AuthContext')
const { usePermissions } = require('@/hooks/usePermissions')

const mockCategories = [
  { id: '1', name: 'Breakfast' },
  { id: '2', name: 'Dinner' }
]

const renderWithAuth = (component, user = null) => {
  useAuth.mockReturnValue({ user })
  // Mock permissions: canCreateRecipe is true for family/admin users
  const isFamilyOrAdmin = user && (user.email?.includes('admin') || user.email?.includes('family'))
  usePermissions.mockReturnValue({
    canCreateRecipe: isFamilyOrAdmin || false,
    canEditRecipe: isFamilyOrAdmin || false,
    canDeleteRecipe: isFamilyOrAdmin || false,
    loading: false
  })
  return render(component)
}

describe('AddRecipeButton', () => {
  it('should not render when user is not authenticated', () => {
    renderWithAuth(<AddRecipeButton categories={mockCategories} />, null)
    
    expect(screen.queryByText('Add New Recipe')).not.toBeInTheDocument()
  })

  it('should render when user is authenticated', () => {
    const mockUser = { id: '1', email: 'admin@example.com' }
    renderWithAuth(<AddRecipeButton categories={mockCategories} />, mockUser)
    
    const button = screen.getByText('Add New Recipe')
    expect(button).toBeInTheDocument()
    expect(button.tagName).toBe('BUTTON')
  })

  it('should have correct styling classes', () => {
    const mockUser = { id: '1', email: 'admin@example.com' }
    renderWithAuth(<AddRecipeButton categories={mockCategories} />, mockUser)
    
    const button = screen.getByText('Add New Recipe')
    expect(button).toHaveClass(
      'inline-flex',
      'items-center',
      'px-6',
      'py-3',
      'border',
      'border-transparent',
      'text-base',
      'font-medium',
      'rounded-md',
      'shadow-sm',
      'text-white',
      'bg-indigo-600',
      'hover:bg-indigo-700'
    )
  })

  it('should open modal when button is clicked', () => {
    const mockUser = { id: '1', email: 'admin@example.com' }
    renderWithAuth(<AddRecipeButton categories={mockCategories} />, mockUser)
    
    const button = screen.getByText('Add New Recipe')
    fireEvent.click(button)
    
    expect(screen.getByTestId('recipe-edit-modal')).toBeInTheDocument()
    expect(screen.getByText('Recipe Edit Modal (Mode: create)')).toBeInTheDocument()
  })

  it('should call onRecipeCreate when recipe is saved', () => {
    const mockUser = { id: '1', email: 'admin@example.com' }
    const mockOnRecipeCreate = jest.fn()
    renderWithAuth(<AddRecipeButton categories={mockCategories} onRecipeCreate={mockOnRecipeCreate} />, mockUser)
    
    const button = screen.getByText('Add New Recipe')
    fireEvent.click(button)
    
    const saveButton = screen.getByText('Save Recipe')
    fireEvent.click(saveButton)
    
    expect(mockOnRecipeCreate).toHaveBeenCalledWith({ id: 'new-1', name: 'Test Recipe' })
  })
})
