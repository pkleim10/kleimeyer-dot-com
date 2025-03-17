import { createBrowserClient } from '@supabase/ssr'

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function uploadImage(file, path) {
  try {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random()}.${fileExt}`
    const cleanPath = path.replace(/^\/+|\/+$/g, '')
    const cleanFileName = fileName.replace(/^\/+|\/+$/g, '')
    const filePath = cleanPath ? `${cleanPath}/${cleanFileName}` : cleanFileName

    console.log('Uploading file:', { fileName, filePath, fileSize: file.size })

    const { error: uploadError, data } = await supabase.storage
      .from('recipe-images')
      .upload(filePath, file)

    if (uploadError) {
      console.error('Upload error:', uploadError)
      throw new Error(`Upload failed: ${uploadError.message}`)
    }

    const { data: { publicUrl } } = supabase.storage
      .from('recipe-images')
      .getPublicUrl(filePath)

    console.log('Upload successful, public URL:', publicUrl)
    return publicUrl
  } catch (error) {
    console.error('Error in uploadImage:', error)
    throw error
  }
} 