const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    // Handle module aliases (this will be automatically configured for you based on your tsconfig.json paths)
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testEnvironment: 'jest-environment-jsdom',
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/**/*.d.ts',
    '!src/app/**/page.jsx', // Exclude Next.js pages
    '!src/app/**/layout.jsx', // Exclude Next.js layouts
    '!src/app/**/loading.jsx', // Exclude Next.js loading components
    '!src/app/**/error.jsx', // Exclude Next.js error components
    '!src/app/**/not-found.jsx', // Exclude Next.js not-found components
    '!src/app/**/template.jsx', // Exclude Next.js templates
    '!src/app/**/default.jsx', // Exclude Next.js default exports
    'src/app/api/**/*.js', // Include API routes for coverage
    '!src/middleware.js',
  ],
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig) 