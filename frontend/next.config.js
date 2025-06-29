/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['127.0.0.1'],
  },
  async rewrites() {
    // Use environment variable for API URL in production; fallback to localhost for local dev
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; " +
              "img-src 'self' data: blob:; " +
              "media-src 'self' data: blob:; " +
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; " +
              "style-src 'self' 'unsafe-inline' blob:; " +
              "connect-src 'self' http://127.0.0.1:8000 ws://localhost:*;",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig; 