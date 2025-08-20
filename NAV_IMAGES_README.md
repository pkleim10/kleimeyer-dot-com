# Random Navigation Images System

This system allows you to have multiple navigation bar images that are randomly selected on each page load.

## 📁 File Structure

```
public/
├── nav-images/           # Add your navigation images here
│   ├── kleimeyer-dot-com.jpeg
│   ├── family-photo-1.jpeg
│   ├── family-photo-2.jpeg
│   └── ...
src/
├── utils/
│   └── navImages.js      # Auto-generated array of images
└── apps/shared/components/
    └── Navigation.jsx    # Uses random image selection
scripts/
└── generate-nav-images.js # Script to update the image array
```

## 🚀 How to Use

### 1. Add Images
Place your navigation images in the `public/nav-images/` folder.

**Supported formats:**
- `.jpg` / `.jpeg`
- `.png`
- `.gif`
- `.webp`

**Recommended specifications:**
- **Size**: 200-400px wide, 50-100px tall
- **Format**: JPEG or PNG
- **File size**: Under 100KB for fast loading
- **Aspect ratio**: Similar to original (roughly 4:1 or 3:1)

### 2. Generate Image Array
After adding images to the folder, run:

```bash
npm run generate-nav-images
```

This will automatically update `src/utils/navImages.js` with all images in the folder.

### 3. Test
Refresh your browser to see the random image selection in action.

## 🔧 How It Works

### Random Selection
- **Client-side**: Images are randomly selected when the Navigation component loads
- **Session consistency**: Same image stays throughout the user's session
- **Fallback**: If no images are found, falls back to the original image

### Code Flow
1. `Navigation.jsx` imports `getRandomNavImage()` from `navImages.js`
2. `useEffect` calls `getRandomNavImage()` on component mount
3. Random image is stored in component state
4. Image source is updated with the random selection

## 📝 Example Usage

### Adding New Images
```bash
# 1. Copy your images to the nav-images folder
cp ~/Pictures/family-photo-1.jpeg public/nav-images/

# 2. Generate the updated array
npm run generate-nav-images

# 3. The navigation will automatically use the new images
```

### Manual Array Update
If you prefer to manually edit the array, you can modify `src/utils/navImages.js`:

```javascript
export const NAV_IMAGES = [
  '/nav-images/kleimeyer-dot-com.jpeg',
  '/nav-images/family-photo-1.jpeg',
  '/nav-images/family-photo-2.jpeg',
  // Add more images here
]
```

## 🎨 Customization

### Image Ordering
Images are automatically sorted alphabetically by filename. To control the order, use numbered prefixes:

```
family-photo-01.jpeg
family-photo-02.jpeg
family-photo-03.jpeg
```

### Fallback Image
The fallback image is set to `/kleimeyer-dot-com.jpeg`. You can change this in `src/utils/navImages.js`:

```javascript
export const getRandomNavImage = () => {
  if (NAV_IMAGES.length === 0) {
    return '/your-fallback-image.jpeg' // Change this
  }
  // ... rest of function
}
```

## 🔍 Troubleshooting

### Images Not Showing
1. Check that images are in `public/nav-images/` folder
2. Verify file extensions are supported (`.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`)
3. Run `npm run generate-nav-images` to update the array
4. Check browser console for 404 errors

### Script Errors
If the generation script fails:
1. Ensure `public/nav-images/` folder exists
2. Check file permissions
3. Verify Node.js is installed

### Performance Issues
- Keep image files under 100KB each
- Use WebP format for better compression
- Consider lazy loading for many images

## 📋 Best Practices

1. **Consistent sizing**: Use similar dimensions for all images
2. **Good contrast**: Ensure text/logo remains readable over images
3. **Family-appropriate**: Choose images that represent your family well
4. **Regular updates**: Refresh images periodically to keep the site fresh
5. **Backup original**: Keep a copy of your original navigation image

## 🎯 Future Enhancements

Potential improvements to consider:
- **User preferences**: Allow users to set a favorite image
- **Daily rotation**: Same image for entire day instead of per session
- **Category-based**: Different images for different sections
- **Seasonal themes**: Automatic image changes based on season/holidays
- **Admin panel**: Web interface to manage navigation images
