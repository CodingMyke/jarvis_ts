import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ottimizzazioni per performance e bundle size
  compress: true,
  
  // Ottimizza le immagini
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  
  // Ottimizzazioni del bundle
  experimental: {
    optimizePackageImports: ['react-markdown', 'remark-gfm'],
  },
  
  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  // Headers per caching e performance
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
        ],
      },
    ];
  },
};

export default nextConfig;
