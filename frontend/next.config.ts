import type { NextConfig } from "next";
import path from "path";

// Disable SSL verification for development
if (process.env.NODE_ENV === 'development') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const nextConfig: NextConfig = {
  // Set workspace root to fix lockfile warning
  outputFileTracingRoot: path.join(__dirname, '../'),
  
  // Reduce logging noise
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
  
  // Suppress experimental warnings in development
  experimental: {
    ...(process.env.NODE_ENV === 'development' && {
      // This helps reduce console noise from Clerk's internal headers usage
      serverComponentsExternalPackages: ['@clerk/nextjs'],
    }),
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

export default nextConfig;
