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
  }
};

module.exports = nextConfig;