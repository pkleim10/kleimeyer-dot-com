import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import CategoryEditModal from '../CategoryEditModal'

// Mock the supabase utilities
jest.mock('@/utils/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => Promise.resolve({ data: [{ id: '1', name: 'Updated Category' }], error: null }))
        }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => Promise.resolve({ data: [{ id: 'new-1', name: 'New Category' }], error: null }))
      }))
    }))
  },
  uploadImage: jest.fn(() => Promise.resolve('https://example.com/image.jpg'))
}))

const renderModal = (props = {}) => {
  const defaultProps = {
    category: null,
    isOpen: true,
    onClose: jest.fn(),
    onSave: jest.fn(),
    mode: 'edit',
    ...props
  }
  return render(<CategoryEditModal {...defaultProps} />)
}

describe('CategoryEditModal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render in edit mode with category data', () => {
    const category = { id: '1', name: 'Test Category', description: 'Test Description', image: 'test.jpg' }
    renderModal({ category, mode: 'edit' })
    
    expect(screen.getByText('Edit Category')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Test Category')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Test Description')).toBeInTheDocument()
    expect(screen.getByText('Update Category')).toBeInTheDocument()
  })

  it('should render in create mode with empty form', () => {
    renderModal({ mode: 'create' })
    
    expect(screen.getByText('Add New Category')).toBeInTheDocument()
    expect(screen.getByLabelText('Name *')).toHaveValue('')
    expect(screen.getByText('Create Category')).toBeInTheDocument()
  })

  it('should not render when isOpen is false', () => {
    renderModal({ isOpen: false })
    
    expect(screen.queryByText('Edit Category')).not.toBeInTheDocument()
    expect(screen.queryByText('Add New Category')).not.toBeInTheDocument()
  })

  it('should handle form input changes', () => {
    renderModal({ mode: 'create' })
    
    const nameInput = screen.getByLabelText('Name *')
    const descriptionInput = screen.getByLabelText('Description')
    
    fireEvent.change(nameInput, { target: { value: 'New Category Name' } })
    fireEvent.change(descriptionInput, { target: { value: 'New Description' } })
    
    expect(nameInput.value).toBe('New Category Name')
    expect(descriptionInput.value).toBe('New Description')
  })

  it('should handle successful form submission in create mode', async () => {
    const onSave = jest.fn()
    const onClose = jest.fn()
    renderModal({ mode: 'create', onSave, onClose })
    
    const nameInput = screen.getByLabelText('Name *')
    fireEvent.change(nameInput, { target: { value: 'New Category' } })
    
    const submitButton = screen.getByText('Create Category')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({ id: 'new-1', name: 'New Category' })
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('should handle successful form submission in edit mode', async () => {
    const category = { id: '1', name: 'Original Category', description: 'Original Description', image: '' }
    const onSave = jest.fn()
    const onClose = jest.fn()
    renderModal({ category, mode: 'edit', onSave, onClose })
    
    const nameInput = screen.getByLabelText('Name *')
    fireEvent.change(nameInput, { target: { value: 'Updated Category' } })
    
    const submitButton = screen.getByText('Update Category')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({ 
        id: '1', 
        name: 'Updated Category', 
        description: 'Original Description',
        image: ''
      })
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('should close modal when close button is clicked', () => {
    const onClose = jest.fn()
    renderModal({ onClose })
    
    const closeButton = screen.getByLabelText('Close')
    fireEvent.click(closeButton)
    
    expect(onClose).toHaveBeenCalled()
  })

  it('should close modal when backdrop is clicked', () => {
    const onClose = jest.fn()
    renderModal({ onClose })
    
    const backdrop = screen.getByTestId('modal-backdrop')
    fireEvent.click(backdrop)
    
    expect(onClose).toHaveBeenCalled()
  })

  it('should show clipboard paste helper text', () => {
    renderModal()
    
    expect(screen.getByText(/You can also paste an image from your clipboard/)).toBeInTheDocument()
  })
})

