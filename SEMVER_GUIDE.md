# Semantic Versioning (SEMVER) Guide

This project follows [Semantic Versioning](https://semver.org/) (SEMVER) for version management.

## Version Format

Versions follow the format: `MAJOR.MINOR.PATCH` (e.g., `1.2.3`)

- **MAJOR**: Breaking changes that are incompatible with previous versions
- **MINOR**: New features that are backward compatible
- **PATCH**: Bug fixes that are backward compatible

## Version Bump Types

### 🔴 MAJOR (Breaking Changes)
Use when you make incompatible API changes or remove features.

**Examples:**
- Remove a feature or API endpoint
- Change the behavior of existing functionality
- Require users to update their code
- Database schema changes that break existing data

**Commit message indicators:**
- `BREAKING CHANGE:`
- `feat!:`
- `remove:`
- `deprecate:`

### 🟡 MINOR (New Features)
Use when you add new functionality in a backward compatible manner.

**Examples:**
- Add new features
- Add new API endpoints
- Add new configuration options
- Enhance existing functionality

**Commit message indicators:**
- `feat:`
- `feature:`
- `new:`
- `add:`
- `enhancement:`

### 🟢 PATCH (Bug Fixes)
Use when you make backward compatible bug fixes.

**Examples:**
- Fix bugs
- Update documentation
- Refactor code
- Update dependencies
- Style changes

**Commit message indicators:**
- `fix:`
- `bug:`
- `patch:`
- `update:`
- `refactor:`
- `style:`
- `docs:`
- `test:`
- `chore:`

## Usage

### Manual Version Bumping

```bash
# Bump patch version (1.0.0 → 1.0.1)
npm run version:patch

# Bump minor version (1.0.0 → 1.1.0)
npm run version:minor

# Bump major version (1.0.0 → 2.0.0)
npm run version:major

# Auto-detect version type from commit messages
npm run version:auto
```

### Full Release Process

```bash
# Create a complete release (bump, commit, push, tag)
npm run release:patch    # For bug fixes
npm run release:minor    # For new features
npm run release:major    # For breaking changes
npm run release:auto     # Auto-detect from commits
```

### What the Release Script Does

1. **Pre-flight Checks:**
   - Ensures working directory is clean
   - Verifies you're on the main branch
   - Checks for uncommitted changes

2. **Version Bumping:**
   - Updates `package.json` version
   - Updates `CHANGELOG.md` with new version entry
   - Creates git tag with version number

3. **Git Operations:**
   - Commits version changes
   - Pushes commits to remote
   - Pushes tags to remote

## Commit Message Convention

Use conventional commit messages to enable automatic version detection:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

**Examples:**
- `feat: add photo album system` → MINOR bump
- `fix: resolve photo deletion navigation issue` → PATCH bump
- `feat!: remove legacy role system` → MAJOR bump
- `BREAKING CHANGE: API endpoints changed` → MAJOR bump

## CHANGELOG.md

The changelog is automatically updated with each release:

```markdown
## [1.2.3] - 2024-01-15

### Added
- New photo album system
- Keyboard shortcuts for navigation

### Fixed
- Photo deletion navigation issue
- RLS policy errors

### Changed
- Updated permission system
```

## GitHub Actions

The project includes GitHub Actions for:
- **Release Automation**: Creates GitHub releases when tags are pushed
- **Testing**: Runs tests on every push
- **Building**: Ensures the project builds successfully

## Best Practices

### 1. **Commit Messages**
- Use clear, descriptive commit messages
- Follow conventional commit format
- Include breaking change indicators when needed

### 2. **Version Strategy**
- Start with `0.1.0` for initial development
- Use `1.0.0` for first stable release
- Bump major version for breaking changes
- Bump minor version for new features
- Bump patch version for bug fixes

### 3. **Release Process**
- Always test before releasing
- Update documentation
- Review CHANGELOG.md
- Tag releases properly

### 4. **Branch Strategy**
- Make releases from `main` branch
- Use feature branches for development
- Merge to main when ready for release

## Examples

### Scenario 1: Bug Fix
```bash
# Fix a bug
git commit -m "fix: resolve photo upload error"

# Create patch release
npm run release:patch
# Result: 1.0.0 → 1.0.1
```

### Scenario 2: New Feature
```bash
# Add new feature
git commit -m "feat: add slideshow functionality"

# Create minor release
npm run release:minor
# Result: 1.0.0 → 1.1.0
```

### Scenario 3: Breaking Change
```bash
# Make breaking change
git commit -m "feat!: remove legacy role system"

# Create major release
npm run release:major
# Result: 1.0.0 → 2.0.0
```

### Scenario 4: Auto-Detection
```bash
# Make various changes
git commit -m "feat: add photo editing"
git commit -m "fix: resolve navigation issue"
git commit -m "docs: update README"

# Auto-detect and release
npm run release:auto
# Result: Detects "feat:" → MINOR bump (1.0.0 → 1.1.0)
```

## Troubleshooting

### Common Issues

1. **"Working directory has uncommitted changes"**
   - Commit or stash your changes first
   - Use `git status` to see what's changed

2. **"Current branch is not main"**
   - Switch to main branch: `git checkout main`
   - Merge your changes to main first

3. **"Could not create git tag"**
   - Check if tag already exists
   - Ensure you have push permissions

4. **"Release failed"**
   - Check git status and branch
   - Resolve any conflicts
   - Try again after fixing issues

### Manual Recovery

If the release process fails, you can manually:

1. **Reset version:**
   ```bash
   git reset --hard HEAD~1
   git tag -d v1.0.0  # Remove local tag
   git push origin :refs/tags/v1.0.0  # Remove remote tag
   ```

2. **Retry release:**
   ```bash
   npm run release:patch
   ```

## Integration with CI/CD

The versioning system integrates with:
- **GitHub Actions**: Automatic releases
- **Git Tags**: Version tracking
- **CHANGELOG.md**: Release documentation
- **Package.json**: Version source of truth

This ensures consistent versioning across all environments and documentation.
