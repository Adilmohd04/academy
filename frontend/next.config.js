const path = require('path');

// Disable SSL verification for development
if (process.env.NODE_ENV === 'development') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Reduce logging noise
  logging: {
    fetches: {
      fullUrl: false,
    },
  },

  // Set workspace root to fix lockfile warning
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../'),
  },

  // Development optimizations
  ...(process.env.NODE_ENV === 'development' && {
    onDemandEntries: {
      maxInactiveAge: 25 * 1000,
      pagesBufferLength: 2,
    },
  }),

  // Disable caching in development to prevent chunk loading errors
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          },
        ],
      },
    ];
  },

  // Increase webpack timeout
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
