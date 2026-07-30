import '@testing-library/jest-dom'

// jsdom omits two web globals that both real browsers and the Node server
// runtime provide: crypto.subtle and TextEncoder/TextDecoder. Borrow Node's
// implementations so tests exercise the exact same code path that ships,
// rather than a second test-only implementation.
if (!globalThis.crypto?.subtle) {
  const { webcrypto } = require('node:crypto')
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true })
}
if (typeof globalThis.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('node:util')
  globalThis.TextEncoder = TextEncoder
  globalThis.TextDecoder = TextDecoder
}

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      refresh: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/'
  },
}))

// Mock Next.js Link component
jest.mock('next/link', () => {
  return function MockedLink({ children, href, ...props }) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    )
  }
})

// Mock Supabase client - moved to individual test files to avoid module resolution issues

// Mock FileReader
global.FileReader = class {
  constructor() {
    this.readAsDataURL = jest.fn(() => {
      this.onloadend && this.onloadend()
    })
    this.result = 'data:image/jpeg;base64,test-image-data'
  }
}

// Mock File constructor
global.File = class extends Blob {
  constructor(chunks, filename, options = {}) {
    super(chunks, options)
    this.name = filename
    this.lastModified = Date.now()
  }
}

// Suppress console errors during tests unless explicitly testing them
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
}) 