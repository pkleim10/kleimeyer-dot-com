import { uploadImage } from '../supabase'

// Mock the supabase client
jest.mock('../supabase', () => {
  const mockStorage = {
    from: jest.fn(() => ({
      upload: jest.fn(),
      getPublicUrl: jest.fn()
    }))
  }

  return {
    supabase: {
      storage: mockStorage
    },
    uploadImage: jest.requireActual('../supabase').uploadImage
  }
})

// Import the mocked supabase after mocking
const { supabase } = require('../supabase')

describe('uploadImage utility function', () => {
  let mockFile
  let mockUpload
  let mockGetPublicUrl
  let consoleLogSpy
  let consoleErrorSpy

  beforeEach(() => {
    // Create a mock file object
    mockFile = {
      name: 'test-image.jpg',
      size: 1024
    }

    // Reset mocks
    jest.clearAllMocks()
    
    // Setup storage mocks
    mockUpload = jest.fn()
    mockGetPublicUrl = jest.fn()
    
    supabase.storage.from.mockReturnValue({
      upload: mockUpload,
      getPublicUrl: mockGetPublicUrl
    })

    // Spy on console methods
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation()
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

    // Mock Math.random to make tests deterministic
    jest.spyOn(Math, 'random').mockReturnValue(0.12345)
  })

  afterEach(() => {
    // Restore console methods
    consoleLogSpy.mockRestore()
    consoleErrorSpy.mockRestore()
    Math.random.mockRestore()
  })

  describe('Successful upload scenarios', () => {
    it('uploads file successfully with path', async () => {
      const mockPublicUrl = 'https://example.com/storage/categories/0.12345.jpg'
      
      mockUpload.mockResolvedValue({ data: { path: 'categories/0.12345.jpg' }, error: null })
      mockGetPublicUrl.mockReturnValue({ data: { publicUrl: mockPublicUrl } })

      const result = await uploadImage(mockFile, 'categories')

      expect(supabase.storage.from).toHaveBeenCalledWith('recipe-images')
      expect(mockUpload).toHaveBeenCalledWith('categories/0.12345.jpg', mockFile)
      expect(mockGetPublicUrl).toHaveBeenCalledWith('categories/0.12345.jpg')
      expect(result).toBe(mockPublicUrl)
      
      expect(consoleLogSpy).toHaveBeenCalledWith('Uploading file:', {
        fileName: '0.12345.jpg',
        filePath: 'categories/0.12345.jpg',
        fileSize: 1024
      })
      expect(consoleLogSpy).toHaveBeenCalledWith('Upload successful, public URL:', mockPublicUrl)
    })

    it('uploads file successfully without path', async () => {
      const mockPublicUrl = 'https://example.com/storage/0.12345.jpg'
      
      mockUpload.mockResolvedValue({ data: { path: '0.12345.jpg' }, error: null })
      mockGetPublicUrl.mockReturnValue({ data: { publicUrl: mockPublicUrl } })

      const result = await uploadImage(mockFile, '')

      expect(mockUpload).toHaveBeenCalledWith('0.12345.jpg', mockFile)
      expect(mockGetPublicUrl).toHaveBeenCalledWith('0.12345.jpg')
      expect(result).toBe(mockPublicUrl)
    })

    it('handles file with different extension', async () => {
      const pngFile = { name: 'image.png', size: 2048 }
      const mockPublicUrl = 'https://example.com/storage/uploads/0.12345.png'
      
      mockUpload.mockResolvedValue({ data: { path: 'uploads/0.12345.png' }, error: null })
      mockGetPublicUrl.mockReturnValue({ data: { publicUrl: mockPublicUrl } })

      const result = await uploadImage(pngFile, 'uploads')

      expect(mockUpload).toHaveBeenCalledWith('uploads/0.12345.png', pngFile)
      expect(result).toBe(mockPublicUrl)
    })

    it('handles file without extension', async () => {
      const fileWithoutExt = { name: 'imagefile', size: 512 }
      const mockPublicUrl = 'https://example.com/storage/0.12345.imagefile'
      
      mockUpload.mockResolvedValue({ data: { path: '0.12345.imagefile' }, error: null })
      mockGetPublicUrl.mockReturnValue({ data: { publicUrl: mockPublicUrl } })

      const result = await uploadImage(fileWithoutExt, '')

      expect(mockUpload).toHaveBeenCalledWith('0.12345.imagefile', fileWithoutExt)
      expect(result).toBe(mockPublicUrl)
    })
  })

  describe('Path cleaning functionality', () => {
    it('cleans leading and trailing slashes from path', async () => {
      const mockPublicUrl = 'https://example.com/storage/clean-path/0.12345.jpg'
      
      mockUpload.mockResolvedValue({ data: { path: 'clean-path/0.12345.jpg' }, error: null })
      mockGetPublicUrl.mockReturnValue({ data: { publicUrl: mockPublicUrl } })

      await uploadImage(mockFile, '/clean-path/')

      expect(mockUpload).toHaveBeenCalledWith('clean-path/0.12345.jpg', mockFile)
    })

    it('cleans multiple leading and trailing slashes', async () => {
      const mockPublicUrl = 'https://example.com/storage/multi-slash/0.12345.jpg'
      
      mockUpload.mockResolvedValue({ data: { path: 'multi-slash/0.12345.jpg' }, error: null })
      mockGetPublicUrl.mockReturnValue({ data: { publicUrl: mockPublicUrl } })

      await uploadImage(mockFile, '///multi-slash///')

      expect(mockUpload).toHaveBeenCalledWith('multi-slash/0.12345.jpg', mockFile)
    })
  })

  describe('Error handling scenarios', () => {
    it('handles upload error from Supabase', async () => {
      const uploadError = { message: 'Storage quota exceeded' }
      mockUpload.mockResolvedValue({ data: null, error: uploadError })

      await expect(uploadImage(mockFile, 'test')).rejects.toThrow('Upload failed: Storage quota exceeded')
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Upload error:', uploadError)
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error in uploadImage:', expect.any(Error))
    })

    it('handles network error during upload', async () => {
      const networkError = new Error('Network connection failed')
      mockUpload.mockRejectedValue(networkError)

      await expect(uploadImage(mockFile, 'test')).rejects.toThrow('Network connection failed')
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error in uploadImage:', networkError)
    })

    it('handles unexpected error structure', async () => {
      mockUpload.mockResolvedValue({ data: null, error: { code: 'UNKNOWN_ERROR' } })

      await expect(uploadImage(mockFile, 'test')).rejects.toThrow('Upload failed: undefined')
    })
  })

  describe('File name generation', () => {
    it('generates unique file names for multiple calls', async () => {
      const mockPublicUrl = 'https://example.com/storage/test.jpg'
      
      mockUpload.mockResolvedValue({ data: { path: 'test.jpg' }, error: null })
      mockGetPublicUrl.mockReturnValue({ data: { publicUrl: mockPublicUrl } })

      // First call
      Math.random.mockReturnValueOnce(0.11111)
      await uploadImage(mockFile, '')
      expect(mockUpload).toHaveBeenCalledWith('0.11111.jpg', mockFile)

      // Second call
      Math.random.mockReturnValueOnce(0.99999)
      await uploadImage(mockFile, '')
      expect(mockUpload).toHaveBeenCalledWith('0.99999.jpg', mockFile)
    })

    it('preserves original file extension case', async () => {
      const fileWithUpperExt = { name: 'image.PNG', size: 1024 }
      const mockPublicUrl = 'https://example.com/storage/0.12345.PNG'
      
      mockUpload.mockResolvedValue({ data: { path: '0.12345.PNG' }, error: null })
      mockGetPublicUrl.mockReturnValue({ data: { publicUrl: mockPublicUrl } })

      await uploadImage(fileWithUpperExt, '')

      expect(mockUpload).toHaveBeenCalledWith('0.12345.PNG', fileWithUpperExt)
    })
  })

  describe('Console logging', () => {
    it('logs upload start with correct file info', async () => {
      mockUpload.mockResolvedValue({ data: { path: 'test.jpg' }, error: null })
      mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://example.com/test.jpg' } })

      await uploadImage(mockFile, 'uploads')

      expect(consoleLogSpy).toHaveBeenCalledWith('Uploading file:', {
        fileName: '0.12345.jpg',
        filePath: 'uploads/0.12345.jpg',
        fileSize: 1024
      })
    })

    it('logs successful upload with public URL', async () => {
      const mockPublicUrl = 'https://example.com/storage/success.jpg'
      
      mockUpload.mockResolvedValue({ data: { path: 'success.jpg' }, error: null })
      mockGetPublicUrl.mockReturnValue({ data: { publicUrl: mockPublicUrl } })

      await uploadImage(mockFile, '')

      expect(consoleLogSpy).toHaveBeenCalledWith('Upload successful, public URL:', mockPublicUrl)
    })

    it('logs error information on failure', async () => {
      const uploadError = { message: 'File too large' }
      mockUpload.mockResolvedValue({ data: null, error: uploadError })

      try {
        await uploadImage(mockFile, 'test')
      } catch (error) {
        // Expected to throw
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith('Upload error:', uploadError)
    })
  })

  describe('Edge cases', () => {
    it('handles file with multiple dots in name', async () => {
      const complexFile = { name: 'my.complex.file.name.jpeg', size: 1024 }
      const mockPublicUrl = 'https://example.com/storage/0.12345.jpeg'
      
      mockUpload.mockResolvedValue({ data: { path: '0.12345.jpeg' }, error: null })
      mockGetPublicUrl.mockReturnValue({ data: { publicUrl: mockPublicUrl } })

      await uploadImage(complexFile, '')

      expect(mockUpload).toHaveBeenCalledWith('0.12345.jpeg', complexFile)
    })

    it('handles empty path correctly', async () => {
      const mockPublicUrl = 'https://example.com/storage/0.12345.jpg'
      
      mockUpload.mockResolvedValue({ data: { path: '0.12345.jpg' }, error: null })
      mockGetPublicUrl.mockReturnValue({ data: { publicUrl: mockPublicUrl } })

      await uploadImage(mockFile, null)

      expect(mockUpload).toHaveBeenCalledWith('0.12345.jpg', mockFile)
    })

    it('handles undefined path', async () => {
      const mockPublicUrl = 'https://example.com/storage/0.12345.jpg'
      
      mockUpload.mockResolvedValue({ data: { path: '0.12345.jpg' }, error: null })
      mockGetPublicUrl.mockReturnValue({ data: { publicUrl: mockPublicUrl } })

      await uploadImage(mockFile, undefined)

      expect(mockUpload).toHaveBeenCalledWith('0.12345.jpg', mockFile)
    })
  })
}) 