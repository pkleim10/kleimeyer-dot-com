#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

// Path to the nav-images folder
const navImagesDir = path.join(__dirname, '../public/nav-images')
const outputFile = path.join(__dirname, '../src/utils/navImages.js')

// Supported image extensions
const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']

function generateNavImagesArray() {
  try {
    // Check if nav-images directory exists
    if (!fs.existsSync(navImagesDir)) {
      console.error('❌ nav-images directory not found at:', navImagesDir)
      return
    }

    // Read all files in the directory
    const files = fs.readdirSync(navImagesDir)
    
    // Filter for image files
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase()
      return imageExtensions.includes(ext)
    })

    if (imageFiles.length === 0) {
      console.log('⚠️  No image files found in nav-images directory')
      return
    }

    // Sort files alphabetically for consistent ordering
    imageFiles.sort()

    // Generate the array content
    const arrayContent = imageFiles.map(file => `  '/nav-images/${file}'`).join(',\n')
    
    // Generate the complete file content
    const fileContent = `// Navigation images array - auto-generated from public/nav-images/
// Run 'node scripts/generate-nav-images.js' to update this array
export const NAV_IMAGES = [
${arrayContent}
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
`

    // Write the file
    fs.writeFileSync(outputFile, fileContent)
    
    console.log('✅ Successfully generated navImages.js')
    console.log(`📁 Found ${imageFiles.length} image(s):`)
    imageFiles.forEach(file => console.log(`   - ${file}`))
    console.log(`📄 Updated: ${outputFile}`)
    
  } catch (error) {
    console.error('❌ Error generating nav images array:', error.message)
  }
}

// Run the script
generateNavImagesArray()
