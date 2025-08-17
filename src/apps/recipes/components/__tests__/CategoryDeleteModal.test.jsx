import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import CategoryDeleteModal from '../CategoryDeleteModal'

// Mock the supabase utilities
jest.mock('@/utils/supabase', () => ({
  supabase: {
    from: jest.fn((table) => {
      if (table === 'recipes') {
        return {
          update: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({ error: null }))
          }))
        }
      } else if (table === 'categories') {
        return {
          delete: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({ error: null }))
          }))
        }
      }
      return {
        update: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ error: null }))
        })),
        delete: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ error: null }))
        }))
      }
    })
  }
}))

const mockCategory = {
  id: '1',
  name: 'Breakfast',
  description: 'Morning meals',
  image: 'https://example.com/breakfast.jpg'
}

const defaultProps = {
  category: mockCategory,
  isOpen: true,
  onClose: jest.fn(),
  onDelete: jest.fn()
}

describe('CategoryDeleteModal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should not render when isOpen is false', () => {
    render(<CategoryDeleteModal {...defaultProps} isOpen={false} />)
    expect(screen.queryByText('Delete Category')).not.toBeInTheDocument()
  })

  it('should render modal when isOpen is true', () => {
    render(<CategoryDeleteModal {...defaultProps} />)
    expect(screen.getByRole('heading', { name: 'Delete Category' })).toBeInTheDocument()
  })

  it('should display category name in confirmation message', () => {
    render(<CategoryDeleteModal {...defaultProps} />)
    
    expect(screen.getByText(/Are you sure you want to delete the category/)).toBeInTheDocument()
    expect(screen.getByText('Breakfast')).toBeInTheDocument()
  })

  it('should call onClose when close button is clicked', () => {
    render(<CategoryDeleteModal {...defaultProps} />)
    
    const closeButton = screen.getByRole('button', { name: /close/i })
    fireEvent.click(closeButton)
    
    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it('should call onClose when backdrop is clicked', () => {
    render(<CategoryDeleteModal {...defaultProps} />)
    
    const backdrop = screen.getByTestId('delete-modal-backdrop')
    fireEvent.click(backdrop)
    
    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it('should call onClose when cancel button is clicked', () => {
    render(<CategoryDeleteModal {...defaultProps} />)
    
    const cancelButton = screen.getByText('Cancel')
    fireEvent.click(cancelButton)
    
    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it('should call onDelete when delete button is clicked', async () => {
    render(<CategoryDeleteModal {...defaultProps} />)
    
    const deleteButton = screen.getByRole('button', { name: 'Delete Category' })
    fireEvent.click(deleteButton)
    
    await waitFor(() => {
      expect(defaultProps.onDelete).toHaveBeenCalledWith('1')
    })
  })

  it('should show loading state when deleting', async () => {
    render(<CategoryDeleteModal {...defaultProps} />)
    
    const deleteButton = screen.getByRole('button', { name: 'Delete Category' })
    fireEvent.click(deleteButton)
    
    await waitFor(() => {
      expect(screen.getByText('Deleting...')).toBeInTheDocument()
    })
  })

  it('should disable buttons when loading', async () => {
    render(<CategoryDeleteModal {...defaultProps} />)
    
    const deleteButton = screen.getByRole('button', { name: 'Delete Category' })
    fireEvent.click(deleteButton)
    
    await waitFor(() => {
      expect(deleteButton).toBeDisabled()
    })
  })
})
