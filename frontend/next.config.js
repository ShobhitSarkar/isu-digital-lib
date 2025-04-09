/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  // Make sure we have the proper output settings
  output: 'standalone',
  // Ensure we're using the correct directory structure
  reactStrictMode: true,
};

module.exports = nextConfig;