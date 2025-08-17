import { render, screen } from '@testing-library/react'
import CategoryCard from '../CategoryCard'

// Mock the useAuth hook
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn()
}))

const { useAuth } = require('@/contexts/AuthContext')

const mockCategory = {
  id: '1',
  name: 'Breakfast',
  description: 'Morning meals',
  image: 'https://example.com/breakfast.jpg'
}

const renderWithAuth = (component, user = null) => {
  useAuth.mockReturnValue({ user })
  return render(component)
}

describe('CategoryCard', () => {
  it('should render category information correctly', () => {
    renderWithAuth(<CategoryCard category={mockCategory} />, null)
    
    expect(screen.getByText('Breakfast')).toBeInTheDocument()
    expect(screen.getByText('Morning meals')).toBeInTheDocument()
    expect(screen.getByAltText('Breakfast')).toHaveAttribute('src', 'https://example.com/breakfast.jpg')
  })

  it('should not show admin buttons when user is not authenticated', () => {
    renderWithAuth(<CategoryCard category={mockCategory} />, null)
    
    expect(screen.queryByText('Edit')).not.toBeInTheDocument()
    expect(screen.queryByText('Delete')).not.toBeInTheDocument()
  })

  it('should show admin buttons when user is authenticated', () => {
    const mockUser = { id: '1', email: 'admin@example.com' }
    renderWithAuth(<CategoryCard category={mockCategory} />, mockUser)
    
    const editButton = screen.getByText('Edit')
    const deleteButton = screen.getByText('Delete')
    
    expect(editButton).toBeInTheDocument()
    expect(deleteButton).toBeInTheDocument()
    
    expect(editButton.tagName).toBe('BUTTON')
    expect(deleteButton.tagName).toBe('BUTTON')
  })

  it('should render without image when category has no image', () => {
    const categoryWithoutImage = {
      id: '1',
      name: 'Breakfast',
      description: 'Morning meals'
    }
    
    renderWithAuth(<CategoryCard category={categoryWithoutImage} />, null)
    
    expect(screen.getByText('Breakfast')).toBeInTheDocument()
    expect(screen.queryByAltText('Breakfast')).not.toBeInTheDocument()
  })

  it('should render without description when category has no description', () => {
    const categoryWithoutDescription = {
      id: '1',
      name: 'Breakfast',
      image: 'https://example.com/breakfast.jpg'
    }
    
    renderWithAuth(<CategoryCard category={categoryWithoutDescription} />, null)
    
    expect(screen.getByText('Breakfast')).toBeInTheDocument()
    expect(screen.queryByText('Morning meals')).not.toBeInTheDocument()
  })
})
