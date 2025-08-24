/** @type {import('next').NextConfig} */
const nextConfig = {
  // Experimental features (if needed)
  experimental: {
    // Add experimental features here if needed
  },
  
  // Image optimization configuration
  images: {
    domains: ['localhost'],
    formats: ['image/avif', 'image/webp'],
  },
  
  // Environment variables
  env: {
    CUSTOM_KEY: 'custom-value',
  },
  
  // API configuration
  async rewrites() {
    return [
      // Proxy API requests to backend in development
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/api/:path*',
      },
    ];
  },
  
  // CORS headers for development
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  
  // Webpack configuration
  webpack: (config, { buildId, dev, isServer, defaultLoaders, nextRuntime, webpack }) => {
    // Custom webpack configuration can be added here
    return config;
  },
  
  // Production optimization
  swcMinify: true,
  
  // Additional configuration can be added here
  
  // Output configuration
  output: 'standalone', // For containerization
  
  // Disable x-powered-by header
  poweredByHeader: false,
  
  // Compression
  compress: true,
  
  // TypeScript configuration
  typescript: {
    // Ignore build errors during development (not recommended for production)
    ignoreBuildErrors: false,
  },
  
  // ESLint configuration
  eslint: {
    // Ignore ESLint errors during builds (not recommended for production)
    ignoreDuringBuilds: false,
  },
};

module.exports = nextConfig;
