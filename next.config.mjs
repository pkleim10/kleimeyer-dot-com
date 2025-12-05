/** @type {import('next').NextConfig} */
const nextConfig = {
  // Move serverComponentsExternalPackages to top level (Next.js 15)
  serverExternalPackages: ['@supabase/supabase-js'],
  // Increase body size limit for file uploads
  // Note: In Next.js 15, body size limits are handled in API routes via request/response config
  // The api.bodyParser config is no longer needed
};

export default nextConfig;
