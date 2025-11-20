import { createBrowserClient } from '@supabase/ssr'

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      storageKey: 'kleimeyer-auth-token',
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
)

export async function uploadImage(file, path) {
  try {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random()}.${fileExt}`
    const cleanPath = path ? path.replace(/^\/+|\/+$/g, '') : ''
    const cleanFileName = fileName.replace(/^\/+|\/+$/g, '')
    const filePath = cleanPath ? `${cleanPath}/${cleanFileName}` : cleanFileName

    // Determine storage bucket based on path
    const bucket = path?.includes('just-for-me') ? 'recipe-images' : 'recipe-images'

    console.log('Uploading file:', { fileName, filePath, fileSize: file.size, bucket })

    const { error: uploadError, data } = await supabase.storage
      .from(bucket)
      .upload(filePath, file)

    if (uploadError) {
      console.error('Upload error:', uploadError)
      throw new Error(`Upload failed: ${uploadError.message}`)
    }

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath)

    console.log('Upload successful, public URL:', publicUrl)
    return publicUrl
  } catch (error) {
    console.error('Error in uploadImage:', error)
    throw error
  }
} 