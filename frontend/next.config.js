/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable output standalone to optimize for containerized deployment
  output: 'standalone',
  
  // Enable React Strict Mode for better development experience
  reactStrictMode: true,
  
  // Configure proper asset handling
  assetPrefix: process.env.NODE_ENV === 'production' ? '/' : '',
  
  // Set up image optimization
  images: {
    unoptimized: true, // For Cloud Run deployment
    formats: ['image/avif', 'image/webp'],
  },
  
  // Add trailing slash for consistent path handling
  trailingSlash: true,
  
  // Experimental features
  experimental: {
    serverActions: {
      allowedOrigins: ['*']
    }
  },
  
  // Add environment variables that should be accessible in the browser
  // IMPORTANT: Do not add sensitive data here
  env: {
    NEXT_PUBLIC_APP_NAME: 'ISU Digital Repository',
  },
  
  // Exclude specific paths from the build
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;