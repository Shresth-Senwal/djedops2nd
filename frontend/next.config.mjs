/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',      // <--- REQUIRED for blockchain hosting
  images: {
    unoptimized: true,   // <--- REQUIRED (No Node.js image server)
  },
  eslint: {
    ignoreDuringBuilds: true,  // Skip ESLint checks during build
  },
  typescript: {
    ignoreBuildErrors: true,   // Skip TypeScript checks during build
  },
};

export default nextConfig;
