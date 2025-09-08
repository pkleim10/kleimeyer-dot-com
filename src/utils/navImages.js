// Navigation images array - auto-generated from public/nav-images/
// Run 'node scripts/generate-nav-images.js' to update this array
export const NAV_IMAGES = [
  '/nav-images/nav1.jpeg',
  '/nav-images/nav2.jpeg',
  '/nav-images/nav3.png',
  '/nav-images/nav4.jpeg',
  '/nav-images/nav5.jpeg',
  '/nav-images/nav6.png',
  '/nav-images/nav7.png',
  '/nav-images/nav8.png'
]

// Utility function to get a random image from the array
export const getRandomNavImage = () => {
  if (NAV_IMAGES.length === 0) {
    return '/kleimeyer-dot-com.jpeg' // Fallback to original image
  }
  const randomIndex = Math.floor(Math.random() * NAV_IMAGES.length)
  return NAV_IMAGES[randomIndex]
}

// Utility function to get all available images (for debugging or admin purposes)
export const getAllNavImages = () => {
  return NAV_IMAGES
}
