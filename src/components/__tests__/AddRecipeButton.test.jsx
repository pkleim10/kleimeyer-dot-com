import { render, screen, fireEvent } from '@testing-library/react'
import { AuthProvider } from '@/contexts/AuthContext'
import AddRecipeButton from '../AddRecipeButton'

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
        <button onClick={() => onSave({ id: 'new-1', name: 'Test Recipe' })}>
          Save Recipe
        </button>
        <button onClick={onClose}>Close Modal</button>
      </div>
    )
  }
})

const { useAuth } = require('@/contexts/AuthContext')

const mockCategories = [
  { id: '1', name: 'Breakfast' },
  { id: '2', name: 'Dinner' }
]

const renderWithAuth = (component, user = null) => {
  useAuth.mockReturnValue({ user })
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
