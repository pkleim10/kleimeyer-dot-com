# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2025-09-19

### Fixed
- See commit history for detailed changes

## [1.1.0] - 2025-09-19

### Added
- See commit history for detailed changes

## [1.1.1] - 2025-09-19

### Fixed
- See commit history for detailed changes

## [Unreleased]

### Added
- **Photo Album System**: Complete photo album management with cover images
  - Create and manage multiple photo albums
  - Set album cover images automatically or manually
  - Album deletion with automatic photo cleanup
  - Clean separation between album photos and general documents
- **Comprehensive Keyboard Shortcuts**: Professional-grade keyboard navigation
  - Arrow keys for photo navigation (← →)
  - E: Edit photo details
  - C: Set as cover image
  - S: Start/stop slideshow
  - D: Delete photo
  - X: Close lightbox
  - Spacebar: Toggle slideshow
  - Escape: Close lightbox and stop slideshow
- **Smart Photo Deletion Navigation**: Intelligent navigation after photo deletion
  - Navigate to next photo after deletion
  - Wrap to first photo when deleting last photo
  - Return to album view only when no photos remain
- **Enhanced Slideshow Functionality**: Professional slideshow experience
  - Keyboard controls (Spacebar to toggle, Escape to stop)
  - Visual slideshow indicator
  - Automatic progression with customizable timing
- **Photo Editing System**: In-place photo metadata editing
  - Edit descriptions and tags
  - Real-time updates without page refresh
  - Client-side filtering and sorting
- **Storage Optimization**: Automatic cleanup to prevent orphaned files
  - Album deletion removes all associated photos from storage
  - Detailed logging of cleanup process
  - Prevents storage waste on free Supabase plan

### Changed
- **Document/Photo Separation**: Clean separation of concerns
  - Photos in albums no longer appear on `/family/documents` page
  - Standalone documents and album photos are now properly separated
  - Maintained backward compatibility for album-specific requests
- **Navigation Improvements**: Enhanced user experience
  - Delete confirmation dialogs now show in lightbox instead of redirecting
  - Consistent behavior between keyboard shortcuts and toolbar buttons
  - Smart navigation prevents users from being stranded on deleted photos

### Fixed
- **RLS Policy Issues**: Resolved permission errors
  - Fixed "new row violates row-level security policy" error for document uploads
  - Updated RLS policies to work with new multi-role permission system
  - Proper permission checks for all document operations
- **Photo Deletion UX**: Improved deletion workflow
  - Delete button and keyboard shortcut now show confirmation in lightbox
  - No more unexpected redirects to album view during deletion
  - Consistent behavior across all deletion methods

### Security
- **Enhanced Permission System**: Improved security model
  - Updated RLS policies for better security
  - Proper permission checks for all operations
  - Maintained security while improving usability

## [Previous Versions]

### Multi-Role Permission System (Earlier)
- **Refactored Authorization**: Transitioned from hierarchical to multi-role system
  - Users can now have multiple roles simultaneously
  - Granular permission system with specific permissions
  - Admin panel for managing user permissions
  - Legacy role system removed

### Announcement System (Earlier)
- **Star Rating System**: Added 5-star rating system for announcements
  - Visual star display with gold stars for rated announcements
  - Optional rating input with dropdown selection
  - Rating display in announcement cards and modals
- **Line Break Support**: Fixed content display issues
  - Added `whitespace-pre-wrap` for proper line break rendering
  - Consistent formatting across announcement views
- **Appointment Management**: Enhanced appointment functionality
  - Optional content field for appointments
  - Proper date/time handling with timezone support
  - Improved form validation

### Family Business Features (Earlier)
- **Contact Management**: Complete contact system
  - Add, edit, and delete family contacts
  - Mobile-optimized CALL button
  - Contact notes and information management
- **Document Management**: File upload and organization
  - Support for various file types (PDFs, images, documents)
  - Category-based organization
  - Search and filtering capabilities
- **Announcement System**: Family communication
  - Create and manage family announcements
  - Category-based announcements (appointments, payments, etc.)
  - Expiration and priority settings

### Authentication & Authorization (Earlier)
- **User Management**: Complete user system
  - User registration and authentication
  - Role-based access control
  - Admin panel for user management
  - Account deletion capabilities
- **Permission System**: Granular permissions
  - Family, Recipe, Member, and Admin permissions
  - Quick preset buttons for common permission sets
  - Individual permission toggles
  - Permission inheritance and management

### UI/UX Improvements (Earlier)
- **Responsive Design**: Mobile-first approach
  - Responsive navigation and layouts
  - Mobile-optimized interactions
  - Touch-friendly controls
- **Modern Styling**: Contemporary design
  - Tailwind CSS implementation
  - Dark mode support
  - Consistent color scheme and typography
- **Navigation**: Intuitive navigation system
  - Clean navigation bar with role-based visibility
  - Breadcrumb navigation
  - Quick access to main features

---

## Development Notes

### Technical Improvements
- **Database Optimization**: Improved queries and indexing
- **API Design**: RESTful API with proper error handling
- **Security**: Row-level security policies for data protection
- **Performance**: Optimized queries and caching strategies

### Code Quality
- **TypeScript**: Type safety and better development experience
- **Error Handling**: Comprehensive error handling and user feedback
- **Testing**: Unit tests and integration tests
- **Documentation**: Comprehensive code documentation

### Deployment
- **Environment Configuration**: Proper environment variable management
- **Database Migrations**: Version-controlled database changes
- **CI/CD**: Automated testing and deployment pipelines
- **Monitoring**: Error tracking and performance monitoring

---

*This changelog is maintained to provide transparency and help users understand the evolution of the project.*
