'use client'

import { useState } from 'react'

export default function StarRating({ 
  rating = 0, 
  onRatingChange, 
  interactive = false, 
  size = 'md',
  showUnrated = false 
}) {
  const [hoverRating, setHoverRating] = useState(0)
  
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }
  
  const handleClick = (starRating) => {
    if (interactive && onRatingChange) {
      onRatingChange(starRating)
    }
  }
  
  const handleMouseEnter = (starRating) => {
    if (interactive) {
      setHoverRating(starRating)
    }
  }
  
  const handleMouseLeave = () => {
    if (interactive) {
      setHoverRating(0)
    }
  }
  
  const displayRating = hoverRating || rating
  
  return (
    <div className="flex items-center space-x-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= displayRating
        return (
          <button
            key={star}
            type="button"
            className={`${sizeClasses[size]} ${
              interactive 
                ? 'cursor-pointer hover:scale-110 transition-transform' 
                : 'cursor-default'
            }`}
            onClick={() => handleClick(star)}
            onMouseEnter={() => handleMouseEnter(star)}
            onMouseLeave={handleMouseLeave}
            disabled={!interactive}
          >
            <svg
              className={`${sizeClasses[size]} ${
                isFilled 
                  ? 'text-yellow-500 fill-current' 
                  : 'text-gray-200 dark:text-gray-700'
              }`}
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        )
      })}
      {showUnrated && rating === 0 && (
        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">Unrated</span>
      )}
    </div>
  )
}

// Dropdown version for forms
export function StarRatingDropdown({ rating = 0, onRatingChange, disabled = false }) {
  const options = [
    { value: 0, label: 'Unrated' },
    { value: 1, label: '★ (1 star)' },
    { value: 2, label: '★★ (2 stars)' },
    { value: 3, label: '★★★ (3 stars)' },
    { value: 4, label: '★★★★ (4 stars)' },
    { value: 5, label: '★★★★★ (5 stars)' }
  ]
  
  // Ensure rating is a number
  const numericRating = typeof rating === 'string' ? parseInt(rating) : (rating || 0)
  
  return (
    <select
      value={String(numericRating)}
      onChange={(e) => onRatingChange(parseInt(e.target.value))}
      disabled={disabled}
      className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
    >
      {options.map((option) => (
        <option key={option.value} value={String(option.value)}>
          {option.label}
        </option>
      ))}
    </select>
  )
}
