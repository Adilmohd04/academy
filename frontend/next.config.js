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

};

module.exports = nextConfig;
