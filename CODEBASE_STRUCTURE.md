# Codebase Structure

This project follows a modular, app-based architecture to support multiple applications within a single site.

## Directory Structure

```
src/
├── apps/                          # App-specific code
│   ├── recipes/                   # Recipe application
│   │   ├── components/           # Recipe-specific components
│   │   │   ├── index.js         # Export all recipe components
│   │   │   ├── RecipeCard.jsx
│   │   │   ├── RecipeEditModal.jsx
│   │   │   ├── RecipeDeleteModal.jsx
│   │   │   ├── RecipeViewModal.jsx
│   │   │   ├── RecipesGrid.jsx
│   │   │   ├── CategoryCard.jsx
│   │   │   ├── CategoryEditModal.jsx
│   │   │   ├── CategoryDeleteModal.jsx
│   │   │   ├── CategoriesGrid.jsx
│   │   │   ├── AddRecipeButton.jsx
│   │   │   ├── AddCategoryButton.jsx
│   │   │   └── __tests__/       # Recipe component tests
│   │   ├── hooks/               # Recipe-specific hooks
│   │   ├── utils/               # Recipe-specific utilities
│   │   └── types/               # Recipe-specific TypeScript types
│   └── shared/                   # Shared across all apps
│       ├── components/          # Shared components
│       │   ├── index.js        # Export all shared components
│       │   ├── Navigation.jsx
│       │   └── LoginModal.jsx
│       └── hooks/              # Shared hooks
│           ├── index.js        # Export all shared hooks
│           └── useSelectEdit.js
├── app/                          # Next.js App Router pages
│   ├── recipe/                  # Recipe app routes
│   │   ├── page.jsx            # Recipe home page
│   │   ├── search/
│   │   │   └── page.jsx        # Search recipes
│   │   ├── categories/
│   │   │   ├── page.jsx        # All categories
│   │   │   └── [slug]/
│   │   │       └── page.jsx    # Category detail
│   │   └── recipes/
│   │       ├── page.jsx        # All recipes
│   │       └── [id]/
│   │           └── page.jsx    # Recipe detail
│   ├── layout.jsx              # Root layout
│   ├── page.jsx                # Launcher page
│   └── globals.css             # Global styles
├── contexts/                     # Global contexts
│   └── AuthContext.jsx         # Authentication context
├── lib/                         # Global libraries
│   └── supabase.js             # Supabase configuration
└── utils/                       # Global utilities
    └── supabase.js             # Supabase utilities
```

## Import Patterns

### Recipe Components
```javascript
// Import recipe components
import { RecipeCard, CategoryCard, RecipesGrid } from '@/apps/recipes/components'

// Import shared components
import { Navigation, LoginModal } from '@/apps/shared/components'

// Import shared hooks
import { useSelectEdit } from '@/apps/shared/hooks'
```

### App Pages
```javascript
// In app pages, import from the apps directory
import { CategoriesGrid } from '@/apps/recipes/components'
import { Navigation } from '@/apps/shared/components'
```

## Adding New Apps

To add a new app:

1. Create a new directory under `src/apps/` (e.g., `src/apps/blog/`)
2. Create the standard structure:
   ```
   src/apps/blog/
   ├── components/
   ├── hooks/
   ├── utils/
   └── types/
   ```
3. Create the corresponding routes under `src/app/`
4. Add the app to the launcher page at `src/app/page.jsx`

## Benefits

- **Clear separation** between different apps
- **Easier maintenance** as the site grows
- **Better code organization** for team development
- **Scalable** for adding new apps
- **Reusable components** in shared directory
- **Clean imports** with index files
