/** @type {import('next').NextConfig} */
const nextConfig = {
  // Move serverComponentsExternalPackages to top level (Next.js 15)
  serverExternalPackages: ['@supabase/supabase-js'],
  // Increase body size limit for file uploads
  // Note: In Next.js 15, body size limits are handled in API routes via request/response config
  // The api.bodyParser config is no longer needed

  // Serve the standalone Lunar Lander HTML at a clean URL (outside site chrome).
  // Source lives in public/lunar-lander.html; evolve into a React route when needed.
  async rewrites() {
    return [
      { source: '/lunar-lander', destination: '/lunar-lander.html' },
      { source: '/lunar-lander/', destination: '/lunar-lander.html' },
    ]
  },
};

export default nextConfig;
