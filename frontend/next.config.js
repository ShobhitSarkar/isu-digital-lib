/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  // Make sure we have the proper output settings
  output: 'standalone',
  // Ensure we're using the correct directory structure
  reactStrictMode: true,
  // Experimental features
  experimental: {
    // The correct way to enable server actions (as an object with a property)
    serverActions: {
      allowedOrigins: ['*']
    }
  },
  // Add these new lines for proper asset handling
  assetPrefix: process.env.NODE_ENV === 'production' ? '/' : '',
  basePath: '',
  images: {
    unoptimized: true, // This can help with image loading in standalone mode
  },
  trailingSlash: true, // This helps with path resolution
};

module.exports = nextConfig;