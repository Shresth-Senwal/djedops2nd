/** @type {import('next').NextConfig} */
const nextConfig = {
  // Removed 'output: export' to enable API routes on Vercel
  // API routes require server-side rendering (default mode)
  images: {
    unoptimized: true,   // Keep for compatibility
  },
  eslint: {
    ignoreDuringBuilds: true,  // Skip ESLint checks during build
  },
  typescript: {
    ignoreBuildErrors: true,   // Skip TypeScript checks during build
  },
};

export default nextConfig;
