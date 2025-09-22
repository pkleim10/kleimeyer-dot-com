/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js']
  },
  // Increase body size limit for file uploads
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
  // Alternative approach for API routes
  serverRuntimeConfig: {
    maxFileSize: '10mb',
  },
};

export default nextConfig;
