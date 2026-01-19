import { render, screen, fireEvent } from '@testing-library/react'
import { AuthProvider } from '@/contexts/AuthContext'
import AddCategoryButton from '../AddCategoryButton'

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

// Mock CategoryEditModal
jest.mock('../CategoryEditModal', () => {
  return function MockCategoryEditModal({ isOpen, onClose, onSave, mode }) {
    if (!isOpen) return null
    return (
      <div data-testid="category-edit-modal">
        <div>Category Edit Modal (Mode: {mode})</div>
        <button onClick={() => onSave({ id: 'new-1', name: 'Test Category' })}>
          Save Category
        </button>
        <button onClick={onClose}>Close Modal</button>
      </div>
    )
  }
})

const { useAuth } = require('@/contexts/AuthContext')
const { usePermissions } = require('@/hooks/usePermissions')

const renderWithAuth = (component, user = null) => {
  useAuth.mockReturnValue({ user })
  // Mock permissions: canManageCategories is true for family/admin users
  const isFamilyOrAdmin = user && (user.email?.includes('admin') || user.email?.includes('family'))
  usePermissions.mockReturnValue({
    canManageCategories: isFamilyOrAdmin || false,
    loading: false
  })
  return render(component)
}

describe('AddCategoryButton', () => {
  it('should not render when user is not authenticated', () => {
          renderWithAuth(<AddCategoryButton />, null)
    
    expect(screen.queryByText('Add New Category')).not.toBeInTheDocument()
  })

  it('should render when user is authenticated', () => {
    const mockUser = { id: '1', email: 'admin@example.com' }
    renderWithAuth(<AddCategoryButton />, mockUser)
    
    const button = screen.getByText('Add New Category')
    expect(button).toBeInTheDocument()
    expect(button.tagName).toBe('BUTTON')
  })

  it('should have correct styling classes', () => {
    const mockUser = { id: '1', email: 'admin@example.com' }
    renderWithAuth(<AddCategoryButton />, mockUser)
    
    const button = screen.getByText('Add New Category')
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
    renderWithAuth(<AddCategoryButton />, mockUser)
    
    const button = screen.getByText('Add New Category')
    fireEvent.click(button)
    
    expect(screen.getByTestId('category-edit-modal')).toBeInTheDocument()
    expect(screen.getByText('Category Edit Modal (Mode: create)')).toBeInTheDocument()
  })

  it('should call onCategoryCreate when category is saved', () => {
    const mockUser = { id: '1', email: 'admin@example.com' }
    const mockOnCategoryCreate = jest.fn()
    renderWithAuth(<AddCategoryButton onCategoryCreate={mockOnCategoryCreate} />, mockUser)
    
    const button = screen.getByText('Add New Category')
    fireEvent.click(button)
    
    const saveButton = screen.getByText('Save Category')
    fireEvent.click(saveButton)
    
    expect(mockOnCategoryCreate).toHaveBeenCalledWith({ id: 'new-1', name: 'Test Category' })
  })
})
